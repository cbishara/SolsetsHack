// Builds what one day looks like in the Agenda: events, shifts and dated tasks
// in one timeline. Works the same for someone without shifts.
import { keyOf, weekOf } from '../../components/week-strip';
import type { CalendarEvent, Shift, SourceId, Task } from '../../data/types';

export type DayItem =
  | { kind: 'shift'; id: string; title: string; start: string; end: string; detail: string; onCall: boolean; source: SourceId }
  | { kind: 'event'; id: string; title: string; start: string; end: string; place?: string; personal: boolean; source: SourceId }
  | { kind: 'task'; id: string; task: Task; time?: string };

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const DAY = 24 * 60 * 60 * 1000;

export function taskDayKey(t: Task, now = new Date()): string | null {
  if (t.due.kind === 'today') return keyOf(now);
  if (t.due.kind === 'tomorrow') return keyOf(t.due.at ? new Date(t.due.at) : new Date(now.getTime() + DAY));
  if (t.due.kind === 'date' && t.due.at) return keyOf(new Date(t.due.at));
  return null;
}

export function itemsFor(key: string, events: CalendarEvent[], shifts: Shift[], tasks: Task[]): DayItem[] {
  const out: DayItem[] = [];
  const shift = shifts.find((s) => s.date === key);

  if (shift && shift.kind !== 'libre' && shift.start && shift.end) {
    const name = { dia: 'Turno de día', tarde: 'Turno de tarde', noche: 'Turno de noche' }[shift.kind];
    out.push({ kind: 'shift', id: `shift-${key}`, title: name, start: shift.start, end: shift.end, detail: 'En la oficina', onCall: false, source: 'calendar' });
  }

  const dayEvents = events.filter((e) => keyOf(new Date(e.start)) === key);
  for (const e of dayEvents) {
    if (e.kind === 'shift') {
      out.push({ kind: 'shift', id: e.id, title: e.title, start: hhmm(e.start), end: hhmm(e.end), detail: 'Sol vigila contigo', onCall: true, source: e.source });
    } else {
      out.push({ kind: 'event', id: e.id, title: e.title, start: hhmm(e.start), end: hhmm(e.end), place: e.place, personal: e.kind === 'personal', source: e.source });
    }
  }

  // An on-call night from the shift calendar without its own event still shows up.
  if (shift?.onCall && !dayEvents.some((e) => e.kind === 'shift')) {
    out.push({ kind: 'shift', id: `guard-${key}`, title: 'Guardia nocturna', start: '23:00', end: '07:00', detail: 'Sol vigila contigo', onCall: true, source: 'calendar' });
  }

  for (const t of tasks) {
    if (taskDayKey(t) !== key) continue;
    const time = t.due.kind === 'date' && t.due.at ? hhmm(t.due.at) : undefined;
    out.push({ kind: 'task', id: t.id, task: t, time: time === '00:00' ? undefined : time });
  }

  const startOf = (i: DayItem) => (i.kind === 'task' ? i.time ?? '99:98' : i.start);
  return out.sort((a, b) => startOf(a).localeCompare(startOf(b)));
}

/** "Esta semana: 3 guardias y el cumpleaños de Tomás el martes." */
export function weekSummary(anchor: Date, events: CalendarEvent[], shifts: Shift[], tasks: Task[]): string {
  const keys = weekOf(anchor).map(keyOf);
  const guardDays = new Set<string>();
  for (const s of shifts) if (keys.includes(s.date) && s.onCall) guardDays.add(s.date);
  for (const e of events) if (e.kind === 'shift' && keys.includes(keyOf(new Date(e.start)))) guardDays.add(keyOf(new Date(e.start)));
  const personal = events
    .filter((e) => e.kind === 'personal' && keys.includes(keyOf(new Date(e.start))) && /cumple|aniversario|viaje/i.test(e.title))
    .map((e) => `${e.title.charAt(0).toLowerCase()}${e.title.slice(1)} el ${new Date(e.start).toLocaleDateString('es-CL', { weekday: 'long' })}`);
  const dated = tasks.filter((t) => !t.done && keys.includes(taskDayKey(t) ?? '')).length;

  const parts: string[] = [];
  if (guardDays.size) parts.push(`${guardDays.size} ${guardDays.size === 1 ? 'guardia' : 'guardias'}`);
  if (dated) parts.push(`${dated} ${dated === 1 ? 'tarea con fecha' : 'tareas con fecha'}`);
  parts.push(...personal);
  if (!parts.length) return 'Semana tranquila. No hay nada agendado.';
  const last = parts.pop();
  return `${parts.length ? `${parts.join(', ')} y ${last}` : last}.`;
}
