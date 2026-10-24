import type { Due, SourceId, Task } from '../../data/types';

export type GroupId = 'today' | 'tomorrow' | 'week' | 'later' | 'someday';

export const GROUPS: { id: GroupId; label: string; empty: string }[] = [
  { id: 'today', label: 'Hoy', empty: 'Nada más para hoy. Si te llega algo, lo pongo aquí.' },
  { id: 'tomorrow', label: 'Mañana', empty: 'Mañana está despejado por ahora.' },
  { id: 'week', label: 'Esta semana', empty: 'Nada pendiente para el resto de la semana.' },
  { id: 'later', label: 'Más adelante', empty: 'Nada agendado más adelante.' },
  { id: 'someday', label: 'Sin fecha', empty: 'Lo que me dictes sin fecha queda aquí, para cuando tengas un rato.' },
];

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };

/** Which list a task belongs to, from its due date. */
export function groupOf(due: Due, now = new Date()): GroupId {
  if (due.kind === 'today') return 'today';
  if (due.kind === 'tomorrow') return 'tomorrow';
  if (due.kind === 'week') return 'week';
  if (due.kind === 'someday') return 'someday';
  if (!due.at) return 'someday';
  const diff = Math.round((startOfDay(new Date(due.at)) - startOfDay(now)) / DAY);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'tomorrow';
  const daysToSunday = (7 - now.getDay()) % 7;
  return diff <= daysToSunday ? 'week' : 'later';
}

export type SourceFilter = 'all' | 'whatsapp' | 'email' | 'you';

export function matches(task: Task, filter: SourceFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'you') return (['you', 'voice'] as SourceId[]).includes(task.source);
  return task.source === filter;
}

/** Due chips offered in the task detail. */
export function dueFor(kind: 'today' | 'tomorrow' | 'week' | 'someday', now = new Date()): Due {
  switch (kind) {
    case 'today': return { kind: 'today', label: 'Hoy' };
    case 'tomorrow': return { kind: 'tomorrow', at: new Date(now.getTime() + DAY).toISOString(), label: 'Mañana' };
    case 'week': return { kind: 'week', label: 'Esta semana' };
    case 'someday': return { kind: 'someday', label: 'Sin fecha' };
  }
}
