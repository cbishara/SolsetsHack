import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Crypto from "expo-crypto";
import {
  createPilotClient,
  validateConnection,
  type Connection,
  type PendingTurn,
  type PilotStatus,
} from "./api";
import { demoReply, emptySession, type LocalState } from "./model";
import {
  loadConnection,
  loadDraft,
  loadLocal,
  loadPending,
  saveConnection,
  saveDraft,
  saveLocal,
  savePending,
} from "./storage";

export function useSol() {
  const [local, setLocal] = useState<LocalState | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [remote, setRemote] = useState<PilotStatus | null>(null);
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraftValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const inFlight = useRef(false);
  const connectionRef = useRef<Connection | null>(null);
  const refreshRevision = useRef(0);
  const draftRef = useRef("");
  const draftHydrated = useRef(false);
  const storageReady = useRef(false);
  const mounted = useRef(false);
  const hydrating = useRef(false);
  const hydrationRevision = useRef(0);

  function setDraft(value: string) {
    draftRef.current = value;
    setDraftValue(value);
  }

  async function refresh(target = connectionRef.current) {
    if (!target || inFlight.current) return;
    const revision = ++refreshRevision.current;
    const isCurrent = () =>
      refreshRevision.current === revision &&
      connectionRef.current?.url === target.url &&
      connectionRef.current.password === target.password;
    setRefreshing(true);
    try {
      const value = await createPilotClient(target).load();
      if (!isCurrent()) return;
      setRemote(value);
      setSyncedAt(new Date().toISOString());
      setError("");
    } catch (e) {
      if (isCurrent())
        setError((e as Error).message || "No se pudo conectar con SOL.");
    } finally {
      if (isCurrent()) setRefreshing(false);
    }
  }
  async function hydrateStorage() {
    const revision = ++hydrationRevision.current;
    const isCurrent = () => mounted.current && hydrationRevision.current === revision;
    hydrating.current = true;
    storageReady.current = false;
    draftHydrated.current = false;
    refreshRevision.current++;
    setRefreshing(false);
    setLoaded(false);
    setError("");
    try {
      const [saved, access, turn, savedDraft] = await Promise.all([
        loadLocal(),
        loadConnection(),
        loadPending(),
        loadDraft(),
      ]);
      if (!isCurrent()) return false;
      const valid = access ? validateConnection(access, __DEV__) : null;
      setLocal(saved);
      setConnection(valid);
      connectionRef.current = valid;
      setRemote(null);
      setSyncedAt(null);
      setPending(turn);
      setDraft(savedDraft);
      draftHydrated.current = true;
      storageReady.current = true;
      setLoaded(true);
      if (valid) await refresh(valid);
      return true;
    } catch (e) {
      if (isCurrent()) {
        setError((e as Error).message || "No se pudieron leer los datos de este dispositivo.");
        setLoaded(true);
      }
      return false;
    } finally {
      if (isCurrent()) hydrating.current = false;
    }
  }

  async function retryStorage() {
    if (inFlight.current || hydrating.current || storageReady.current) return false;
    return hydrateStorage();
  }

  useEffect(() => {
    mounted.current = true;
    void hydrateStorage();
    const sub = AppState.addEventListener("change", (value) => {
      if (value === "active" && storageReady.current && !inFlight.current) void refresh();
      if (value !== "active" && draftHydrated.current)
        void saveDraft(draftRef.current).catch(() => {
          if (mounted.current) setError("No se pudo guardar el borrador en este dispositivo.");
        });
    });
    return () => {
      mounted.current = false;
      hydrationRevision.current++;
      refreshRevision.current++;
      if (draftHydrated.current) void saveDraft(draftRef.current).catch(() => {});
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated.current) return;
    const timer = setTimeout(() => {
      void saveDraft(draftRef.current).catch(() =>
        setError("No se pudo guardar el borrador. El texto sigue disponible en pantalla."),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, loaded]);

  async function run(operation: () => Promise<void>) {
    if (inFlight.current) return false;
    inFlight.current = true;
    // Any GET started before this mutation must not replace its newer result.
    refreshRevision.current++;
    setRefreshing(false);
    setBusy(true);
    setError("");
    try {
      await operation();
      return true;
    } catch (e) {
      setError(
        (e as Error).message ||
          "No se pudo guardar. Tus datos anteriores siguen disponibles.",
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const update = (change: (state: LocalState) => LocalState) =>
    run(async () => {
      if (!local) throw new Error("La demo local todavía no está disponible.");
      const next = change(local);
      await saveLocal(next);
      setLocal(next);
    });

  async function connect(input: Connection) {
    return run(async () => {
      const target = validateConnection(input, __DEV__);
      if (pending && pending.url !== target.url)
        throw new Error(
          "Hay un mensaje pendiente en otra conexión. Revísalo antes de cambiar de servidor.",
        );
      const value = await createPilotClient(target).load();
      await saveConnection(target);
      connectionRef.current = target;
      setConnection(target);
      setRemote(value);
      setSyncedAt(new Date().toISOString());
    });
  }
  async function disconnect() {
    return run(async () => {
      if (pending)
        throw new Error(
          "Revisa o descarta el mensaje pendiente antes de desconectar.",
        );
      await saveConnection(null);
      connectionRef.current = null;
      setConnection(null);
      setRemote(null);
      setSyncedAt(null);
    });
  }
  async function send(text: string) {
    if (!storageReady.current) {
      setError("No se pudo recuperar el estado guardado. No se enviará otro mensaje hasta recuperar los datos del dispositivo.");
      return false;
    }
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 2000) {
      setError("Escribe entre 1 y 2.000 caracteres.");
      return false;
    }
    return run(async () => {
      if (!connection) {
        if (pending)
          throw new Error(
            "Hay un envío real pendiente. Vuelve a conectar con su servidor o descártalo antes de usar la demo local.",
          );
        if (!local) throw new Error("La demo todavía no está lista.");
        const next = {
          ...local,
          session: demoReply(local.session, trimmed, Crypto.randomUUID()),
        };
        await saveLocal(next);
        setLocal(next);
        return;
      }
      if (pending && pending.text !== trimmed)
        throw new Error(
          "Primero reintenta o descarta el envío pendiente. Su resultado todavía no está confirmado.",
        );
      const turn = pending || {
        text: trimmed,
        requestId: Crypto.randomUUID(),
        url: connection.url,
      };
      await savePending(turn);
      setPending(turn);
      const session = await createPilotClient(connection).send(turn);
      // Persist completion before accepting a different message. A retry uses the same UUID.
      await savePending(null);
      setPending(null);
      setRemote((previous) => ({ ...previous, sessions: [session] }));
      setSyncedAt(new Date().toISOString());
    });
  }
  const discardPending = () =>
    run(async () => {
      await savePending(null);
      setPending(null);
    });
  return {
    local,
    connection,
    remote,
    pending,
    error,
    busy,
    refreshing,
    draft,
    setDraft,
    loaded,
    storageReady: storageReady.current,
    retryStorage,
    syncedAt,
    refresh,
    update,
    connect,
    disconnect,
    send,
    discardPending,
    session: connection
      ? remote?.sessions[0] || { ...emptySession(), id: "demo:web" }
      : local?.session || emptySession(),
  };
}
