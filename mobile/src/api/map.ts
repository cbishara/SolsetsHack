// Maps server/ shapes (contract v0) to the app's domain model (v3).
import type { Category, Connection, Item, Task, WatchedChat } from '../data/types';
import type { ServerSource, ServerVerdict, WhatsAppChat } from './server';

const DEMO_TAG = /^\[SOLSETS-DEMO\]\s*/;

const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = (s: string) => plain(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 3);

/**
 * Best category for a server verdict until server/ sends one: among the
 * categories that match the decision, the one whose name and description share
 * the most words with the message. No match on a "report" means "ask the person".
 */
export function guessCategory(v: ServerVerdict, categories: Category[]): string | null {
  const fits = categories.filter((c) => c.status === 'active' && (
    v.decision === 'wake' ? c.action === 'alert' : v.decision === 'noise' ? c.action === 'ignore' : c.action !== 'alert' && c.action !== 'ignore'));
  const text = new Set(words(`${v.message.text} ${v.message.group ?? ''} ${v.message.sender}`));
  let best: { id: string; score: number } | null = null;
  for (const c of fits) {
    const score = words(`${c.name} ${c.description}`).filter((w) => text.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score };
  }
  if (best) return best.id;
  return v.decision === 'report' ? null : fits[0]?.id ?? null;
}

/**
 * A short headline from a raw message until the agent sends its own summary:
 * no greeting, no "porfa", no shouting, first letter up.
 * "Rodrigo, cuando despiertes revisa lo del portal porfa" → "Cuando despiertes revisa lo del portal".
 */
export function headline(text: string): string {
  let t = text.trim()
    .replace(/^(hola|buenas|oye|ey)[,!\s]+/i, '')
    .replace(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s+/, '')
    .replace(/^(urgente|importante)\s*[:!-]\s*/i, '')
    .replace(/\s*(porfa|por favor|pls|gracias)[.!]*$/i, '')
    .replace(/\s+/g, ' ');
  if (t.length > 90) t = `${t.slice(0, 87).replace(/\s+\S*$/, '')}…`;
  return t ? t[0].toUpperCase() + t.slice(1) : text;
}

/** A verdict from the server becomes an inbox item, original text included. */
export function toItem(v: ServerVerdict, categories: Category[] = []): Item {
  const m = v.message;
  const emailLike = m.source === 'email' || (m.source === 'simulated' && DEMO_TAG.test(m.text));
  const text = m.text.replace(DEMO_TAG, '');
  const categoryId = guessCategory(v, categories);
  return {
    id: `srv-${v.messageId}`,
    source: emailLike ? 'email' : 'whatsapp',
    channel: m.group ?? (emailLike ? 'Correo' : m.sender),
    direct: !m.group,
    from: { name: m.sender },
    receivedAt: m.receivedAt,
    body: text,
    summary: headline(text),
    context: v.reason,
    categoryId,
    confidence: v.confidence,
    review: v.confidence < 0.7 || v.why === 'new' || v.why === 'low_confidence' ? 'new_kind' : categoryId ? 'none' : 'category',
    outcome: v.decision === 'wake' ? { kind: 'alerted' } : v.decision === 'noise' ? { kind: 'ignored' } : { kind: 'task', taskId: `srv-task-${v.messageId}` },
    night: { decision: v.decision, wouldWake: v.wouldWake, reason: v.reason },
    read: false,
    remote: true,
    alertId: v.alertId,
  };
}

/** Everything the server handled in the last 30 hours, newest first. */
export function itemsFrom(feed: ServerVerdict[], categories: Category[], now = Date.now()): Item[] {
  const since = now - 30 * 60 * 60 * 1000;
  return feed
    .filter((v) => new Date(v.message.receivedAt).getTime() >= since)
    .sort((a, b) => b.message.receivedAt.localeCompare(a.message.receivedAt))
    .map((v) => toItem(v, categories));
}

/** The original server message id behind an item, for feedback. */
export const serverMessageId = (itemId: string) => itemId.replace(/^srv-/, '');

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

export function toChats(items: WhatsAppChat[]): WatchedChat[] {
  return items.map((c) => ({ id: c.id, name: c.name, kind: c.providerChatType === 1 ? 'grupo' : 'persona', on: c.selected }));
}

/** What the server left for the morning becomes a task once, linked to its item. */
export function tasksFromItems(items: Item[], existing: Task[]): Task[] {
  const have = new Set(existing.map((t) => t.id));
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return items
    .filter((i) => i.outcome.kind === 'task' && !have.has(i.outcome.taskId))
    .map((i) => ({
      id: (i.outcome as { taskId: string }).taskId,
      title: i.summary,
      categoryId: i.categoryId,
      itemId: i.id,
      source: i.source === 'calendar' ? 'calendar' : i.source,
      sourceLabel: `${i.from.name} · ${i.source === 'email' ? 'Correo' : 'WhatsApp'}`,
      date: key,
      reminder: 'none' as const,
      repeat: 'never' as const,
      priority: 'none' as const,
      flagged: false,
      why: i.context,
      done: false,
      createdAt: i.receivedAt,
    }));
}
