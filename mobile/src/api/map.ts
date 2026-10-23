// Maps server/ shapes (contract v0) to the app's domain model.
import type { Connection, Handled, Task } from '../data/types';
import type { ServerSource, ServerVerdict, WhatsAppChat } from './server';

const DEMO_TAG = /^\[SOLSETS-DEMO\]\s*/;

export function toHandled(v: ServerVerdict): Handled {
  const m = v.message;
  const emailLike = m.source === 'email' || (m.source === 'simulated' && DEMO_TAG.test(m.text));
  return {
    id: v.messageId,
    at: m.receivedAt,
    source: emailLike ? 'email' : 'whatsapp',
    from: m.sender,
    group: m.group,
    text: m.text.replace(DEMO_TAG, ''),
    decision: v.decision,
    reason: v.reason,
    wouldWake: v.wouldWake,
  };
}

/** Last night = everything the server handled in the last 30 hours, newest first. */
export function lastNightFrom(feed: ServerVerdict[], now = Date.now()): Handled[] {
  const since = now - 30 * 60 * 60 * 1000;
  return feed
    .filter((v) => new Date(v.message.receivedAt).getTime() >= since)
    .sort((a, b) => b.message.receivedAt.localeCompare(a.message.receivedAt))
    .map(toHandled);
}

/** Merges the server's live sources into the app's connections (calendar stays local until server/ has it). */
export function mergeSources(local: Connection[], sources: ServerSource[]): Connection[] {
  return local.map((c) => {
    const kind = c.id === 'gmail' ? 'email' : c.id;
    const s = sources.find((x) => x.kind === kind || x.id === c.id);
    if (!s) return c;
    return {
      ...c,
      status: s.status === 'connected' ? 'connected' : 'needs_attention',
      detail: s.detail ?? c.detail,
      lastCheck: s.lastMessageAt ?? s.updatedAt ?? c.lastCheck,
    };
  });
}

export function toChats(items: WhatsAppChat[]) {
  return items.map((c) => ({ id: c.id, name: c.name, kind: c.providerChatType === 1 ? 'grupo' : 'persona', on: c.selected }));
}

/** What the agent left for the morning becomes a task, so it shows up in Tareas without anyone typing it. */
export function tasksFromNight(items: Handled[], existing: Task[]): Task[] {
  const have = new Set(existing.map((t) => t.id));
  return items
    .filter((h) => h.decision === 'report' && !have.has(`srv-${h.id}`))
    .map((h) => ({
      id: `srv-${h.id}`,
      title: h.text.length > 70 ? `${h.text.slice(0, 67)}…` : h.text,
      detail: h.reason,
      source: h.source,
      sourceLabel: h.group ? `${h.group}, ${h.from}` : h.from,
      due: { kind: 'today' as const, label: 'Hoy' },
      important: false,
      why: h.reason,
      done: false,
      createdAt: h.at,
    }));
}
