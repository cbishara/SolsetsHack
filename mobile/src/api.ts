import { Base64 } from "js-base64";
import type { Session } from "./model";

export type Connection = { url: string; password: string };
export type PendingTurn = { text: string; requestId: string; url: string };
export type PilotStatus = {
  sessions: Session[];
  agent?: { engine: string; configured: boolean; model?: string };
  connection?: { chatUrl?: string | null };
};

export function validateConnection(
  input: Connection,
  development = false,
): Connection {
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

function assertSession(value: unknown): asserts value is Session {
  const item = value as Session | undefined;
  if (
    item?.id !== "demo:web" ||
    !Array.isArray(item.messages) ||
    item.messages.some(
      (message) =>
        typeof message.id !== "string" ||
        typeof message.text !== "string" ||
        !["user", "assistant"].includes(message.role),
    )
  ) {
    throw new Error(
      "La API no devolvió la conversación de prueba esperada. No se guardó una respuesta ficticia.",
    );
  }
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
          typeof value.error === "string"
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
      if (!Array.isArray(value.sessions))
        throw new Error(
          "La API no es compatible con el piloto de conversación.",
        );
      const session = value.sessions.find(
        (item: Session) => item.id === "demo:web",
      );
      if (session) assertSession(session);
      // Never expose another sender's WhatsApp context in this mobile pilot.
      return { ...value, sessions: session ? [session] : [] };
    },
    async send(pending: PendingTurn): Promise<Session> {
      if (pending.url !== connection.url)
        throw new Error("Este mensaje pendiente pertenece a otra conexión.");
      const value = await request("/api/disconnect/messages", {
        text: pending.text,
        requestId: pending.requestId,
      });
      assertSession(value.session);
      return value.session;
    },
  };
}
