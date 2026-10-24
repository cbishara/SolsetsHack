// Typed client for the Soltra server (server/, contract v0 in issue #7 and the
// WhatsApp routes of PR #23). The app talks only to server/, never directly to
// agent/ (agreement in issue #30).

export type ServerDecision = 'wake' | 'report' | 'noise';
export type ServerFeedback = 'right' | 'should_have_woken' | 'should_not_have_woken';

export type ServerMessage = {
  id: string;
  externalId?: string;
  source: 'whatsapp' | 'email' | 'simulated';
  sender: string;
  group?: string;
  text: string;
  receivedAt: string;
};

export type ServerVerdict = {
  messageId: string;
  decision: ServerDecision;
  reason: string;
  isNew: boolean;
  confidence: number;
  incidentKey: string;
  wouldWake: boolean;
  why: 'urgent' | 'new' | 'low_confidence' | 'duplicate' | 'off_duty' | 'not_urgent';
  message: ServerMessage;
};

export type ServerNight = { date: string; onCall: boolean | null; suggestedOnCall: boolean | null; confirmedAt?: string };
export type ServerReport = { date: string; woke: ServerVerdict[]; pending: ServerVerdict[]; worries: { id: string; text: string; createdAt: string }[] };
export type ServerMetrics = { nights: number; wakes: number; rated: number; agreement: number; readyForActive: boolean };
export type ServerSettings = { mode: 'shadow' | 'active' };
export type ServerSource = { id: string; kind: 'whatsapp' | 'email'; status: 'connected' | 'disconnected' | 'unknown'; detail?: string; lastMessageAt?: string; updatedAt: string };
export type ServerAlert = { id: string; messageId: string; status: string; createdAt: string; seenAt?: string };
export type WhatsAppStatus = { configured: boolean; providerStatus?: unknown; selectedChatIds: string[]; lastEvent: unknown; agent: string; autoReply: boolean };
export type WhatsAppChat = { id: string; name: string; providerChatType: number | null; selected: boolean };

export class ServerError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export type ServerConfig = { url: string; token?: string };

export function createServerClient({ url, token }: ServerConfig) {
  const base = url.replace(/\/$/, '');

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${base}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data?.error === 'string' ? data.error : `http_${res.status}`;
        const message = typeof data?.message === 'string' ? data.message : typeof data?.error === 'string' ? data.error : `El servidor respondió ${res.status}.`;
        throw new ServerError(res.status, code, message);
      }
      return data as T;
    } catch (error) {
      if (error instanceof ServerError) throw error;
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new ServerError(0, aborted ? 'timeout' : 'network', aborted ? 'El servidor tardó demasiado en responder.' : 'No pude conectarme con el servidor.');
    } finally {
      clearTimeout(timer);
    }
  }

  /** Multipart upload of a local recording (file:// on iOS, blob: on web). */
  async function upload<T>(path: string, uri: string, mime: string): Promise<T> {
    const form = new FormData();
    if (uri.startsWith('blob:') || uri.startsWith('data:')) {
      const blob = await (await fetch(uri)).blob();
      form.append('audio', blob, 'nota.webm');
    } else {
      form.append('audio', { uri, name: 'nota.m4a', type: mime } as unknown as Blob);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${base}${path}`, { method: 'POST', body: form, signal: controller.signal, headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ServerError(res.status, typeof data?.error === 'string' ? data.error : `http_${res.status}`, typeof data?.message === 'string' ? data.message : `El servidor respondió ${res.status}.`);
      return data as T;
    } catch (error) {
      if (error instanceof ServerError) throw error;
      throw new ServerError(0, 'network', 'No pude enviar el audio al servidor.');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    transcribe: (uri: string, mime: string) => upload<{ text: string }>('/api/transcribe', uri, mime),
    health: () => call<{ ok: boolean; service: string }>('GET', '/api/health'),
    night: () => call<ServerNight>('GET', '/api/night/today'),
    setNight: (onCall: boolean) => call<ServerNight>('PUT', '/api/night/today', { onCall }),
    feed: (since?: string) => call<ServerVerdict[]>('GET', `/api/feed${since ? `?since=${encodeURIComponent(since)}` : ''}`),
    report: (date?: string) => call<ServerReport>('GET', `/api/report${date ? `?date=${date}` : ''}`),
    metrics: () => call<ServerMetrics>('GET', '/api/metrics'),
    settings: () => call<ServerSettings>('GET', '/api/settings'),
    setSettings: (s: ServerSettings) => call<ServerSettings>('PUT', '/api/settings', s),
    sources: () => call<ServerSource[]>('GET', '/api/sources'),
    feedback: (messageId: string, value: ServerFeedback) => call<{ ok: true }>('POST', `/api/messages/${encodeURIComponent(messageId)}/feedback`, { value }),
    alertSeen: (id: string) => call<ServerAlert>('POST', `/api/alerts/${encodeURIComponent(id)}/seen`),
    worry: (text: string) => call<{ id: string; text: string; createdAt: string }>('POST', '/api/worries', { text }),
    chat: (text: string) => call<{ reply: string }>('POST', '/api/chat', { text }),
    message: (text: string, sender?: string, group?: string) => call<unknown>('POST', '/api/messages', { text, sender, group }),
    simulateNight: () => call<{ count: number }>('POST', '/api/simulate/night'),
    registerDevice: (expoPushToken: string) => call<{ ok: true }>('POST', '/api/devices', { expoPushToken }),
    whatsappStatus: () => call<WhatsAppStatus>('GET', '/api/whatsapp/status'),
    whatsappChats: (cursor?: string) => call<{ items: WhatsAppChat[]; cursor: string | null }>('GET', `/api/whatsapp/chats${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
    selectChat: (chatId: string, selected: boolean) => call<{ chatId: string; selected: boolean }>('PUT', `/api/whatsapp/chats/${encodeURIComponent(chatId)}/selection`, { selected }),
  };
}

export type ServerClient = ReturnType<typeof createServerClient>;
