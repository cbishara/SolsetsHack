import { z } from 'zod';
import { unipileOrigin, WhatsAppError } from '../unipile/client.ts';
import type { CatalogProvider, ChatMetadata, NormalizedMessage } from './catalog.ts';

const id = z.string().min(1).max(512);
const object = z.record(z.string(), z.unknown());
const page = z.object({ items: z.array(object), cursor: z.string().nullish() });
const chatSchema = z.object({ id, account_id: id, name: z.string().nullish(), type: z.number().int().nullish() });
const messageSchema = z.object({
  id, account_id: id, chat_id: id, sender_id: id, text: z.string().max(64000).nullish(),
  timestamp: z.iso.datetime({ offset: true }), is_sender: z.union([z.boolean(), z.literal(0), z.literal(1)]),
  hidden: z.union([z.boolean(), z.number()]).optional(), deleted: z.union([z.boolean(), z.number()]).optional(),
  is_event: z.union([z.boolean(), z.number()]).optional(),
});

/** All credentials stay on the server. Every resource is checked against its expected account. */
export class UnipileMultiUserProvider implements CatalogProvider {
  readonly origin: string;
  constructor(dsn: string, private key: string, readonly botAccountId: string, private fetcher: typeof fetch = fetch) {
    this.origin = unipileOrigin(dsn);
  }
  private async request(path: string, query: Record<string, string | undefined> = {}, body?: unknown): Promise<unknown> {
    const url = new URL(`${this.origin}/api/v1/${path}`);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, value);
    const form = body instanceof FormData;
    try {
      const response = await this.fetcher(url, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { 'X-API-KEY': this.key, Accept: 'application/json', ...(!form && body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body === undefined ? {} : { body: form ? body : JSON.stringify(body) }),
      });
      if (!response.ok) throw new WhatsAppError(502, `Proveedor no disponible (HTTP ${response.status}).`);
      return await response.json();
    } catch {
      // Never expose provider bodies, credentials, recipient, OTP or transport causes.
      throw new WhatsAppError(502, 'No se pudo completar la operación con WhatsApp.');
    }
  }

  async link(connectionId: string, callbackUrl: string, expiresAt: string, reconnectAccountId?: string) {
    const result = z.object({ url: z.url() }).parse(await this.request('hosted/accounts/link', {}, {
      ...(reconnectAccountId ? { type: 'reconnect', reconnect_account: reconnectAccountId } : { type: 'create', providers: ['WHATSAPP'] }), api_url: this.origin, expiresOn: expiresAt,
      name: connectionId, notify_url: callbackUrl,
    }));
    const url = new URL(result.url);
    if (url.protocol !== 'https:' || !/(^|\.)unipile\.com$/i.test(url.hostname) || url.username || url.password) {
      throw new WhatsAppError(502, 'El proveedor devolvió un enlace de conexión inválido.');
    }
    return result.url;
  }

  async owner(accountId: string) {
    if (accountId === this.botAccountId) throw new WhatsAppError(409, 'La cuenta de SOL no puede vincularse como cuenta personal.');
    const account = z.object({
      id, type: z.literal('WHATSAPP'), connection_params: z.object({ im: z.object({ phone_number: z.string() }) }),
      sources: z.array(z.object({ status: z.string() })).min(1),
    }).parse(await this.request(`accounts/${encodeURIComponent(accountId)}`));
    if (account.id !== accountId || !account.sources.every(s => s.status === 'OK')) throw new WhatsAppError(409, 'WhatsApp todavía no está conectado.');
    // This is the canonical provider account phone, never a value supplied by the app or message text.
    const phone = account.connection_params.im.phone_number.replace(/^\+/, '');
    if (!/^[1-9][0-9]{6,14}$/.test(phone)) throw new WhatsAppError(502, 'No se pudo verificar al propietario de WhatsApp.');
    return { accountId, ownerId: `whatsapp:${phone}`, recipientId: `${phone}@s.whatsapp.net` };
  }

  async sendCode(recipientId: string, code: string): Promise<{ chatId: string; messageId: string }> {
    if (!/^[1-9][0-9]{6,14}@s\.whatsapp\.net$/.test(recipientId) || !/^\d{6}$/.test(code)) throw new Error('Invalid verification delivery.');
    const body = new FormData();
    body.set('account_id', this.botAccountId);
    body.set('attendees_ids', recipientId);
    body.set('text', `Tu código de vinculación de SOL es ${code}. Caduca en 5 minutos. Introdúcelo solo en la app donde conectaste WhatsApp. No lo compartas.`);
    const result = z.object({ chat_id: id, message_id: id }).parse(await this.request('chats', {}, body));
    const chat = await this.chat(this.botAccountId, result.chat_id);
    if (chat.type !== 0) throw new WhatsAppError(502, 'No se pudo verificar el chat individual de SOL.');
    // An uncertain response is handled by the caller as uncertain, never retried automatically.
    return { chatId: result.chat_id, messageId: result.message_id };
  }

  private metadata(value: unknown, accountId: string): ChatMetadata {
    const c = chatSchema.parse(value);
    if (c.account_id !== accountId) throw new WhatsAppError(403, 'Conversación fuera de la cuenta vinculada.');
    return { id: c.id, accountId, name: c.name ?? 'Chat sin nombre', type: c.type ?? null };
  }
  async catalog(accountId: string, cursor?: string) {
    const result = page.parse(await this.request('chats', { account_id: accountId, account_type: 'WHATSAPP', limit: '100', cursor }));
    return { items: result.items.map(item => this.metadata(item, accountId)), cursor: result.cursor ?? null };
  }
  async chat(accountId: string, chatId: string) {
    const result = this.metadata(await this.request(`chats/${encodeURIComponent(chatId)}`), accountId);
    if (result.id !== chatId) throw new WhatsAppError(502, 'La conversación no coincide.');
    return result;
  }
  private normalize(value: unknown, accountId: string, chatId?: string): NormalizedMessage | null {
    const m = messageSchema.parse(value);
    if (m.account_id !== accountId || (chatId && m.chat_id !== chatId)) throw new WhatsAppError(403, 'Mensaje fuera de la cuenta o conversación.');
    if (m.hidden || m.deleted || m.is_event || !m.text?.trim()) return null;
    return { id: m.id, accountId, chatId: m.chat_id, senderId: m.sender_id, text: m.text,
      direction: m.is_sender ? 'outgoing' : 'incoming', sentAt: new Date(m.timestamp).toISOString() };
  }
  async messages(accountId: string, chatId: string, cursor?: string) {
    const result = page.parse(await this.request(`chats/${encodeURIComponent(chatId)}/messages`, { limit: '50', cursor }));
    return { items: result.items.map(m => this.normalize(m, accountId, chatId)).filter((m): m is NormalizedMessage => m !== null), cursor: result.cursor ?? null };
  }
  async message(accountId: string, messageId: string) {
    const value = await this.request(`messages/${encodeURIComponent(messageId)}`);
    const m = this.normalize(value, accountId);
    if (m && m.id !== messageId) throw new WhatsAppError(502, 'El mensaje no coincide.');
    return m;
  }

  async subscribe(accountId: string, publicUrl: string, secret: string) {
    const requestUrl = `${publicUrl}/api/v1/webhooks/unipile`;
    const name = `sol-v1-${accountId}`;
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const list = page.parse(await this.request('webhooks', { limit: '100', cursor }));
      const existing = list.items.find(item => item.name === name && item.request_url === requestUrl);
      if (existing) {
        const accounts = existing.account_ids, events = existing.events, headers = existing.headers;
        const configured = existing.enabled === true && existing.source === 'messaging' &&
          Array.isArray(accounts) && accounts.length === 1 && accounts[0] === accountId &&
          Array.isArray(events) && events.includes('message_received') &&
          Array.isArray(headers) && headers.some(h => h && h.key === 'X-Sol-Webhook-Secret' && h.value === secret);
        if (!configured) throw new WhatsAppError(503, 'La recepción de WhatsApp requiere revisar su configuración.');
        return;
      }
      cursor = list.cursor || undefined;
      if (cursor && (seen.has(cursor) || seen.size >= 100)) throw new WhatsAppError(502, 'No se pudo verificar la recepción de WhatsApp.');
      if (cursor) seen.add(cursor);
    } while (cursor);
    await this.request('webhooks', {}, {
      name, source: 'messaging', request_url: requestUrl, format: 'json', enabled: true,
      account_ids: [accountId], events: ['message_received'],
      headers: [{ key: 'Content-Type', value: 'application/json' }, { key: 'X-Sol-Webhook-Secret', value: secret }],
    });
  }
}
