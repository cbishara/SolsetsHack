// Local stand-in for the agent's "descarga": turns free text into dated tasks.
// The real one lives in agent/ (Quito, issue #14). Same input and output, so
// the screen does not change when it is connected.
import type { DumpResult, Due, SourceId, Task } from './types';

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const VERBS =
  'llamar|comprar|mandar|enviar|revisar|pagar|pedir|ir|hablar|renovar|responder|contestar|buscar|agendar|escribir|preparar|terminar|hacer|sacar|retirar|cambiar|confirmar|reservar|recordar|avisar|limpiar|ordenar|estudiar|leer|resetear|crear|ver';
const LEAD = '(?:tengo que|hay que|debo|necesito|me falta|acuérdame de|acuerdame de|acordarme de|recuérdame|recuerdame)';
const WHEN = `(?:hoy|mañana|manana|pasado mañana|esta tarde|esta noche|esta semana|el (?:${WEEKDAYS.join('|')}|miercoles|sabado))`;

/** Splits a dump into separate to-dos at punctuation, and at "y" when another action follows. */
export function splitDump(text: string): string[] {
  const nextAction = new RegExp(`\\s+y\\s+(?=(?:${WHEN}\\s+)?(?:${LEAD}\\s+)?(?:${VERBS})\\b)`, 'i');
  return text
    .split(/\n|;|,|\.\s/)
    .flatMap((part) => part.split(nextAction))
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function dueIn(text: string, now: Date): Due | null {
  const t = plain(text);
  if (/\bhoy\b|esta tarde|esta noche/.test(t)) return { kind: 'today', label: 'Hoy' };
  if (/pasado manana/.test(t)) return { kind: 'date', at: new Date(now.getTime() + 2 * DAY).toISOString(), label: 'Pasado mañana' };
  if (/\bmanana\b/.test(t)) return { kind: 'tomorrow', at: new Date(now.getTime() + DAY).toISOString(), label: 'Mañana' };
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${plain(WEEKDAYS[i])}\\b`).test(t)) {
      const ahead = (i - now.getDay() + 7) % 7 || 7;
      return { kind: 'date', at: new Date(now.getTime() + ahead * DAY).toISOString(), label: WEEKDAYS[i][0].toUpperCase() + WEEKDAYS[i].slice(1) };
    }
  }
  if (/esta semana|antes del (viernes|fin de semana)/.test(t)) return { kind: 'week', label: 'Esta semana' };
  return null;
}

/** "Mañana tengo que llamar al dentista" → "Llamar al dentista". */
function titleOf(part: string): string {
  let s = part.trim();
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(/^(y|también|tambien|además|ademas|o sea)\s+/i, '')
      .replace(new RegExp(`^${WHEN}\\s+`, 'i'), '')
      .replace(new RegExp(`^${LEAD}\\s+`, 'i'), '')
      .trim();
  }
  s = s.replace(new RegExp(`\\s+${WHEN}$`, 'i'), '').replace(/[.!]+$/, '').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function dumpToTasks(text: string, source: SourceId = 'you', now = new Date()): DumpResult {
  let carried: Due | null = null; // a date said first applies to what follows
  const tasks: Task[] = [];
  splitDump(text).forEach((part, i) => {
    const own = dueIn(part, now);
    if (own) carried = own;
    const title = titleOf(part);
    if (title.length < 3) return;
    tasks.push({
      id: `d${now.getTime()}-${i}`,
      title,
      source,
      sourceLabel: source === 'voice' ? 'Lo dictaste tú' : 'Lo escribiste tú',
      due: own ?? carried ?? { kind: 'someday', label: 'Sin fecha' },
      important: false,
      done: false,
      createdAt: now.toISOString(),
    });
  });
  const reply = !tasks.length
    ? 'No encontré tareas en eso. ¿Me lo cuentas de otra forma?'
    : tasks.length === 1
      ? 'Anotado. Lo dejé en tus tareas.'
      : `Anoté ${tasks.length} tareas y les puse fecha. Puedes soltarlas, yo me acuerdo.`;
  return { reply, tasks };
}
