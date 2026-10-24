// Derived views over the store. Screens read these instead of re-deriving, so
// Inicio, the summaries and WhatsApp copy always agree with each other.
import { addDays, daysFrom, fromKey, isOverdue, keyOf, minutesOf, todayKey } from './dates';
import type { AppState } from './store';
import type { CalendarEvent, Category, Item, NightAlerts, Task } from './types';

export const categoryById = (s: Pick<AppState, 'categories'>, id?: string | null): Category | undefined =>
  id ? s.categories.find((c) => c.id === id) : undefined;

export const activeCategories = (s: Pick<AppState, 'categories'>) => s.categories.filter((c) => c.status === 'active');

// Night ----------------------------------------------------------------------------

/** Is `now` inside the night window (from → to, crossing midnight)? */
export function inNightWindow(n: Pick<NightAlerts, 'from' | 'to'>, now = new Date()): boolean {
  const m = now.getHours() * 60 + now.getMinutes();
  const from = minutesOf(n.from);
  const to = minutesOf(n.to);
  return from > to ? m >= from || m < to : m >= from && m < to;
}

/** The night that `now` belongs to: before the end of the window it is still last night. */
export function nightKey(n: Pick<NightAlerts, 'to'>, now = new Date()): string {
  const today = keyOf(now);
  return now.getHours() * 60 + now.getMinutes() < minutesOf(n.to) ? addDays(today, -1) : today;
}

export type Tonight = {
  on: boolean;
  /** Why it is on or off, in one short phrase. */
  because: string;
  event?: CalendarEvent;
  wakers: Category[];
  from: string;
  to: string;
};

/** Whether night alerts apply to a given night, and why. Facts about settings, never a forecast. */
export function nightAlertsFor(s: Pick<AppState, 'nightAlerts' | 'events' | 'categories'>, night: string): Tonight {
  const n = s.nightAlerts;
  const wakers = s.categories.filter((c) => c.status === 'active' && c.wakeAtNight);
  const base = { wakers, from: n.from, to: n.to };
  if (n.mode === 'quiet') return { ...base, on: false, because: 'Tienes los avisos nocturnos en silencio' };
  if (n.override?.date === night) return { ...base, on: n.override.on, because: n.override.on ? 'Los activaste para esta noche' : 'Los apagaste para esta noche' };
  if (n.when === 'always') return { ...base, on: true, because: 'Activos todas las noches' };
  if (n.when === 'days') {
    const on = n.days.includes(fromKey(night).getDay());
    return { ...base, on, because: on ? 'Hoy es uno de tus días con avisos' : 'Hoy no es uno de tus días con avisos' };
  }
  const startOfNight = fromKey(night);
  startOfNight.setHours(Math.floor(minutesOf(n.from) / 60), minutesOf(n.from) % 60);
  const endOfNight = new Date(startOfNight.getTime() + ((minutesOf(n.to) - minutesOf(n.from) + 1440) % 1440) * 60_000);
  const keyword = n.keyword.trim().toLowerCase();
  const event = s.events.find((e) => e.calendarId === n.calendarId && e.title.toLowerCase().includes(keyword)
    && new Date(e.start) < endOfNight && new Date(e.end) > startOfNight);
  return event
    ? { ...base, on: true, event, because: `Tienes "${event.title}" en tu calendario` }
    : { ...base, on: false, because: `No hay "${n.keyword}" en tu calendario esta noche` };
}

export const tonight = (s: Pick<AppState, 'nightAlerts' | 'events' | 'categories'>, now = new Date()) =>
  nightAlertsFor(s, nightKey(s.nightAlerts, now));

/** Should Sol ask "¿activo los avisos esta noche?" now: in the two hours before the window, once. */
export function shouldAskTonight(s: Pick<AppState, 'nightAlerts'>, now = new Date()): boolean {
  const n = s.nightAlerts;
  if (!n.askBefore || n.mode === 'quiet') return false;
  if (n.override?.date === keyOf(now)) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  const from = minutesOf(n.from);
  return m >= from - 120 && m < from;
}

// Inbox ----------------------------------------------------------------------------

const since = (now: Date, hours: number) => now.getTime() - hours * 3_600_000;

export const itemsSince = (s: Pick<AppState, 'items'>, t: number) => s.items.filter((i) => new Date(i.receivedAt).getTime() >= t);

export const toReview = (s: Pick<AppState, 'items'>) => s.items.filter((i) => i.review !== 'none');

/** Alerts from the last 12 hours nobody has opened yet. */
export const unseenAlerts = (s: Pick<AppState, 'items'>, now = new Date()) =>
  s.items.filter((i) => i.outcome.kind === 'alerted' && !i.outcome.seenAt && new Date(i.receivedAt).getTime() > now.getTime() - 12 * 3_600_000);

/** Counts for the "everything is in order" line: how much Sol read and sorted today. */
export function todayCounts(s: Pick<AppState, 'items' | 'tasks' | 'events'>, now = new Date()) {
  const start = fromKey(keyOf(now)).getTime();
  const today = itemsSince(s, start);
  return {
    read: today.length,
    whatsapp: today.filter((i) => i.source === 'whatsapp').length,
    email: today.filter((i) => i.source === 'email').length,
    tasks: today.filter((i) => i.outcome.kind === 'task').length,
    events: today.filter((i) => i.outcome.kind === 'event').length,
    ignored: today.filter((i) => i.outcome.kind === 'ignored').length,
    review: today.filter((i) => i.review !== 'none').length,
  };
}

