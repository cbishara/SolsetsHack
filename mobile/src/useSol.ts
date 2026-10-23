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
  loadLocal,
  loadPending,
  saveConnection,
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
  const [loaded, setLoaded] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const inFlight = useRef(false);
  const connectionRef = useRef<Connection | null>(null);

  async function refresh(target = connectionRef.current) {
    if (!target) return;
    try {
      const value = await createPilotClient(target).load();
      if (
        connectionRef.current?.url !== target.url ||
        connectionRef.current.password !== target.password
      )
        return;
      setRemote(value);
      setSyncedAt(new Date().toISOString());
      setError("");
    } catch (e) {
      setError((e as Error).message || "No se pudo conectar con SOL.");
    }
  }
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [saved, access, turn] = await Promise.all([
          loadLocal(),
          loadConnection(),
          loadPending(),
        ]);
        if (!mounted) return;
        const valid = access ? validateConnection(access, __DEV__) : null;
        setLocal(saved);
        setConnection(valid);
        connectionRef.current = valid;
        setPending(turn);
        setLoaded(true);
        if (valid) await refresh(valid);
      } catch (e) {
        if (mounted) {
          setError((e as Error).message);
          setLoaded(true);
        }
      }
    })();
    const sub = AppState.addEventListener("change", (value) => {
      if (value === "active" && !inFlight.current) void refresh();
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  async function run(operation: () => Promise<void>) {
    if (inFlight.current) return false;
    inFlight.current = true;
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
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 2000) {
      setError("Escribe entre 1 y 2.000 caracteres.");
      return false;
    }
    return run(async () => {
      if (!connection) {
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
    loaded,
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
