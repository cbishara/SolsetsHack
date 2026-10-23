import { Base64 } from "js-base64";
import type { Session } from "./model";

export type Connection = { url: string; password: string };
export type PendingTurn = { text: string; requestId: string; url: string };
export type PilotStatus = {
  sessions: Session[];
  agent?: { engine: string; configured: boolean; model?: string | null };
  connection?: { chatUrl?: string | null };
};

export function validateConnection(
  input: Connection,
  development = false,
): Connection {
  if (typeof input?.url !== "string" || typeof input.password !== "string")
    throw new Error("El acceso guardado no es válido. Vuelve a conectar en Ajustes.");
  let url: URL;
  try {
    url = new URL(input.url.trim());
  } catch {
    throw new Error("Escribe la URL completa del backend de testing.");
  }
  const local =
    /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      url.hostname,
    );
  if (
    url.protocol !== "https:" &&
    !(development && local && url.protocol === "http:" && !input.password)
  )
    throw new Error(
      "Usa HTTPS. HTTP solo se permite en desarrollo local sin contraseña.",
    );
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "Usa solo el origen, por ejemplo https://sol-testing.example.com, sin rutas ni credenciales.",
    );
  return { url: url.origin, password: input.password };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const optionalString = (value: unknown) =>
  value === undefined || typeof value === "string";
const validMinutes = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

// A pending request is persisted before sending. Never invent a replacement UUID
// when that record cannot be recovered: the server may already have processed it.
export function restorePending(raw: string | null): PendingTurn | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("No se pudo recuperar el envío pendiente. No se ha reenviado ni borrado.");
  }
  if (
    !isRecord(value) ||
    typeof value.text !== "string" || !value.text.trim() || value.text.length > 2000 ||
    typeof value.url !== "string" ||
    typeof value.requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)
  ) throw new Error("El envío pendiente no tiene el formato esperado. No se ha reenviado ni borrado.");
  return { text: value.text, requestId: value.requestId, url: value.url };
}

function assertSession(value: unknown): asserts value is Session {
  const item = isRecord(value) ? value : undefined;
  if (
    item?.id !== "demo:web" ||
    !Array.isArray(item.messages) ||
    item.messages.some(
      (message) =>
        !isRecord(message) ||
        typeof message.id !== "string" ||
        typeof message.text !== "string" ||
        (message.role !== "user" && message.role !== "assistant") ||
        (message.inference !== undefined && (
          !isRecord(message.inference) ||
          typeof message.inference.engine !== "string" ||
          (message.inference.model !== null && !optionalString(message.inference.model)) ||
          !optionalString(message.inference.error)
        )),
    ) ||
    !optionalString(item.concern) ||
    (item.memory !== undefined && (
      !Array.isArray(item.memory) || item.memory.some((memory) =>
        !isRecord(memory) || typeof memory.key !== "string" ||
        typeof memory.value !== "string" || !optionalString(memory.evidence)
      )
    )) ||
    (item.plan != null && (
      !isRecord(item.plan) || typeof item.plan.title !== "string" ||
      typeof item.plan.nextStep !== "string" || !optionalString(item.plan.prepared) ||
      (item.plan.minutes !== undefined && !validMinutes(item.plan.minutes))
    )) ||
    (item.preference != null && (
      !isRecord(item.preference) || !validMinutes(item.preference.minutes)
    ))
  ) {
    throw new Error(
      "La API no devolvió la conversación de prueba esperada. No se guardó una respuesta ficticia.",
    );
  }
}

function readMetadata(value: Record<string, unknown>): Pick<PilotStatus, "agent" | "connection"> {
  const metadata: Pick<PilotStatus, "agent" | "connection"> = {};
  if (value.agent !== undefined) {
    const agent = value.agent;
    if (
      !isRecord(agent) ||
      (agent.engine !== "hermes" && agent.engine !== "demo") ||
      typeof agent.configured !== "boolean" ||
      (agent.model !== null && !optionalString(agent.model))
    ) throw new Error("La API devolvió un estado del agente incompatible. No se confirmó la conexión.");
    metadata.agent = {
      engine: agent.engine,
      configured: agent.configured,
      ...(agent.model !== undefined ? { model: agent.model as string | null } : {}),
    };
  }
  if (value.connection !== undefined) {
    const connection = value.connection;
    if (!isRecord(connection) || (connection.chatUrl !== null && !optionalString(connection.chatUrl)))
      throw new Error("La API devolvió una conexión de WhatsApp incompatible.");
    if (typeof connection.chatUrl === "string") {
      let url: URL;
      try { url = new URL(connection.chatUrl); }
      catch { throw new Error("La API devolvió un enlace de WhatsApp inválido."); }
      if (url.protocol !== "https:" || url.hostname !== "wa.me" || url.username || url.password || url.port)
        throw new Error("La API devolvió un enlace de WhatsApp inválido.");
    }
    metadata.connection = connection.chatUrl === undefined ? {} : { chatUrl: connection.chatUrl as string | null };
  }
  return metadata;
}

export function createPilotClient(
  connection: Connection,
  fetcher: typeof fetch = fetch,
) {
  async function request(path: string, body?: unknown) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 80000);
    try {
      const response = await fetcher(connection.url + path, {
        method: body ? "POST" : "GET",
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(connection.password
            ? {
                Authorization:
                  "Basic " + Base64.encode("solsets:" + connection.password),
              }
            : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
        // Do not forward credentials to a different origin after a redirect.
        redirect: "error",
      });
      if (response.status === 401)
        throw new Error(
          "El acceso del equipo no es válido. Revisa la contraseña en Ajustes.",
        );
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "Esa dirección no sirve la API de SOL. Comprueba la URL de testing.",
        );
      const value = await response.json();
      if (!response.ok)
        throw new Error(
          isRecord(value) && typeof value.error === "string"
            ? value.error
            : `El servidor respondió ${response.status}.`,
        );
      return value;
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error(
          "La respuesta tardó demasiado. El resultado puede haberse guardado: reintenta el mismo mensaje.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    async load(): Promise<PilotStatus> {
      const value = await request("/api/disconnect");
      if (!isRecord(value) || !Array.isArray(value.sessions))
        throw new Error(
          "La API no es compatible con el piloto de conversación.",
        );
      const session = value.sessions.find(
        (item: unknown) => isRecord(item) && item.id === "demo:web",
      );
      if (session) assertSession(session);
      // Never expose another sender's WhatsApp context in this mobile pilot.
      return { ...readMetadata(value), sessions: session ? [session] : [] };
    },
    async send(pending: PendingTurn): Promise<Session> {
      if (pending.url !== connection.url)
        throw new Error("Este mensaje pendiente pertenece a otra conexión.");
      const value = await request("/api/disconnect/messages", {
        text: pending.text,
        requestId: pending.requestId,
      });
      if (!isRecord(value)) throw new Error("La API no devolvió una respuesta de conversación válida.");
      assertSession(value.session);
      return value.session;
    },
  };
}
