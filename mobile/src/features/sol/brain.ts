// What Sol can answer on the phone while the agent (agent/, through server/)
// is not connected: questions about the person's own data and turning what
// they say into tasks. When the agent answers, its reply replaces this one.
import { addDays, dayLabel, keyOf, timeOf, todayKey, weekOf } from '../../data/dates';
import { dumpToTasks } from '../../data/dump';
import { dayDigest, dueToday, eventsOn, nightAlertsFor, nightKey, toReview } from '../../data/select';
import type { Action, AppState } from '../../data/store';
import type { SourceId, Task } from '../../data/types';

export type Reply = { text: string; tasks?: Task[]; events?: string[]; actions?: Action[] };

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** First letter down, the rest as written: proper nouns and acronyms survive ("VPN de Ñuñoa con Marcela"). */
const lowerFirst = (s: string) => (/^[A-ZÁÉÍÓÚÑ]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

function agendaFor(s: AppState, key: string, now: Date): Reply {
  const events = eventsOn(s, key).filter((e) => !e.allDay && keyOf(new Date(e.start)) === key);
  const tasks = s.tasks.filter((t) => !t.done && t.date === key);
  const label = dayLabel(key, now);
  const night = nightAlertsFor(s, key);
  if (!events.length && !tasks.length) return { text: `${label} no tienes nada agendado.${night.on ? ` En la noche los avisos quedan activos de ${night.from} a ${night.to}.` : ''}` };
  const parts = [];
  if (events.length) parts.push(`${events.length === 1 ? 'un evento' : `${events.length} eventos`}: ${list(events.map((e) => `${e.title} a las ${timeOf(e.start)}`))}`);
  if (tasks.length) parts.push(`${tasks.length === 1 ? 'una tarea' : `${tasks.length} tareas`}${tasks.some((t) => t.priority === 'high' || t.flagged) ? `, la más importante es ${lowerFirst(tasks.find((t) => t.priority === 'high' || t.flagged)!.title)}` : ''}`);
  return {
    text: `${label} tienes ${parts.join(' y ')}.${night.on ? ` En la noche, avisos activos de ${night.from} a ${night.to}.` : ''}`,
    events: events.map((e) => e.id),
    tasks,
  };
}

export function think(s: AppState, input: string, via: 'text' | 'voice', now = new Date()): Reply {
  const t = plain(input.trim());
  const today = todayKey(now);

  // Night alerts, by voice or text: "activa los avisos esta noche", "esta noche no me despiertes".
  if (/(activa|prende|enciende).*(aviso|alerta)|despiertame (si|esta noche)|tengo (guardia|turno) (hoy|esta noche)/.test(t)) {
    const n = nightKey(s.nightAlerts, now);
    const wakers = s.categories.filter((c) => c.status === 'active' && c.wakeAtNight).map((c) => c.name);
    return { text: `Listo. Esta noche los avisos quedan activos de ${s.nightAlerts.from} a ${s.nightAlerts.to}, solo por ${list(wakers) || 'lo urgente'}.`, actions: [{ type: 'setNightAlerts', patch: { override: { date: n, on: true } } }] };
  }
  if (/(apaga|desactiva|quita).*(aviso|alerta)|no me despiertes|esta noche no/.test(t)) {
    const n = nightKey(s.nightAlerts, now);
    return { text: `Hecho. Esta noche no te interrumpo: lo que llegue queda para el resumen de las ${s.summaries.morning.at}.`, actions: [{ type: 'setNightAlerts', patch: { override: { date: n, on: false } } }] };
  }

  // Agenda questions.
  const asksAgenda = /(que|cual|como) (tengo|hay|es mi)|mi (dia|agenda|semana)|que me toca/.test(t) && !/tengo que|hay que/.test(t);
  if (asksAgenda) {
    if (/semana/.test(t)) {
      const days = weekOf(today).filter((k) => k >= today);
      const events = days.flatMap((k) => eventsOn(s, k).filter((e) => !e.allDay && keyOf(new Date(e.start)) === k));
      return { text: `De aquí al domingo tienes ${events.length} ${events.length === 1 ? 'evento' : 'eventos'}${events.length ? `: ${list(events.slice(0, 5).map((e) => `${e.title} (${lowerFirst(dayLabel(keyOf(new Date(e.start)), now))})`))}` : ''}.`, events: events.slice(0, 5).map((e) => e.id) };
    }
    return agendaFor(s, /manana/.test(t) ? addDays(today, 1) : today, now);
  }

  // "Resume lo de hoy" / "¿cómo va el día?"
  if (/resum|como va (el|mi) dia|que paso hoy|que llego hoy/.test(t)) {
    const d = dayDigest(s, today, now);
    const top = d.groups.filter((g) => g.category).slice(0, 3).map((g) => `${g.items.length} de ${g.category!.name}`);
    return {
      text: `Hoy llegaron ${d.arrived.length} mensajes${top.length ? ` (${list(top)})` : ''}. Terminaste ${d.done.length} ${d.done.length === 1 ? 'tarea' : 'tareas'} y quedan ${d.tomorrow.length} para mañana.${d.review.length ? ` Tengo ${d.review.length} ${d.review.length === 1 ? 'cosa' : 'cosas'} por confirmar en la bandeja.` : ''}`,
      tasks: d.tomorrow.slice(0, 4),
    };
  }

  // "¿Qué llegó de Marcela?" / "¿algo de Javier?"
  const from = t.match(/(?:de|llego de|algo de|escribio|mando)\s+([a-zñ]+)/);
  if (from && /(llego|algo|escribio|mando|mensaje|correo)/.test(t)) {
    const who = from[1];
    const items = s.items.filter((i) => plain(i.from.name).includes(who) && i.outcome.kind !== 'ignored').slice(0, 4);
    if (items.length) return { text: `De ${items[0].from.name} llegaron ${items.length === 1 ? 'esto' : `${items.length} cosas`}: ${list(items.map((i) => lowerFirst(i.summary)))}.` };
    return { text: `No veo nada de "${who}" en lo que leo. ¿Me dices cómo aparece el nombre?` };
  }

  // "¿Qué tengo pendiente?" / "¿qué es urgente?"
  if (/pendiente|me falta|urgente|importante/.test(t) && !/tengo que/.test(t)) {
    const due = dueToday(s, now);
    const review = toReview(s).length;
    if (!due.length) return { text: `No te queda nada vencido ni para hoy.${review ? ` Solo ${review} ${review === 1 ? 'cosa' : 'cosas'} por confirmar en la bandeja.` : ''}` };
    return { text: `Para hoy te quedan ${due.length}. Lo más urgente: ${lowerFirst(due[0].title)}.`, tasks: due.slice(0, 5) };
  }

  // Everything else: unload it into tasks with dates.
  const source: SourceId = via === 'voice' ? 'voice' : 'you';
  const { reply, tasks } = dumpToTasks(input, source, now);
  if (tasks.length) return { text: `${reply} ${tasks.some((x) => !x.date) ? 'Las que no tienen fecha quedan en "Sin fecha".' : ''}`.trim(), tasks, actions: [{ type: 'addTasks', tasks }] };
  return { text: 'Te escucho. Puedes preguntarme por tu día o tu semana, pedirme un resumen, activar los avisos de esta noche o dictarme lo que tengas pendiente.' };
}

/** Suggestions for the empty chat, based on the time of day and what is open. */
export function suggestions(s: AppState, now = new Date()): string[] {
  const h = now.getHours();
  const out: string[] = [];
  if (h < 12) out.push('¿Qué tengo hoy?');
  if (h >= 17) out.push('Resume lo de hoy', '¿Qué tengo mañana?');
  else out.push('¿Qué tengo mañana?');
  const boss = s.people.find((p) => p.importance === 'high');
  if (boss) out.push(`¿Qué llegó de ${boss.name.split(' ')[0]}?`);
  if (h >= 18) out.push('Activa los avisos esta noche');
  out.push('Mañana llamar al dentista a las 10');
  return [...new Set(out)].slice(0, 4);
}
