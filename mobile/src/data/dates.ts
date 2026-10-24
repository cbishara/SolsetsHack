// Dates in local time, written the way people say them in Chilean Spanish.
// Pure functions: every one takes `now` so tests and the demo are stable.
import type { Priority, ReminderOption, Repeat, Task } from './types';

const DAY = 86_400_000;

export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const WEEKDAY_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for a Date, in local time. */
export function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of a 'YYYY-MM-DD' key. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = (now = new Date()) => keyOf(now);

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** Whole days from today to `key` (negative in the past). */
export function daysFrom(key: string, now = new Date()): number {
  return Math.round((fromKey(key).getTime() - fromKey(keyOf(now)).getTime()) / DAY);
}

export const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** "Hoy", "Mañana", "Ayer", "Lunes" (within the week), "Lun 3 nov" further out. */
export function dayLabel(key: string, now = new Date(), opts: { short?: boolean } = {}): string {
  const n = daysFrom(key, now);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  const d = fromKey(key);
  if (n > 1 && n < 7) return cap(opts.short ? WEEKDAYS_SHORT[d.getDay()] : WEEKDAYS[d.getDay()]);
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${cap(WEEKDAYS_SHORT[d.getDay()])} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

/** "sábado 24 de octubre" */
export function longDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "hace 2 min", "hace 3 h", "ayer 18:02", "lun 13:40". */
export function relative(iso: string, now = new Date()): string {
  const t = new Date(iso);
  const diff = (now.getTime() - t.getTime()) / 60_000;
  if (diff < 1) return 'ahora';
  if (diff < 60) return `hace ${Math.round(diff)} min`;
  const days = daysFrom(keyOf(t), now);
  if (days === 0) return diff < 180 ? `hace ${Math.round(diff / 60)} h` : timeOf(iso);
  if (days === -1) return `ayer ${timeOf(iso)}`;
  if (days > -7) return `${WEEKDAYS_SHORT[t.getDay()]} ${timeOf(iso)}`;
  return `${t.getDate()} ${MONTHS_SHORT[t.getMonth()]}`;
}

/** Compact time for list rows: "03:05", "ayer", "lun", "12 oct". */
export function stamp(iso: string, now = new Date()): string {
  const t = new Date(iso);
  const days = daysFrom(keyOf(t), now);
  if (days === 0) return timeOf(iso);
  if (days === -1) return 'Ayer';
  if (days > -7) return cap(WEEKDAYS_SHORT[t.getDay()]);
  return `${t.getDate()} ${MONTHS_SHORT[t.getMonth()]}`;
}

// Tasks --------------------------------------------------------------------------

/** When a task is due, as a Date (end of day when it has no time). */
export function dueAt(task: Pick<Task, 'date' | 'time'>): Date | null {
  if (!task.date) return null;
  const d = fromKey(task.date);
  if (task.time) {
    const [h, m] = task.time.split(':').map(Number);
    d.setHours(h, m);
  } else d.setHours(23, 59);
  return d;
}

export function isOverdue(task: Pick<Task, 'date' | 'time' | 'done'>, now = new Date()): boolean {
  if (task.done || !task.date) return false;
  if (!task.time) return daysFrom(task.date, now) < 0;
  const d = dueAt(task);
  return !!d && d.getTime() < now.getTime();
}

/** "Hoy, 11:30", "Mañana", "Lunes, 10:00", "Vencida: ayer". */
export function dueLabel(task: Pick<Task, 'date' | 'time' | 'done'>, now = new Date()): string | null {
  if (!task.date) return null;
  const day = dayLabel(task.date, now);
  return task.time ? `${day}, ${task.time}` : day;
}

export const REMINDERS: { id: ReminderOption; label: string; short: string }[] = [
  { id: 'none', label: 'Sin aviso', short: 'Sin aviso' },
  { id: 'at', label: 'A la hora', short: 'A la hora' },
  { id: '5m', label: '5 minutos antes', short: '5 min antes' },
  { id: '15m', label: '15 minutos antes', short: '15 min antes' },
  { id: '30m', label: '30 minutos antes', short: '30 min antes' },
  { id: '1h', label: '1 hora antes', short: '1 h antes' },
  { id: '1d', label: '1 día antes', short: '1 día antes' },
];
export const reminderLabel = (r: ReminderOption) => REMINDERS.find((x) => x.id === r)?.label ?? 'Sin aviso';

const REMINDER_MIN: Record<ReminderOption, number> = { none: 0, at: 0, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '1d': 1440 };

/** When the reminder fires. Without a time, at 09:00 of the day. */
export function reminderAt(task: Pick<Task, 'date' | 'time' | 'reminder'>): Date | null {
  if (!task.date || task.reminder === 'none') return null;
  const d = fromKey(task.date);
  const [h, m] = (task.time ?? '09:00').split(':').map(Number);
  d.setHours(h, m);
  return new Date(d.getTime() - REMINDER_MIN[task.reminder] * 60_000);
}

export const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'never', label: 'Nunca' },
  { id: 'daily', label: 'Cada día' },
  { id: 'weekdays', label: 'Días hábiles' },
  { id: 'weekly', label: 'Cada semana' },
  { id: 'monthly', label: 'Cada mes' },
  { id: 'yearly', label: 'Cada año' },
];
export const repeatLabel = (r: Repeat) => REPEATS.find((x) => x.id === r)?.label ?? 'Nunca';

/** Next date for a repeating task, from its current date. */
export function nextRepeat(key: string, repeat: Repeat): string {
  const d = fromKey(key);
  switch (repeat) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekdays': do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: break;
  }
  return keyOf(d);
}

export const PRIORITIES: { id: Priority; label: string; marks: string }[] = [
  { id: 'none', label: 'Ninguna', marks: '' },
  { id: 'low', label: 'Baja', marks: '!' },
  { id: 'medium', label: 'Media', marks: '!!' },
  { id: 'high', label: 'Alta', marks: '!!!' },
];
export const priorityLabel = (p: Priority) => PRIORITIES.find((x) => x.id === p)?.label ?? 'Ninguna';

/** Quick postpone targets, as Apple Reminders offers them. */
export function snoozeOptions(now = new Date()): { id: string; label: string; detail: string; date: string; time?: string }[] {
  const today = keyOf(now);
  const inOneHour = new Date(now.getTime() + 60 * 60_000);
  const evening = now.getHours() < 18;
  const saturday = (6 - now.getDay() + 7) % 7 || 7;
  const monday = (8 - now.getDay()) % 7 || 7;
  return [
    { id: '1h', label: 'En 1 hora', detail: timeOf(inOneHour.toISOString()), date: keyOf(inOneHour), time: timeOf(inOneHour.toISOString()) },
    ...(evening ? [{ id: 'evening', label: 'Esta tarde', detail: '18:00', date: today, time: '18:00' }] : []),
    { id: 'tomorrow', label: 'Mañana', detail: cap(WEEKDAYS[(now.getDay() + 1) % 7]), date: addDays(today, 1), time: '09:00' },
    { id: 'weekend', label: 'Este fin de semana', detail: 'Sábado', date: addDays(today, saturday), time: '10:00' },
    { id: 'nextweek', label: 'La próxima semana', detail: 'Lunes', date: addDays(today, monday), time: '09:00' },
  ];
}

/** Days of the month grid (6 weeks, Monday first) around `month`. */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => keyOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}

/** Monday-first week containing `key`. */
export function weekOf(key: string): string[] {
  const d = fromKey(key);
  const monday = addDays(key, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
