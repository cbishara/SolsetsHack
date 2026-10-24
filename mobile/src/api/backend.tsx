import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { nightKey } from '../data/select';
import { useStore } from '../data/store';
import { itemsFrom, mergeSources, serverMessageId, tasksFromItems, toChats } from './map';
import { createServerClient, ServerError, type ServerClient, type ServerMetrics } from './server';

// Bridge between the app's store and server/. When connected, what the server
// classified becomes inbox items (with the original message), tonight's alerts,
// shadow mode, sources and WhatsApp chats come from it, and what the person
// marks goes back. What server/ does not have yet (categories, tasks, calendar,
// memory) works locally and moves there route by route (CONTRATO_APP_V2.md).

export type BackendStatus = 'demo' | 'connecting' | 'connected' | 'error';

type Backend = {
  status: BackendStatus;
  error: string | null;
  url: string;
  lastSync: string | null;
  metrics: ServerMetrics | null;
  whatsappLive: boolean;
  connect: (url?: string, token?: string) => Promise<boolean>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  /** Chat with Sol through server/. Returns null when the agent is not connected yet. */
  chat: (text: string) => Promise<string | null>;
  /** Saves dumped to-dos as worries on the server (contract v0 "descarga"). */
  saveWorries: (texts: string[]) => void;
  /** Sends a recording to server/ for transcription. Null while the server has no transcription. */
  transcribe: (uri: string, mime: string) => Promise<string | null>;
  simulateNight: () => Promise<void>;
  sendTestMessage: (text: string) => Promise<void>;
};

const KEY = 'sol:backend:v1';
const BackendContext = createContext<Backend | null>(null);

/** In development the app reaches server/ through Metro's /api proxy (metro.config.js). */
export function defaultServerUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : 'http://localhost:8081';
}