/** Items per category for a time range, biggest first. */
export function byCategory(s: Pick<AppState, 'items' | 'categories'>, items: Item[]) {
  const map = new Map<string, Item[]>();
  for (const i of items) {
    const k = i.categoryId ?? 'none';
    map.set(k, [...(map.get(k) ?? []), i]);
  }
  return [...map.entries()]
    .map(([id, list]) => ({ category: categoryById(s, id), items: list }))
    .sort((a, b) => b.items.length - a.items.length);
}

/** Last night's items: those the night window handled. */
export function lastNightItems(s: Pick<AppState, 'items' | 'nightAlerts'>, now = new Date()): Item[] {
  const night = nightKey(s.nightAlerts, now);
  const start = fromKey(night);
  start.setHours(Math.floor(minutesOf(s.nightAlerts.from) / 60), minutesOf(s.nightAlerts.from) % 60);
  const end = new Date(start.getTime() + ((minutesOf(s.nightAlerts.to) - minutesOf(s.nightAlerts.from) + 1440) % 1440) * 60_000);
  return s.items.filter((i) => {
    const t = new Date(i.receivedAt).getTime();
    return (t >= start.getTime() && t < end.getTime()) || (i.night && t >= since(now, 30));
  });
}

// Tasks ----------------------------------------------------------------------------

const rank = (t: Task) => (t.priority === 'high' ? 0 : t.flagged ? 1 : t.priority === 'medium' ? 2 : 3);

/** Open tasks due today or earlier, most pressing first. */
export function dueToday(s: Pick<AppState, 'tasks'>, now = new Date()): Task[] {
  const today = todayKey(now);
  return s.tasks
    .filter((t) => !t.done && t.date && t.date <= today)
    .sort((a, b) => Number(isOverdue(b, now)) - Number(isOverdue(a, now)) || rank(a) - rank(b) || (a.time ?? '99').localeCompare(b.time ?? '99'));
}

export function openTasks(s: Pick<AppState, 'tasks'>) {
  return s.tasks.filter((t) => !t.done);
}

export type TaskGroup = { id: string; title: string; tasks: Task[]; tone?: 'urgent' };

/** Tasks grouped like Reminders' "Programados": overdue, today, tomorrow, this week, later, no date. */
export function groupTasks(tasks: Task[], now = new Date()): TaskGroup[] {
  const groups: TaskGroup[] = [
    { id: 'overdue', title: 'Vencidas', tasks: [], tone: 'urgent' },
    { id: 'today', title: 'Hoy', tasks: [] },
    { id: 'tomorrow', title: 'Mañana', tasks: [] },
    { id: 'week', title: 'Próximos 7 días', tasks: [] },
    { id: 'later', title: 'Más adelante', tasks: [] },
    { id: 'someday', title: 'Sin fecha', tasks: [] },
  ];
  const get = (id: string) => groups.find((g) => g.id === id)!;
  for (const t of tasks) {
    if (!t.date) get('someday').tasks.push(t);
    else if (isOverdue(t, now)) get('overdue').tasks.push(t);
    else {
      const d = daysFrom(t.date, now);
      get(d <= 0 ? 'today' : d === 1 ? 'tomorrow' : d < 7 ? 'week' : 'later').tasks.push(t);
    }
  }
  for (const g of groups) g.tasks.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '99').localeCompare(b.time ?? '99') || rank(a) - rank(b));
  return groups.filter((g) => g.tasks.length);
}

// Calendar -------------------------------------------------------------------------

export function eventsOn(s: Pick<AppState, 'events' | 'calendars'>, key: string): CalendarEvent[] {
  const start = fromKey(key).getTime();
  const end = start + 86_400_000;
  const visible = new Set(s.calendars.filter((c) => c.visible).map((c) => c.id));
  return s.events
    .filter((e) => visible.has(e.calendarId) && new Date(e.start).getTime() < end && new Date(e.end).getTime() > start)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Next events from now, over `days` days. */
export function upcoming(s: Pick<AppState, 'events' | 'calendars'>, now = new Date(), days = 7): CalendarEvent[] {
  const visible = new Set(s.calendars.filter((c) => c.visible).map((c) => c.id));
  const until = now.getTime() + days * 86_400_000;
  return s.events
    .filter((e) => visible.has(e.calendarId) && new Date(e.end).getTime() > now.getTime() && new Date(e.start).getTime() < until)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export const calendarById = (s: Pick<AppState, 'calendars'>, id: string) => s.calendars.find((c) => c.id === id);

// Summaries -----------------------------------------------------------------------

/** Everything the end-of-day summary needs, for a given day. */
export function dayDigest(s: AppState, key: string, now = new Date()) {
  const start = fromKey(key).getTime();
  const end = start + 86_400_000;
  const arrived = s.items.filter((i) => {
    const t = new Date(i.receivedAt).getTime();
    return t >= start && t < end;
  });
  const done = s.tasks.filter((t) => t.doneAt && new Date(t.doneAt).getTime() >= start && new Date(t.doneAt).getTime() < end);
  const tomorrowKey = addDays(key, 1);
  const tomorrow = s.tasks.filter((t) => !t.done && t.date && t.date <= tomorrowKey).sort((a, b) => rank(a) - rank(b));
  const later = s.tasks.filter((t) => !t.done && (!t.date || t.date > tomorrowKey));
  const meaningful = arrived.filter((i) => i.outcome.kind !== 'ignored');
  return {
    arrived,
    meaningful,
    ignored: arrived.length - meaningful.length,
    done,
    tomorrow,
    later,
    review: toReview(s),
    tomorrowEvents: eventsOn(s, tomorrowKey),
    tonight: nightAlertsFor(s, key),
    groups: byCategory(s, meaningful),
    now,
  };
}
