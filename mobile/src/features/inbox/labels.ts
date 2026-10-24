import type { LucideIcon } from 'lucide-react-native';
import { BellRing, CalendarPlus, CircleCheck, FileText, VolumeX } from 'lucide-react-native';
import { timeOf } from '../../data/dates';
import type { CategoryAction, Item } from '../../data/types';

export const ACTIONS: { id: CategoryAction; label: string; detail: string; icon: LucideIcon }[] = [
  { id: 'alert', label: 'Avisarme al tiro', detail: 'Notificación inmediata. De noche, solo si esta categoría puede despertarte.', icon: BellRing },
  { id: 'task', label: 'Crear una tarea', detail: 'Queda en Tareas con fecha, y el mensaje original adjunto.', icon: CircleCheck },
  { id: 'calendar', label: 'Agendar', detail: 'Si trae día y hora, lo agrego a tu calendario.', icon: CalendarPlus },
  { id: 'digest', label: 'Dejar en el resumen', detail: 'No te interrumpo: aparece en el resumen de la mañana o de la tarde.', icon: FileText },
  { id: 'ignore', label: 'Silenciar', detail: 'Lo leo y lo archivo. Sigue en la bandeja si lo buscas.', icon: VolumeX },
];

export const actionLabel = (a: CategoryAction) => ACTIONS.find((x) => x.id === a)?.label ?? '';
export const actionIcon = (a: CategoryAction) => ACTIONS.find((x) => x.id === a)?.icon ?? FileText;

export type OutcomeLook = { label: string; icon: LucideIcon; tone: 'urgent' | 'muted' | 'sol' | 'calm' };

/** What Sol did with an item, in two or three words. */
export function outcomeOf(item: Item): OutcomeLook {
  if (item.review !== 'none') return { label: 'Por confirmar', icon: FileText, tone: 'sol' };
  switch (item.outcome.kind) {
    case 'alerted': return { label: `Te avisó ${timeOf(item.receivedAt)}`, icon: BellRing, tone: 'urgent' };
    case 'task': return { label: 'Tarea creada', icon: CircleCheck, tone: 'calm' };
    case 'event': return { label: 'En tu agenda', icon: CalendarPlus, tone: 'calm' };
    case 'digest': return { label: 'En el resumen', icon: FileText, tone: 'muted' };
    case 'ignored': return { label: 'Silenciado', icon: VolumeX, tone: 'muted' };
  }
}

export const sourceLabel = (s: Item['source']) => (s === 'email' ? 'Correo' : s === 'calendar' ? 'Calendario' : 'WhatsApp');
