// What a day holds, ready to draw: timed events and tasks in order, all-day
// things on top, and the night alerts window when it applies.
import { addDays, fromKey, keyOf, timeOf } from '../../data/dates';
import { calendarById, eventsOn, nightAlertsFor } from '../../data/select';
import type { AppState } from '../../data/store';
import type { CalendarEvent, Task } from '../../data/types';
import { categoryColors } from '../../theme/tokens';

export type Entry =
  | { kind: 'event'; id: string; time: string; end: string; event: CalendarEvent; color: string; note?: string }
  | { kind: 'task'; id: string; time: string; task: Task }
  | { kind: 'night'; id: string; time: string; end: string; because: string };

export type DayPlan = { allDay: { event: CalendarEvent; color: string; note?: string }[]; timed: Entry[]; untimed: Task[] };

export function dayPlan(s: AppState, key: string): DayPlan {
  const start = fromKey(key).getTime();
  const end = start + 86_400_000;
  const allDay: DayPlan['allDay'] = [];
  const timed: Entry[] = [];
  for (const e of eventsOn(s, key)) {
    const color = categoryColors[calendarById(s, e.calendarId)?.color ?? 'gray'];
    const st = new Date(e.start).getTime();
    const en = new Date(e.end).getTime();
    if (e.allDay) allDay.push({ event: e, color });
    else if (st < start) allDay.push({ event: e, color, note: `Desde ayer, hasta las ${timeOf(e.end)}` });
    else timed.push({ kind: 'event', id: e.id, time: timeOf(e.start), end: timeOf(e.end), event: e, color, note: en > end ? `Hasta mañana a las ${timeOf(e.end)}` : undefined });
  }
  const tasks = s.tasks.filter((t) => t.date === key && !(t.done && !t.doneAt));
  for (const t of tasks.filter((x) => x.time)) timed.push({ kind: 'task', id: t.id, time: t.time!, task: t });
  const night = nightAlertsFor(s, key);
  if (night.on) timed.push({ kind: 'night', id: `night-${key}`, time: night.from, end: night.to, because: night.because });
  timed.sort((a, b) => a.time.localeCompare(b.time) || (a.kind === 'night' ? 1 : 0) - (b.kind === 'night' ? 1 : 0));
  return { allDay, timed, untimed: tasks.filter((t) => !t.time) };
}

/** Up to three colors of what a day has, for the dots under each date. */
export function dayDots(s: AppState, key: string): string[] {
  const colors = new Set<string>();
  for (const e of eventsOn(s, key)) {
    if (new Date(e.start).getTime() < fromKey(key).getTime()) continue;
    colors.add(categoryColors[calendarById(s, e.calendarId)?.color ?? 'gray']);
  }
  if (s.tasks.some((t) => t.date === key && !t.done)) colors.add(categoryColors.gray);
  return [...colors].slice(0, 3);
}

/** One line for the week: "4 reuniones, 2 noches con avisos, 6 tareas". */
export function weekLine(s: AppState, days: string[]): string {
  let events = 0;
  let nights = 0;
  let tasks = 0;
  for (const k of days) {
    events += eventsOn(s, k).filter((e) => !e.allDay && keyOf(new Date(e.start)) === k && !e.title.toLowerCase().includes(s.nightAlerts.keyword.toLowerCase())).length;
    if (nightAlertsFor(s, k).on && s.nightAlerts.mode === 'urgent') nights++;
    tasks += s.tasks.filter((t) => t.date === k && !t.done).length;
  }
  const parts = [`${events} ${events === 1 ? 'evento' : 'eventos'}`];
  if (nights) parts.push(`${nights} ${nights === 1 ? 'noche' : 'noches'} con avisos`);
  parts.push(`${tasks} ${tasks === 1 ? 'tarea' : 'tareas'}`);
  return parts.join(' · ');
}

export const nextDays = (key: string, n: number) => Array.from({ length: n }, (_, i) => addDays(key, i));
