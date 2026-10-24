// Small formatting helpers shared by the digest screens.
import type { CalendarEvent, Handled, SleepNight, Task } from '../../data/types';
import { isImportant } from '../../data/compat';
import { addDays, todayKey } from '../../data/dates';

const DAY = 24 * 60 * 60 * 1000;

export const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const sameDay = (iso: string, offset = 0) => {
  const d = new Date(Date.now() + offset * DAY);
  return new Date(iso).toDateString() === d.toDateString();
};

export const weekdayLong = (offset = 0) =>
  new Date(Date.now() + offset * DAY).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

/** "6 h 54 min" from decimal hours. */
export function hoursLabel(h: number) {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min ? `${whole} h ${min} min` : `${whole} h`;
}

/** One neutral sentence about last night's sleep. Never judges. */
export function sleepLine(nights: SleepNight[]) {
  const last = nights[nights.length - 1];
  if (!last) return null;
  const week = nights.slice(0, -1);
  const avg = week.length ? week.reduce((a, n) => a + n.hours, 0) / week.length : last.hours;
  const diff = Math.round((last.hours - avg) * 60);
  const trend = diff >= 10 ? `, ${diff} min más que tu promedio de la semana` : diff <= -10 ? `, ${-diff} min menos que tu promedio de la semana` : '';
  return { text: `Dormiste cerca de ${hoursLabel(last.hours)}${trend}.`, detail: `Te acostaste a las ${last.bed}. Lo estimo por el uso del teléfono.` };
}

export function partition(items: Handled[]) {
  return {
    woke: items.filter((i) => i.wouldWake),
    waited: items.filter((i) => !i.wouldWake && i.decision === 'report'),
    noise: items.filter((i) => !i.wouldWake && i.decision === 'noise'),
  };
}

export const openTasks = (tasks: Task[]) => tasks.filter((t) => !t.done);

/** Top 3: important first, then today. */
export function topTasks(tasks: Task[], n = 3) {
  const open = openTasks(tasks);
  const score = (t: Task) => (isImportant(t) ? 0 : 1) * 10 + (t.date === todayKey() ? 0 : t.date === addDays(todayKey(), 1) ? 1 : 2);
  return [...open].sort((a, b) => score(a) - score(b)).slice(0, n);
}

export const eventsOn = (events: CalendarEvent[], offset: number) =>
  events.filter((e) => sameDay(e.start, offset)).sort((a, b) => a.start.localeCompare(b.start));

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function wokeSentence(n: number) {
  if (n === 0) return 'Anoche no tuve que despertarte. Todo te esperó.';
  if (n === 1) return 'Anoche te desperté 1 vez. Lo demás te esperó.';
  return `Anoche te desperté ${n} veces. Lo demás te esperó.`;
}

const WEEKDAY = /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i;

/** Due label as it reads inside a sentence: "Lunes" → "el lunes", "Hoy" → "hoy". */
export function dueText(label: string) {
  const lower = label.charAt(0).toLowerCase() + label.slice(1);
  return WEEKDAY.test(label) ? `el ${lower}` : lower;
}

/** Overnight items in the order they happened. */
export const byTime = <T extends { at: string }>(items: T[]) => [...items].sort((a, b) => a.at.localeCompare(b.at));
