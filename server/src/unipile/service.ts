import { z } from 'zod';
import type { Store } from '../store/store.ts';
import { UnipileClient, WhatsAppError, type ProviderObject } from './client.ts';

const id = z.string().min(1).max(512);
const timestamp = z.iso.datetime({ offset: true });
const text = z.string().max(64_000);
const bool = z.union([z.boolean(), z.literal(0), z.literal(1)]);
const messageSchema = z.object({
  id, account_id: id, chat_id: id, text: text.nullish(), timestamp,
  sender_id: id, is_sender: bool, hidden: bool.optional(), deleted: bool.optional(), is_event: bool.optional(),
});
const webhookSchema = z.object({
  event: z.literal('message_received'), account_id: id, account_type: z.literal('WHATSAPP'), chat_id: id,
  message_id: id, message: text.nullish(), timestamp,
  sender: z.object({ attendee_provider_id: id }),
  account_info: z.object({ user_id: id }).optional(), is_sender: bool.optional(), is_event: bool.optional(),
});
const webhookEnvelopeSchema = webhookSchema.pick({ event: true, account_id: true, account_type: true, chat_id: true, message_id: true });

export type WhatsAppMessage = {
  id: string; accountId: string; chatId: string; text: string; senderId: string;
  direction: 'incoming' | 'outgoing' | 'unknown'; sentAt: string; storedAt: string;
  origin: 'history' | 'webhook'; agentStatus: 'not_connected';
};
type Selection = { chatId: string; selected: boolean; selectedAt: string };
type WebhookResult = { ignored: string } | { accepted: true; duplicate?: boolean; agent?: 'not_connected' };
const scope = (...parts: string[]) => parts.map(encodeURIComponent).join(':') + ':';

export class WhatsAppService {
  constructor(private store: Store, public client: UnipileClient) {}
  private selectionId(chatId: string) { return scope(this.client.accountId, chatId); }

  async selected(chatId: string) {
    return (await this.store.get<Selection>('whatsapp_selections', this.selectionId(chatId)))?.selected === true;
  }

  async status(refresh = true) {
    let providerStatus = 'UNKNOWN';
    if (refresh) {
      const account = await this.client.account();
      if (account.id !== this.client.accountId || account.type !== 'WHATSAPP') throw new WhatsAppError(502, 'La cuenta de Unipile no corresponde a WhatsApp.');
      const sources = Array.isArray(account.sources) ? account.sources as ProviderObject[] : [];
      providerStatus = sources.map((source) => String(source.status ?? 'UNKNOWN')).join(',') || 'UNKNOWN';
    }
    const selections = await this.store.list<Selection>('whatsapp_selections', 1000, scope(this.client.accountId));
    const lastEvent = await this.store.get('whatsapp_status', this.client.accountId);
    return { configured: true, providerStatus, selectedChatIds: selections.filter((s) => s.selected).map((s) => s.chatId), lastEvent: lastEvent ?? null, agent: 'not_connected', autoReply: false };
  }

  async chats(cursor?: string) {
    const page = await this.client.chats(cursor);
    const items = await Promise.all(page.items.filter((chat) => chat.account_id === this.client.accountId).map(async (chat) => ({
      id: id.parse(chat.id), name: typeof chat.name === 'string' ? chat.name : 'Chat sin nombre',
      providerChatType: typeof chat.type === 'number' ? chat.type : null, selected: await this.selected(String(chat.id)),
    })));
    return { items, cursor: page.cursor ?? null };
  }

  async select(chatId: string, selected: boolean) {
    if (selected) await this.assertOwned(chatId);
    await this.store.put<Selection>('whatsapp_selections', this.selectionId(chatId), { chatId, selected, selectedAt: new Date().toISOString() });
    return { chatId, selected };
  }

  private async assertOwned(chatId: string) {
    const chat = await this.client.chat(chatId);
    if (chat.id !== chatId || chat.account_id !== this.client.accountId) throw new WhatsAppError(403, 'El chat no pertenece a la cuenta configurada.');
  }
  private async assertSelected(chatId: string) {
    if (!await this.selected(chatId)) throw new WhatsAppError(403, 'Selecciona explícitamente este chat antes de usarlo.');
  }
  private async save(message: Omit<WhatsAppMessage, 'storedAt' | 'agentStatus'>) {
    return this.store.insertIfAbsent<WhatsAppMessage>('whatsapp_messages', scope(message.accountId, message.chatId, message.id), {
      ...message, storedAt: new Date().toISOString(), agentStatus: 'not_connected',
    });
  }

