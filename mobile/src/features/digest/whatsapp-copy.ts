// What Sol sends by WhatsApp. Pure functions with no React Native imports, so
// server/ can reuse them as-is to build the real messages.
//
// Format rules (WhatsApp):
// - *bold* for the one line that matters, line breaks to scan, no decorative emojis.
// - At most 3 reply buttons per message (interactive "button" messages),
//   each title at most 20 characters.
// - Outside the 24 h window only approved templates can be sent: the summaries,
//   the question before bed and the alert must be registered as templates.
// - Facts only: say what happened and how alerts are set, never promise what
//   nobody knows yet ("no te voy a despertar").

export type WaButton = { id: string; title: string };
export type WaMessage = { kind: 'text' | 'audio'; body: string; buttons?: WaButton[]; from: 'sol' | 'user'; at: string; footer?: string };

const list = (items: string[]) => items.map((x) => `• ${x}`).join('\n');
const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

// Morning --------------------------------------------------------------------------

export type MorningInput = {
  name: string;
  at: string; // "07:00"
  alerted: { time: string; text: string; seenAt?: string }[];
  /** What arrived overnight and became a task: "Clave de Paula: hoy". */
  waited: { text: string; due: string }[];
  silenced: number;
  totalRead: number;
  sleep?: string;
  today: string[];
  events: { time: string; title: string }[];
  review: number;
  shadow: boolean;
};

export function morningSummary(d: MorningInput): WaMessage[] {
  const head = d.alerted.length === 0
    ? `*Buenos días, ${d.name}. Anoche no hubo nada urgente.*`
    : `*Buenos días, ${d.name}. Anoche te avisé ${d.alerted.length === 1 ? '1 vez' : `${d.alerted.length} veces`}.*`;
  const parts = [
    head,
    `Revisé ${n(d.totalRead, 'mensaje', 'mensajes')} de noche: ${n(d.waited.length, 'quedó como tarea', 'quedaron como tareas')} y ${n(d.silenced, 'no pedía nada', 'no pedían nada')}.`,
    d.sleep ?? '',
    d.alerted.length ? `*Te avisé*\n${list(d.alerted.map((w) => `${w.time} ${w.text}${w.seenAt ? ` (lo viste ${w.seenAt})` : ''}`))}` : '',
    d.waited.length ? `*Te esperó*\n${list(d.waited.map((w) => `${w.text}: ${w.due}`))}` : '',
    d.today.length ? `*Lo importante de hoy*\n${list(d.today)}` : '',
    d.events.length ? `*Agenda*\n${list(d.events.map((e) => `${e.time} ${e.title}`))}` : '',
    d.review ? `Tengo ${n(d.review, 'cosa', 'cosas')} que no supe clasificar. Te las dejé en la app.` : '',
  ].filter(Boolean);
  const first: WaMessage = { kind: 'text', from: 'sol', at: d.at, body: parts.join('\n\n'), footer: d.shadow ? 'Modo prueba: no silencié nada.' : undefined };
  const ask: WaMessage | null = d.alerted[0]
    ? {
        kind: 'text', from: 'sol', at: d.at,
        body: `¿Estuvo bien avisarte por *${d.alerted[0].text}*?`,
        buttons: [{ id: 'right', title: 'Bien' }, { id: 'should_not_have_woken', title: 'No era para avisar' }, { id: 'open', title: 'Ver en la app' }],
      }
    : null;
  return ask ? [first, ask] : [first];
}

// End of the day ---------------------------------------------------------------------

export type DayInput = {
  name: string;
  at: string; // "19:00"
  arrived: number;
  /** "Caída de servicio: 4", biggest first. */
  byCategory: { name: string; count: number }[];
  done: string[];
  tomorrow: string[];
  firstTomorrow?: { time: string; title: string };
  tonight: { on: boolean; from: string; to: string; wakers: string[]; morningAt: string };
};

export function daySummary(d: DayInput): WaMessage[] {
  const body = [
    `*Resumen del día, ${d.name}.*`,
    `Hoy llegaron ${n(d.arrived, 'mensaje', 'mensajes')}${d.byCategory.length ? `: ${d.byCategory.slice(0, 4).map((c) => `${c.count} de ${c.name}`).join(', ')}` : ''}.`,
    d.done.length ? `*Terminaste*\n${list(d.done.slice(0, 5))}` : '',
    d.tomorrow.length ? `*Queda para mañana*\n${list(d.tomorrow.slice(0, 6))}` : '*Mañana empiezas sin pendientes.*',
    d.firstTomorrow ? `Tu día empieza a las ${d.firstTomorrow.time} con ${d.firstTomorrow.title}.` : '',
    d.tonight.on
      ? `Esta noche los avisos están activos de ${d.tonight.from} a ${d.tonight.to}. Solo te aviso por ${d.tonight.wakers.join(' o ') || 'lo que marcaste como urgente'}; lo demás queda para las ${d.tonight.morningAt}.`
      : `Esta noche no hay avisos: lo que llegue queda para el resumen de las ${d.tonight.morningAt}.`,
    '¿Te queda algo en la cabeza? Respóndeme con un audio o un texto y lo anoto.',
  ].filter(Boolean);
  return [{ kind: 'text', from: 'sol', at: d.at, body: body.join('\n\n'), buttons: [{ id: 'dump', title: 'Anotar algo' }, { id: 'open', title: 'Ver en la app' }, { id: 'done', title: 'Listo por hoy' }] }];
}

// Before bed ---------------------------------------------------------------------------

export type TonightInput = { at: string; from: string; to: string; because?: string; wakers: string[] };

/** The guard question, for anyone: one tap and Sol knows how to treat the night. */
export function tonightQuestion(t: TonightInput): WaMessage[] {
  return [{
    kind: 'text', from: 'sol', at: t.at,
    body: `*¿Activo los avisos esta noche?*\n\nDe ${t.from} a ${t.to}, solo por ${t.wakers.join(' o ') || 'lo urgente'}.${t.because ? `\n${t.because}.` : ''}`,
    buttons: [{ id: 'on', title: 'Sí, activar' }, { id: 'off', title: 'No, esta noche no' }],
  }];
}

// Alert ----------------------------------------------------------------------------------

export type AlertInput = { time: string; text: string; who: string; category: string; callAfterMin?: number };

export function urgentAlert(a: AlertInput): WaMessage[] {
  return [{
    kind: 'text', from: 'sol', at: a.time,
    body: `*Urgente: ${a.text}*\n\n${a.who}, a las ${a.time}.\nTe aviso porque es de *${a.category}*, que marcaste como urgente.${a.callAfterMin ? `\n\nSi no respondes en ${a.callAfterMin} min, te llamo.` : ''}`,
    buttons: [{ id: 'seen', title: 'Lo vi' }, { id: 'open', title: 'Abrir el detalle' }],
  }];
}

// Voice note --------------------------------------------------------------------------------

export type DumpInput = { at: string; seconds: number; tasks: { title: string; due: string }[] };

export function voiceDump(d: DumpInput): WaMessage[] {
  return [
    { kind: 'audio', from: 'user', at: d.at, body: `0:${String(d.seconds).padStart(2, '0')}` },
    {
      kind: 'text', from: 'sol', at: d.at,
      body: `*Anoté ${n(d.tasks.length, 'tarea', 'tareas')}:*\n${list(d.tasks.map((t) => `${t.title}: ${t.due}`))}\n\nYa están en tu lista, con fecha.`,
      buttons: [{ id: 'ok', title: 'Perfecto' }, { id: 'fix', title: 'Corregir' }, { id: 'open', title: 'Ver en la app' }],
    },
  ];
}
