// What Sol sends by WhatsApp. Pure functions with no React Native imports, so
// server/ can reuse them as-is to build the real messages.
//
// Format rules (WhatsApp):
// - *bold* for the one line that matters, line breaks to scan, no decorative emojis.
// - At most 3 reply buttons per message (interactive "button" messages),
//   each title at most 20 characters.
// - Outside the 24 h window only approved templates can be sent: the morning
//   summary and the alert must be registered as templates in production.

export type WaButton = { id: string; title: string };
export type WaMessage = { kind: 'text' | 'audio'; body: string; buttons?: WaButton[]; from: 'sol' | 'user'; at: string; footer?: string };

export type DigestInput = {
  name: string;
  woke: { time: string; text: string; seenAt?: string; reason: string }[];
  waited: { text: string; due: string }[]; // due already as read in a sentence: "el lunes", "hoy"
  noiseCount: number;
  totalRead: number;
  sleep?: string; // "Dormiste cerca de 6 h 54 min."
  today: string[]; // top tasks
  events: { time: string; title: string }[];
  shadow: boolean;
};

const list = (items: string[]) => items.map((x) => `• ${x}`).join('\n');

export function morningSummary(d: DigestInput): WaMessage[] {
  const head =
    d.woke.length === 0
      ? `*Buenos días, ${d.name}. Anoche no tuve que despertarte.*`
      : `*Buenos días, ${d.name}. Anoche te desperté ${d.woke.length === 1 ? '1 vez' : `${d.woke.length} veces`}.*`;
  const parts = [
    head,
    `Revisé ${d.totalRead} mensajes. ${d.waited.length} quedaron como tarea y ${d.noiseCount} no te necesitaban.`,
    d.sleep ?? '',
    d.woke.length ? `*Te desperté*\n${list(d.woke.map((w) => `${w.time} ${w.text}${w.seenAt ? ` (lo viste ${w.seenAt})` : ''}`))}` : '',
    d.waited.length ? `*Te esperó*\n${list(d.waited.map((w) => `${w.text}: ${w.due}`))}` : '',
    d.today.length ? `*Lo importante de hoy*\n${list(d.today)}` : '',
    d.events.length ? `*Agenda*\n${list(d.events.map((e) => `${e.time} ${e.title}`))}` : '',
  ].filter(Boolean);
  const first: WaMessage = {
    kind: 'text', from: 'sol', at: '07:00', body: parts.join('\n\n'),
    footer: d.shadow ? 'Modo prueba: no silencié nada.' : undefined,
  };
  const ask: WaMessage | null = d.woke[0]
    ? {
        kind: 'text', from: 'sol', at: '07:00',
        body: `¿Hice bien en despertarte por *${d.woke[0].text}*?`,
        buttons: [{ id: 'right', title: 'Bien' }, { id: 'should_not_have_woken', title: 'No debió despertarme' }, { id: 'open', title: 'Ver en la app' }],
      }
    : null;
  return ask ? [first, ask] : [first];
}

export type NightInput = {
  name: string;
  open: number;
  tomorrow: string[];
  guard: boolean;
  watched: string[];
  wakeRules: string[];
  morningAt: string;
};

export function nightClose(n: NightInput): WaMessage[] {
  const body = [
    `*Cierre del día, ${n.name}.*`,
    n.open ? `Quedan ${n.open} cosas abiertas, todas con fecha. No tienes que acordarte de ninguna.` : 'No queda nada abierto.',
    n.tomorrow.length ? `*Mañana*\n${list(n.tomorrow)}` : '',
    n.guard
      ? `*Esta noche estoy de guardia.* Vigilo ${n.watched.join(', ')} y tu correo. Te despierto solo si:\n${list(n.wakeRules.map((r) => r.toLowerCase()))}\nSi no respondes en 3 minutos, te llamo.`
      : `*Esta noche no te voy a despertar.* A las ${n.morningAt} te dejo el resumen.`,
    '¿Algo te da vueltas? Mándame un audio y lo anoto.',
  ].filter(Boolean);
  return [{
    kind: 'text', from: 'sol', at: '22:00', body: body.join('\n\n'),
    buttons: [{ id: 'dump', title: 'Anotar algo' }, { id: 'done', title: 'Listo, a dormir' }],
  }];
}

export type AlertInput = { time: string; text: string; who: string; rule: string };

export function urgentAlert(a: AlertInput): WaMessage[] {
  return [{
    kind: 'text', from: 'sol', at: a.time,
    body: `*Urgente: ${a.text}*\n\n${a.who}, a las ${a.time}.\nTe desperté por tu regla: ${a.rule.toLowerCase()}.\n\nSi no respondes en 3 minutos, te llamo.`,
    buttons: [{ id: 'seen', title: 'Lo vi' }, { id: 'open', title: 'Abrir el detalle' }],
  }];
}

export type DumpInput = { transcript: string; seconds: number; tasks: { title: string; due: string }[] };

export function voiceDump(d: DumpInput): WaMessage[] {
  return [
    { kind: 'audio', from: 'user', at: '22:41', body: `0:${String(d.seconds).padStart(2, '0')}` },
    {
      kind: 'text', from: 'sol', at: '22:41',
      body: `*Anoté ${d.tasks.length} ${d.tasks.length === 1 ? 'tarea' : 'tareas'}:*\n${list(d.tasks.map((t) => `${t.title}: ${t.due}`))}\n\nYa están en tu lista. Puedes soltarlas.`,
      buttons: [{ id: 'ok', title: 'Perfecto' }, { id: 'fix', title: 'Corregir' }, { id: 'open', title: 'Ver en la app' }],
    },
  ];
}
