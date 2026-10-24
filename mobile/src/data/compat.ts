// Temporary bridge for screens still on the v2 shapes (night views, old
// settings). Each block of the redesign removes its uses; delete this file when
// nothing imports it.
import { dueLabel, keyOf } from './dates';
import type { AppState } from './store';
import type { CalendarEvent, Handled, Item, Task } from './types';

/** @deprecated v2 shift, derived from the "Turnos" calendar. */
export type Shift = { date: string; kind: 'dia' | 'tarde' | 'noche' | 'libre'; start?: string; end?: string; onCall: boolean };

export function handledFrom(items: Item[]): Handled[] {
  return items.filter((i) => i.night).map((i) => ({
    id: i.id,
    at: i.receivedAt,
    source: i.source,
    from: i.from.name,
    group: i.direct ? undefined : i.channel,
    text: i.body,
    title: i.summary,
    decision: i.night!.decision,
    reason: i.night!.reason,
    wouldWake: i.night!.wouldWake,
    seenAt: i.outcome.kind === 'alerted' ? i.outcome.seenAt : undefined,
    taskId: i.outcome.kind === 'task' ? i.outcome.taskId : undefined,
  }));
}

export function shiftsFrom(events: CalendarEvent[], keyword = 'Guardia'): Shift[] {
  const nights = new Set(events.filter((e) => e.title.includes(keyword)).map((e) => keyOf(new Date(e.start))));
  return Array.from({ length: 49 }, (_, i) => {
    const d = new Date(Date.now() + (i - 14) * 86_400_000);
    const k = keyOf(d);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    return { date: k, kind: weekend ? 'libre' : 'dia', start: weekend ? undefined : '08:30', end: weekend ? undefined : '17:30', onCall: nights.has(k) };
  });
}

/** @deprecated "Hoy", "Mañana"... for v2 views. */
export const dueText = (t: Task) => dueLabel(t) ?? 'Sin fecha';

export const isImportant = (t: Task) => t.flagged || t.priority === 'high';

/** Feedback map in the v2 shape. */
export const feedbackOf = (s: AppState) => Object.fromEntries(s.items.filter((i) => i.feedback).map((i) => [i.id, i.feedback!]));
