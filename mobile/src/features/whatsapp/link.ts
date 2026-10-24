// Linking the person's own WhatsApp, against server/'s multiuser routes
// (PR #36, docs/equipo/amaru/WHATSAPP_MULTIUSUARIO.md):
//   POST /api/v1/sessions                       → individual session (bearer, stored in SecureStore)
//   POST /api/v1/whatsapp/connections           → { connectionId, url }  (Unipile link / QR)
//   GET  /api/v1/whatsapp/connections/:id       → { status: connecting | awaiting_code | verified | disconnected }
//   POST /api/v1/whatsapp/connections/:id/code  → resend the code Sol's WhatsApp sends
//   POST /api/v1/whatsapp/connections/:id/verify { code }
//   GET  /api/v1/whatsapp/chats?cursor=         → catalog: names and types only, never content
//   PUT  /api/v1/whatsapp/chats/:id/selection   { selected }
//   DELETE /api/v1/whatsapp/connection
// The legacy owner token is never used here. Everything starts unselected.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type LinkStatus = 'connecting' | 'awaiting_code' | 'verified' | 'disconnected';
export type CatalogChat = { id: string; name: string; type: number | null; selected?: boolean };

export class LinkError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

const KEY = 'sol_v1_session';

async function readToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return await SecureStore.getItemAsync(KEY);
  } catch { return null; }
}

async function writeToken(token: string | null) {
  try {
    if (Platform.OS === 'web') { if (token) localStorage.setItem(KEY, token); else localStorage.removeItem(KEY); return; }
    if (token) await SecureStore.setItemAsync(KEY, token); else await SecureStore.deleteItemAsync(KEY);
  } catch { /* the session is recreated next time */ }
}

export function createLinkClient(baseUrl: string) {
  const base = `${baseUrl.replace(/\/$/, '')}/api/v1`;
  let token: string | null = null;

  async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    if (auth && !token) token = await readToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${base}${path}`, {
        method, signal: controller.signal,
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new LinkError(res.status, typeof data?.error === 'string' ? data.error : `http_${res.status}`);
      return data as T;
    } catch (e) {
      if (e instanceof LinkError) throw e;
      throw new LinkError(0, 'network');
    } finally {
      clearTimeout(timer);
    }
  }

  async function ensureSession() {
    token = token ?? (await readToken());
    if (token) {
      try { return await call<{ userId: string; whatsapp: unknown }>('GET', '/me'); } catch (e) {
        if (!(e instanceof LinkError) || e.status !== 401) throw e;
      }
    }
    const s = await call<{ token: string; userId: string; expiresAt: string }>('POST', '/sessions', {}, false);
    token = s.token;
    await writeToken(s.token);
    return call<{ userId: string; whatsapp: unknown }>('GET', '/me');
  }

  return {
    ensureSession,
    start: () => call<{ connectionId: string; expiresAt: string; url: string }>('POST', '/whatsapp/connections', {}),
    status: (id: string) => call<{ connectionId: string; status: LinkStatus; expiresAt: string; codeStatus?: string; codeExpiresAt?: string }>('GET', `/whatsapp/connections/${encodeURIComponent(id)}`),
    resend: (id: string) => call<{ status: LinkStatus }>('POST', `/whatsapp/connections/${encodeURIComponent(id)}/code`, {}),
    verify: (id: string, code: string) => call<unknown>('POST', `/whatsapp/connections/${encodeURIComponent(id)}/verify`, { code }),
    catalog: (cursor?: string) => call<{ items: CatalogChat[]; cursor: string | null; complete?: boolean }>('GET', `/whatsapp/chats${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
    select: (chatId: string, selected: boolean) => call<unknown>('PUT', `/whatsapp/chats/${encodeURIComponent(chatId)}/selection`, { selected }),
    recommendations: () => call<{ items?: { chatId: string; reason: string }[] }>('POST', '/whatsapp/recommendations', {}),
    disconnect: () => call<unknown>('DELETE', '/whatsapp/connection'),
    forget: () => writeToken(null),
  };
}

export type LinkClient = ReturnType<typeof createLinkClient>;

/** Human words for the server's error codes. */
export function linkErrorText(e: unknown): string {
  const code = e instanceof LinkError ? e.code : 'network';
  switch (code) {
    case 'not_found': case 'http_404': return 'Este servidor todavía no tiene la conexión de WhatsApp por usuario.';
    case 'network': return 'No pude hablar con el servidor. Revisa tu conexión.';
    case 'invalid_code': case 'code_invalid': return 'Ese código no es. Revisa el mensaje de Sol e inténtalo otra vez.';
    case 'code_expired': return 'El código venció. Te mando uno nuevo.';
    case 'too_many_attempts': return 'Demasiados intentos. Espera un momento y pide un código nuevo.';
    case 'invalid_origin': case 'browser_not_enabled': return 'La conexión de WhatsApp se hace desde el teléfono, no desde el navegador.';
    case 'whatsapp_unavailable': return 'WhatsApp no respondió. Inténtalo en un rato.';
    default: return 'Algo falló al conectar. Inténtalo otra vez.';
  }
}
