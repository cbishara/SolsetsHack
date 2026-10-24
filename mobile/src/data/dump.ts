// Local stand-in for the agent's "descarga": turns free text into dated tasks.
// The real one lives in agent/ (Quito, issue #14). Same input and output, so
// the screen does not change when it is connected.
import { addDays, keyOf } from './dates';
import type { DumpResult, SourceId, Task } from './types';

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

export type When = { date?: string; time?: string; matched: string[] };

const TIME = /\b(?:a las|a la|tipo|como a las)\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|hrs|horas|de la tarde|de la mañana|de la manana|de la noche)?/i;

/** Dates and times said in a sentence: "mañana a las 10", "el viernes", "esta tarde". */
export function parseWhen(text: string, now = new Date()): When {
  const t = plain(text);
  const today = keyOf(now);
  const matched: string[] = [];
  let date: string | undefined;
  let time: string | undefined;
  const hit = (re: RegExp) => {
    const m = text.match(re);
    if (m) matched.push(m[0]);
    return !!m;
  };
  if (/pasado manana/.test(t)) { date = addDays(today, 2); hit(/pasado ma[ñn]ana/i); }
  else if (/\bmanana\b/.test(t)) { date = addDays(today, 1); hit(/\bma[ñn]ana\b/i); }
  else if (/\bhoy\b/.test(t)) { date = today; hit(/\bhoy\b/i); }
  else if (/esta tarde/.test(t)) { date = today; time = '18:00'; hit(/esta tarde/i); }
  else if (/esta noche/.test(t)) { date = today; time = '21:00'; hit(/esta noche/i); }
  else if (/esta semana|antes del fin de semana/.test(t)) {
    const toFriday = (5 - now.getDay() + 7) % 7;
    date = addDays(today, toFriday); hit(/esta semana|antes del fin de semana/i);
  } else {
    for (let i = 0; i < 7; i++) {
      const re = new RegExp(`\\b(?:el\\s+)?${plain(WEEKDAYS[i])}\\b`);
      if (re.test(t)) {
        const ahead = (i - now.getDay() + 7) % 7 || 7;
        date = addDays(today, ahead);
        hit(new RegExp(`\\b(?:el\\s+)?${WEEKDAYS[i].replace('é', '[eé]').replace('á', '[aá]')}\\b`, 'i'));
        break;
      }
    }
  }
  const tm = text.match(TIME);
  if (tm) {
    let h = Number(tm[1]);
    const m = tm[2] ? Number(tm[2]) : 0;
    const mer = (tm[3] ?? '').toLowerCase();
    if ((mer === 'pm' || mer.includes('tarde') || mer.includes('noche')) && h < 12) h += 12;
    // "a las 4" during the day most likely means the afternoon
    if (!mer && h >= 1 && h <= 7) h += 12;
    if (h < 24 && m < 60) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      matched.push(tm[0]);
      if (!date) date = today;
    }
  }
  return { date, time, matched };
}

/** Removes the date words from a title: "Llamar al dentista mañana a las 10" → "Llamar al dentista". */
export function stripWhen(title: string, when: When): string {
  let s = title;
  for (const m of when.matched) s = s.replace(m, ' ');
  s = s.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
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
  let carried: When | null = null; // a date said first applies to what follows
  const tasks: Task[] = [];
  splitDump(text).forEach((part, i) => {
    const own = parseWhen(part, now);
    if (own.date) carried = own;
    const title = titleOf(part);
    if (title.length < 3) return;
    const when = own.date ? own : carried;
    tasks.push({
      id: `d${now.getTime()}-${i}`,
      title: stripWhen(title, own),
      source,
      sourceLabel: source === 'voice' ? 'Nota de voz' : 'Lo anotaste tú',
      date: when?.date,
      time: when?.time,
      reminder: when?.time ? 'at' : 'none',
      repeat: 'never',
      priority: 'none',
      flagged: false,
      done: false,
      createdAt: now.toISOString(),
    });
  });
  const dated = tasks.filter((t) => t.date).length;
  const reply = !tasks.length
    ? 'No encontré tareas en eso. ¿Me lo cuentas de otra forma?'
    : tasks.length === 1
      ? `Anotado: "${tasks[0].title}".`
      : `Anoté ${tasks.length} tareas${dated ? `, ${dated === tasks.length ? 'todas' : dated} con fecha` : ''}.`;
  return { reply, tasks };
}