  async importHistory(chatId: string, cursor?: string) {
    await this.assertSelected(chatId);
    await this.assertOwned(chatId);
    const page = await this.client.messages(chatId, cursor);
    let imported = 0, skipped = 0;
    for (const item of page.items) {
      // Re-check consent after the provider request and before every write.
      await this.assertSelected(chatId);
      const parsed = messageSchema.safeParse(item);
      if (!parsed.success) { skipped++; continue; }
      const m = parsed.data;
      if (m.account_id !== this.client.accountId || m.chat_id !== chatId || m.hidden || m.deleted || m.is_event || !m.text?.trim()) { skipped++; continue; }
      if (await this.save({ id: m.id, accountId: m.account_id, chatId, text: m.text, senderId: m.sender_id, direction: m.is_sender ? 'outgoing' : 'incoming', sentAt: new Date(m.timestamp).toISOString(), origin: 'history' })) imported++;
      else skipped++;
    }
    return { imported, skipped, cursor: page.cursor ?? null, agent: 'not_connected', notifications: 0 };
  }

  async messages(chatId: string) {
    await this.assertSelected(chatId);
    const items = await this.store.list<WhatsAppMessage>('whatsapp_messages', 200, scope(this.client.accountId, chatId), 'sentAt');
    items.sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id));
    return { items, limit: 200, agent: 'not_connected' };
  }

  async receive(body: unknown): Promise<WebhookResult> {
    const status = z.object({ AccountStatus: z.object({ account_id: id, account_type: z.literal('WHATSAPP'), message: z.string().max(100) }) }).safeParse(body);
    if (status.success) {
      if (status.data.AccountStatus.account_id !== this.client.accountId) return { ignored: 'account' };
      await this.store.put('whatsapp_status', this.client.accountId, { status: status.data.AccountStatus.message, receivedAt: new Date().toISOString() });
      return { accepted: true };
    }
    // No raw payload is persisted: out-of-scope chats never enter the database.
    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) {
      // Provider-specific optional fields can differ from the documented example.
      // Resolve a valid, authorized notification against the canonical REST message.
      const envelope = webhookEnvelopeSchema.safeParse(body);
      if (!envelope.success) {
        console.warn('[unipile] unsupported webhook envelope', envelope.error.issues.map((issue) => ({ field: issue.path.join('.'), code: issue.code })));
        return { ignored: 'unsupported_or_invalid_event' };
      }
      const e = envelope.data;
      if (e.account_id !== this.client.accountId) return { ignored: 'account' };
      if (!await this.selected(e.chat_id)) return { ignored: 'chat_not_selected' };
      if (await this.store.get('whatsapp_messages', scope(e.account_id, e.chat_id, e.message_id))) return { accepted: true, duplicate: true, agent: 'not_connected' };
      console.warn('[unipile] resolving webhook from REST', parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), code: issue.code })));
      const canonical = messageSchema.safeParse(await this.client.message(e.message_id));
      if (!canonical.success) throw new WhatsAppError(502, 'Unipile devolvió un mensaje incompatible; se requiere reintento.');
      const m = canonical.data;
      if (m.id !== e.message_id || m.account_id !== e.account_id || m.chat_id !== e.chat_id) throw new WhatsAppError(502, 'La identidad del mensaje no coincide con la notificación.');
      if (m.hidden || m.deleted || m.is_event) return { ignored: 'non_text' };
      return this.receive({
        ...e, message: m.text, timestamp: m.timestamp, sender: { attendee_provider_id: m.sender_id },
        is_sender: m.is_sender, is_event: m.is_event,
      });
    }
    const m = parsed.data;
    if (m.account_id !== this.client.accountId) return { ignored: 'account' };
    if (!await this.selected(m.chat_id)) return { ignored: 'chat_not_selected' };
    if (m.is_event || !m.message?.trim()) return { ignored: 'non_text' };
    const ownId = m.account_info?.user_id;
    const direction = m.is_sender !== undefined ? (m.is_sender ? 'outgoing' : 'incoming') :
      ownId ? (ownId === m.sender.attendee_provider_id ? 'outgoing' : 'incoming') : 'unknown';
    const inserted = await this.save({
      id: m.message_id, accountId: m.account_id, chatId: m.chat_id, text: m.message,
      senderId: m.sender.attendee_provider_id, direction, sentAt: new Date(m.timestamp).toISOString(), origin: 'webhook',
    });
    // Persist before acknowledging. No background task, auto-reply, or alert can be lost on restart.
    return { accepted: true, duplicate: !inserted, agent: 'not_connected' };
  }
}