export function BackendProvider({ children }: { children: ReactNode }) {
  const { state, dispatch, ready } = useStore();
  const [status, setStatus] = useState<BackendStatus>('demo');
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(defaultServerUrl());
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [whatsappLive, setWhatsappLive] = useState(false);
  const client = useRef<ServerClient | null>(null);
  const waChecked = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // What was last synced from the server, so local changes can be told apart.
  const synced = useRef({ feedback: {} as Record<string, string>, onCall: null as boolean | null, mode: '' as string, chats: {} as Record<string, boolean> });
  const tonightKey = () => nightKey(stateRef.current.nightAlerts);
  const overrideOn = (st: typeof state) => (st.nightAlerts.override?.date === nightKey(st.nightAlerts) ? st.nightAlerts.override.on : null);

  const pull = useCallback(async () => {
    const c = client.current;
    if (!c) return;
    const [night, settings, feed, sources, m] = await Promise.all([c.night(), c.settings(), c.feed(), c.sources(), c.metrics()]);
    const s = stateRef.current;
    // Keep what the person already did with an item (read, recategorized, rated).
    const known = new Map(s.items.map((i) => [i.id, i]));
    const items = itemsFrom(feed, s.categories).map((i) => {
      const k = known.get(i.id);
      return k ? { ...i, read: k.read, categoryId: k.categoryId, review: k.review, feedback: k.feedback, outcome: k.outcome } : i;
    });
    // The inbox follows the server only when the person chose its data (Perfil > Datos de la app).
    if (s.dataSource === 'server') {
      if (items.length) dispatch({ type: 'upsertItems', items });
      const newTasks = tasksFromItems(items, s.tasks);
      if (newTasks.length) dispatch({ type: 'addTasks', tasks: newTasks });
    }
    dispatch({ type: 'setConnections', connections: mergeSources(s.connections, sources) });
    const local = overrideOn(s);
    if (night.onCall !== null && night.onCall !== local) dispatch({ type: 'setNightAlerts', patch: { override: { date: tonightKey(), on: night.onCall } } });
    if (settings.mode !== s.profile.agentMode) dispatch({ type: 'setProfile', patch: { agentMode: settings.mode } });
    synced.current.onCall = night.onCall ?? local;
    synced.current.mode = settings.mode;
    setMetrics(m);
    if (waChecked.current) { setLastSync(new Date().toISOString()); return; }
    waChecked.current = true; // once per connection: without Unipile it is a known 503
    try {
      const wa = await c.whatsappStatus();
      setWhatsappLive(wa.configured);
      if (wa.configured) {
        const page = await c.whatsappChats();
        const chats = toChats(page.items);
        dispatch({ type: 'setChats', chats });
        synced.current.chats = Object.fromEntries(chats.map((x) => [x.id, x.on]));
      }
    } catch {
      setWhatsappLive(false); // Unipile not configured on this server: chats stay local
    }
    setLastSync(new Date().toISOString());
  }, [dispatch]);

  const connect = useCallback(async (nextUrl = url, token?: string) => {
    setStatus('connecting');
    setError(null);
    const c = createServerClient({ url: nextUrl, token });
    waChecked.current = false;
    try {
      await c.health();
      client.current = c;
      setUrl(nextUrl);
      await pull();
      setStatus('connected');
      await AsyncStorage.setItem(KEY, JSON.stringify({ url: nextUrl, on: true })).catch(() => {});
      return true;
    } catch (e) {
      client.current = null;
      setStatus('error');
      setError(e instanceof ServerError ? e.message : 'No pude conectarme con el servidor.');
      return false;
    }
  }, [pull, url]);

  const disconnect = useCallback(() => {
    client.current = null;
    setStatus('demo');
    setError(null);
    AsyncStorage.setItem(KEY, JSON.stringify({ url, on: false })).catch(() => {});
  }, [dispatch, url]);

  // Reconnect on launch if it was connected, or try the dev server once.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as { url: string; on: boolean }) : null;
        if (saved?.on === false) return;
        void connect(saved?.url ?? defaultServerUrl());
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Keep it fresh while connected.
  useEffect(() => {
    if (status !== 'connected') return;
    const t = setInterval(() => {
      pull().catch((e) => {
        setStatus('error');
        setError(e instanceof ServerError ? e.message : 'Perdí la conexión con el servidor.');
      });
    }, 20_000);
    return () => clearInterval(t);
  }, [status, pull]);

  // Push what the person marks: feedback, tonight's answer, shadow mode, watched chats.
  useEffect(() => {
    const c = client.current;
    if (status !== 'connected' || !c) return;
    for (const item of state.items) {
      if (!item.remote || !item.feedback || synced.current.feedback[item.id] === item.feedback) continue;
      synced.current.feedback[item.id] = item.feedback;
      c.feedback(serverMessageId(item.id), item.feedback).catch(() => {});
    }
    const on = overrideOn(state);
    if (on !== null && on !== synced.current.onCall) {
      synced.current.onCall = on;
      c.setNight(on).catch(() => {});
    }
    if (state.profile.agentMode !== synced.current.mode) {
      synced.current.mode = state.profile.agentMode;
      c.setSettings({ mode: state.profile.agentMode }).catch(() => {});
    }
    if (whatsappLive) {
      for (const chat of state.chats) {
        if (synced.current.chats[chat.id] === undefined || synced.current.chats[chat.id] === chat.on) continue;
        synced.current.chats[chat.id] = chat.on;
        c.selectChat(chat.id, chat.on).catch(() => {});
      }
    }
  }, [status, whatsappLive, state.items, state.nightAlerts, state.profile.agentMode, state.chats]);

  const chat = useCallback(async (text: string) => {
    const c = client.current;
    if (!c) return null;
    try {
      return (await c.chat(text)).reply;
    } catch (e) {
      if (e instanceof ServerError && (e.status === 503 || e.status === 404)) return null; // agent not connected to server/ yet
      throw e;
    }
  }, []);

  const saveWorries = useCallback((texts: string[]) => {
    const c = client.current;
    if (!c) return;
    texts.forEach((t) => c.worry(t).catch(() => {}));
  }, []);

  const transcribe = useCallback(async (uri: string, mime: string) => {
    const c = client.current;
    if (!c) return null;
    try {
      return (await c.transcribe(uri, mime)).text;
    } catch (e) {
      if (e instanceof ServerError && (e.status === 503 || e.status === 404 || e.status === 501)) return null; // no transcription on server/ yet
      throw e;
    }
  }, []);

  const simulateNight = useCallback(async () => {
    if (!client.current) return;
    await client.current.simulateNight();
    await pull();
  }, [pull]);

  const sendTestMessage = useCallback(async (text: string) => {
    if (!client.current) return;
    await client.current.message(text, 'Consola de la app', 'Prueba desde la app');
    await pull();
  }, [pull]);

  const refresh = useCallback(async () => {
    try {
      await pull();
    } catch (e) {
      setStatus('error');
      setError(e instanceof ServerError ? e.message : 'Perdí la conexión con el servidor.');
    }
  }, [pull]);

  const value = useMemo<Backend>(
    () => ({ status, error, url, lastSync, metrics, whatsappLive, connect, disconnect, refresh, chat, saveWorries, transcribe, simulateNight, sendTestMessage }),
    [status, error, url, lastSync, metrics, whatsappLive, connect, disconnect, refresh, chat, saveWorries, transcribe, simulateNight, sendTestMessage],
  );
  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend() {
  const v = useContext(BackendContext);
  if (!v) throw new Error('useBackend must be used inside BackendProvider');
  return v;
}
