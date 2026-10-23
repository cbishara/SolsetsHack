// WhatsApp through 2Chat (WhatsApp Web linked device). Reads groups too.
// Docs: https://developers.2chat.co/docs/API/WhatsApp/Web/webhooks/subscribe
// 2Chat does not document a webhook signature, so the hook URL carries a secret
// token: /api/webhooks/2chat/<TWOCHAT_WEBHOOK_TOKEN>.
// The group payload is not documented either: every event is stored raw in
// raw_events so the parser can be adjusted with the first real one.

import type { NewMessage } from '../guard.ts';

export const TWOCHAT_API = 'https://api.p.2chat.io/open';

export const SUBSCRIBED_EVENTS = [
  'whatsapp.message.received',
  'whatsapp.group.message.received',
  'whatsapp.number.status',
] as const;

type Json = Record<string, any>;

export type TwoChatEvent =
  | { kind: 'message'; message: NewMessage }
  | { kind: 'status'; status: 'connected' | 'disconnected' | 'unknown'; detail: string }
  | { kind: 'ignored'; reason: string };

const first = (...values: unknown[]) => values.find((v) => typeof v === 'string' && v.trim() !== '') as string | undefined;

function eventName(body: Json): string | undefined {
  return first(body.event, body.event_name, body.type, body.hook?.event_name);
}

function textOf(m: Json): string | undefined {
  return first(m.text, m.body, m.caption, m.message?.text, m.message?.body, m.message?.conversation, m.content?.text);
}

function statusOf(body: Json): TwoChatEvent {
  const raw = first(body.status, body.data?.status, body.type, body.state) ?? '';
  const reason = first(body.reason, body.data?.reason) ?? '';
  if (raw === 'ready') return { kind: 'status', status: 'connected', detail: 'ready' };
  if (raw === 'disconnected' || raw === 'qr-received') {
    return { kind: 'status', status: 'disconnected', detail: [raw, reason].filter(Boolean).join(': ') };
  }
  return { kind: 'status', status: 'unknown', detail: raw || 'sin estado' };
}

/** Turns any 2Chat webhook body into something the guard understands. */
export function parseTwoChat(body: Json, fallbackEvent?: string): TwoChatEvent {
  const event = eventName(body) ?? fallbackEvent ?? '';
  if (event === 'whatsapp.number.status' || ['qr-received', 'disconnected', 'ready'].includes(String(body.type))) {
    return statusOf(body);
  }

  const m: Json = body.message && typeof body.message === 'object' ? body.message : body;
  if (body.sent_by && body.sent_by !== 'user') return { kind: 'ignored', reason: `enviado por ${body.sent_by}` };
  if (m.from_me === true || m.fromMe === true) return { kind: 'ignored', reason: 'mensaje propio' };

  const text = textOf(m) ?? textOf(body);
  if (!text) return { kind: 'ignored', reason: 'sin texto' };

  const groupName = first(body.group?.wa_group_name, body.group?.name, body.wa_group_name, body.group_name);
  const groupId = first(body.group?.uuid, body.group_uuid, body.to_group_uuid);
  const isGroup = event.includes('group') || Boolean(groupName || groupId);

  const contact = body.contact ?? body.participant?.contact ?? {};
  const senderName = first(
    [contact.first_name, contact.last_name].filter(Boolean).join(' '),
    body.participant?.wa_pushname, body.pushname, m.pushname,
  );
  const senderPhone = first(body.remote_phone_number, body.participant?.phone_number, body.from, m.from);

  const externalId = first(m.id, m.uuid, body.uuid, body.id) ?? `${senderPhone}:${first(body.created_at) ?? Date.now()}`;
  const receivedAt = first(body.created_at, m.created_at) ?? new Date().toISOString();

  return {
    kind: 'message',
    message: {
      externalId,
      source: 'whatsapp',
      sender: senderName ?? senderPhone ?? 'Desconocido',
      group: isGroup ? groupName ?? groupId ?? 'grupo' : undefined,
      text,
      receivedAt: new Date(receivedAt).toISOString(),
    },
  };
}

/** Registers our webhook for each event we use. Run once per deployed URL. */
export async function subscribe(apiKey: string, onNumber: string, hookUrl: string) {
  const results = [];
  for (const event of SUBSCRIBED_EVENTS) {
    const res = await fetch(`${TWOCHAT_API}/webhooks/subscribe/${event}`, {
      method: 'POST',
      headers: { 'X-User-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hook_url: `${hookUrl}?event=${event}`, on_number: onNumber }),
    });
    results.push({ event, ok: res.ok, status: res.status, body: await res.json().catch(() => null) });
  }
  return results;
}
