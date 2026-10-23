// Synthetic data only. Every person, message, system and company is invented.
// Dates are relative to "today" so the demo reads right on any day.
import type {
  CalendarEvent, Connection, Handled, MemoryItem, Profile, Rule, Shift, SleepNight, Task, Training,
} from './types';

const DAY = 24 * 60 * 60 * 1000;

/** ISO for `offset` days from today at "HH:MM" local time. */
export function at(offset: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Date(d.getTime() + offset * DAY).toISOString();
}

/** ISO for `minutes` ago: keeps "last checked" fresh on any day. */
export const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export function dateKey(offset = 0): string {
  const d = new Date(Date.now() + offset * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const profile: Profile = {
  name: 'Rodrigo',
  about: 'Soporte TI con turnos rotativos. Guardia por WhatsApp. Vive con su pareja y su hijo Tomás, de 6 años.',
  goals: ['guardia', 'dormir_mas', 'orden'],
  nightStyle: 'wake_if_urgent',
  morningAt: '07:00',
  eveningAt: '22:00',
  whatsappDigest: true,
  agentMode: 'shadow',
};

export const tasks: Task[] = [
  {
    id: 't1', title: 'Renovar el certificado SSL del portal', detail: 'Vence en 14 días. Proveedor: CertiSur.',
    source: 'email', sourceLabel: 'Correo de alertas SSL', due: { kind: 'date', at: at(3, '10:00'), label: 'Lunes' },
    important: true, why: 'Si vence, el portal de clientes deja de cargar.', done: false, createdAt: at(-1, '03:05'),
  },
  {
    id: 't2', title: 'Revisar lo de la VPN de Ñuñoa con Marcela', detail: 'Se cayó anoche a las 03:05. Ya está arriba.',
    source: 'whatsapp', sourceLabel: 'Marcela, tu jefa', due: { kind: 'today', label: 'Hoy, antes de las 12' },
    important: true, why: 'Te lo pidió tu jefa y fue el incidente de anoche.', done: false, createdAt: at(0, '05:20'),
  },
  {
    id: 't3', title: 'Confirmar el cambio de turno del sábado', detail: 'Javier te pide cambiar la guardia del sábado por el domingo.',
    source: 'whatsapp', sourceLabel: 'Javier, por WhatsApp', due: { kind: 'today', label: 'Hoy' },
    important: true, why: 'Javier necesita la respuesta para organizarse.', done: false, createdAt: at(-1, '18:40'),
  },
  {
    id: 't4', title: 'Resetear la clave de correo de Paula', source: 'whatsapp', sourceLabel: 'Grupo Guardia TI',
    due: { kind: 'today', label: 'Hoy' }, important: false, done: false, createdAt: at(-1, '01:47'),
  },
  {
    id: 't5', title: 'Crear usuario para el ingreso del lunes', source: 'email', sourceLabel: 'Correo de RRHH',
    due: { kind: 'date', at: at(2, '17:00'), label: 'Viernes' }, important: false, done: false, createdAt: at(-1, '04:10'),
  },
  {
    id: 't6', title: 'Comprar el regalo de cumpleaños de Tomás', source: 'voice', sourceLabel: 'Lo dictaste tú',
    due: { kind: 'week', label: 'Esta semana' }, important: false, done: false, createdAt: at(-1, '22:31'),
  },
  {
    id: 't7', title: 'Cambiar el tóner de la impresora del 3er piso', source: 'whatsapp', sourceLabel: 'Grupo Guardia TI',
    due: { kind: 'week', label: 'Esta semana' }, important: false, done: false, createdAt: at(-1, '00:40'),
  },
  {
    id: 't8', title: 'Pedir hora al médico por los ronquidos', detail: 'Lo anotaste en el cierre de la noche.',
    source: 'voice', sourceLabel: 'Lo dictaste tú', due: { kind: 'someday', label: 'Sin fecha' }, important: false, done: false, createdAt: at(-2, '22:40'),
  },
  {
    id: 't9', title: 'Enviar el informe semanal de tickets', source: 'email', sourceLabel: 'Correo de Marcela',
    due: { kind: 'today', label: 'Hoy' }, important: false, done: true, createdAt: at(-1, '09:00'),
  },
];

export const events: CalendarEvent[] = [
  { id: 'e1', title: 'Reunión de equipo TI', start: at(0, '10:00'), end: at(0, '10:30'), kind: 'event', place: 'Meet', source: 'calendar' },
  { id: 'e2', title: 'Buscar a Tomás al colegio', start: at(0, '17:30'), end: at(0, '18:00'), kind: 'personal', source: 'calendar' },
  { id: 'e3', title: 'Guardia nocturna', start: at(0, '23:00'), end: at(1, '07:00'), kind: 'shift', source: 'calendar' },
  { id: 'e4', title: 'Control dental', start: at(1, '11:00'), end: at(1, '11:45'), kind: 'personal', place: 'Clínica Centro', source: 'calendar' },
  { id: 'e5', title: 'Cumpleaños de Tomás', start: at(4, '16:00'), end: at(4, '19:00'), kind: 'personal', source: 'calendar' },
  { id: 'e6', title: 'Mantención servidor de reportes', start: at(2, '21:00'), end: at(2, '22:00'), kind: 'event', source: 'email' },
  { id: 'e7', title: 'Guardia nocturna', start: at(2, '23:00'), end: at(3, '07:00'), kind: 'shift', source: 'calendar' },
];

export const shifts: Shift[] = Array.from({ length: 49 }, (_, i) => i - 14).map((offset) => {
  const pattern: Shift['kind'][] = ['dia', 'dia', 'dia', 'dia', 'dia', 'libre', 'libre'];
  const d = new Date(Date.now() + offset * DAY);
  const kind = pattern[(d.getDay() + 6) % 7];
  const onCall = [0, 2, 4].includes((d.getDay() + 6) % 7); // guard Monday, Wednesday, Friday nights
  return { date: dateKey(offset), kind, start: kind === 'dia' ? '08:30' : undefined, end: kind === 'dia' ? '17:30' : undefined, onCall };
});

/** What the agent handled last night (the morning summary reads from here). */
export const lastNight: Handled[] = [
  {
    id: 'h1', at: at(0, '03:05'), source: 'whatsapp', from: 'Supervisión', group: 'Guardia TI',
    text: 'Se cayó la VPN de la sucursal Ñuñoa, 12 personas sin acceso', title: 'VPN de Ñuñoa caída', ruleId: 'r1', decision: 'wake',
    reason: 'Es un servicio crítico y nunca lo habías visto. Por eso te desperté.', wouldWake: true, seenAt: at(0, '03:06'),
  },
  {
    id: 'h2', at: at(0, '03:09'), source: 'whatsapp', from: 'Diego', group: 'Guardia TI', text: 'Confirmo, la VPN no conecta', title: 'Confirmación de la VPN caída',
    decision: 'noise', reason: 'Mismo incidente de la VPN. No te desperté dos veces.', wouldWake: false,
  },
  {
    id: 'h3', at: at(-1, '01:47'), source: 'whatsapp', from: 'Paula', group: 'Guardia TI', text: 'Necesito resetear mi clave del correo', title: 'Reseteo de clave de Paula', ruleId: 'r5',
    decision: 'report', reason: 'Solicitud de una usuaria. Puede esperar a la mañana.', wouldWake: false, taskId: 't4',
  },
  {
    id: 'h4', at: at(-1, '00:40'), source: 'whatsapp', from: 'Andrés', group: 'Guardia TI', text: 'URGENTE: impresora del 3er piso sin tóner', title: 'Tóner del 3er piso', ruleId: 'r5',
    decision: 'report', reason: 'Dice urgente, pero es rutina.', wouldWake: false, taskId: 't7',
  },
  {
    id: 'h5', at: at(0, '03:05'), source: 'email', from: 'Alertas SSL', text: 'El certificado del portal vence en 14 días', title: 'Certificado SSL por vencer', ruleId: 'r7',
    decision: 'report', reason: 'Tiene plazo. Lo dejé como tarea para el lunes.', wouldWake: false, taskId: 't1',
  },
  {
    id: 'h6', at: at(0, '05:20'), source: 'whatsapp', from: 'Marcela', text: 'Rodrigo, cuando despiertes revisa lo de la VPN porfa', title: 'Marcela pide revisar la VPN', ruleId: 'r6',
    decision: 'report', reason: 'Viene de tu jefa, pero no es urgente.', wouldWake: false, taskId: 't2',
  },
  ...['¿Alguien vio el partido?', 'Jaja buenísimo', 'Buenas noches equipo', 'Gracias Paula', 'Recibido', 'Ok, quedo atento', 'Mañana lo vemos'].map(
    (text, i): Handled => ({
      id: `n${i}`, at: at(-1, `23:${String(10 + i * 5).padStart(2, '0')}`), source: 'whatsapp', from: 'Grupo', group: 'Guardia TI',
      text, decision: 'noise', reason: 'Conversación del grupo.', wouldWake: false,
    }),
  ),
];

export const rules: Rule[] = [
  { id: 'r1', text: 'Un servicio de clientes se cae', kind: 'wake', origin: 'onboarding', confirmed: true, examples: 6 },
  { id: 'r2', text: 'Cualquier cosa de seguridad', kind: 'wake', origin: 'onboarding', confirmed: true, examples: 3 },
  { id: 'r3', text: 'Falla un respaldo con riesgo de perder datos', kind: 'wake', origin: 'onboarding', confirmed: true, examples: 2 },
  { id: 'r4', text: 'Algo nuevo que no reconozco, o no estoy seguro', kind: 'wake', origin: 'default', confirmed: true },
  { id: 'r5', text: 'Solicitudes de usuarios esperan a la mañana', kind: 'wait', origin: 'onboarding', confirmed: true, examples: 41 },
  { id: 'r6', text: 'Lo de Marcela que no diga "urgente" espera', kind: 'wait', origin: 'onboarding', confirmed: true, examples: 9 },
  { id: 'r7', text: 'Avisos con plazo de días se vuelven tarea', kind: 'task', origin: 'onboarding', confirmed: true, examples: 7 },
  { id: 'r8', text: 'Conversación del grupo no se muestra', kind: 'ignore', origin: 'default', confirmed: true },
  { id: 'r9', text: 'Falla un respaldo a fin de mes', kind: 'wake', origin: 'feedback', confirmed: true, examples: 1 },
];

export const memory: MemoryItem[] = [
  { id: 'm1', category: 'vida', text: 'Vives con tu pareja y tu hijo Tomás, de 6 años.', source: 'onboarding', learnedAt: at(-6, '21:00') },
  { id: 'm2', category: 'trabajo', text: 'Trabajas en soporte TI, con turnos que rotan cada semana: día, tarde y noche.', source: 'onboarding', learnedAt: at(-6, '21:00') },
  { id: 'm3', category: 'trabajo', text: 'Tu guardia llega por el grupo "Guardia TI" de WhatsApp.', source: 'whatsapp', learnedAt: at(-6, '21:05') },
  { id: 'm4', category: 'personas', text: 'Marcela es tu jefa. Cuando algo es urgente, lo dice.', source: 'whatsapp', learnedAt: at(-5, '08:00') },
  { id: 'm5', category: 'personas', text: 'Javier y Diego comparten la guardia contigo.', source: 'whatsapp', learnedAt: at(-5, '08:00') },
  { id: 'm6', category: 'horarios', text: 'Esta semana trabajas de día y tienes guardia lunes, miércoles y viernes.', source: 'calendar', learnedAt: at(-2, '07:00') },
  { id: 'm7', category: 'preferencias', text: 'Prefieres el resumen de la mañana por WhatsApp a las 07:00.', source: 'chat', learnedAt: at(-3, '07:10') },
  { id: 'm8', category: 'preferencias', text: 'No quieres que te despierte por impresoras ni claves.', source: 'chat', learnedAt: at(-1, '07:12') },
];

export const training: Training = {
  phase: 'pilot',
  read: { messages: 4812, emails: 1290, months: 3 },
  categories: [
    { id: 'c1', label: 'Caídas de servicio', count: 23, example: '"Se cayó el portal de clientes"' },
    { id: 'c2', label: 'Solicitudes de usuarios', count: 412, example: '"Necesito resetear mi clave"' },
    { id: 'c3', label: 'Pedidos de tu jefa', count: 57, example: '"Cuando puedas revisa..."' },
    { id: 'c4', label: 'Avisos con plazo', count: 31, example: '"Vence en 14 días"' },
    { id: 'c5', label: 'Conversación del grupo', count: 2380, example: '"Jaja buenísimo"' },
  ],
  pilot: { nights: 3, target: 5, agreement: 0.93, missed: 0, tooMany: 2, rated: 44 },
  questions: [
    { id: 'q1', text: '¿Qué es "P1" cuando lo escribe Supervisión?', context: 'Lo vi 4 veces, siempre de madrugada.', options: ['Una urgencia', 'Una sucursal', 'No sé'] },
    { id: 'q2', text: 'Cuando falla un respaldo un fin de mes, ¿te despierto?', context: 'Pasó el 30 de septiembre y contestaste a las 02:10.', options: ['Sí, despiértame', 'No, puede esperar'] },
  ],
};

export const connections: Connection[] = [
  { id: 'whatsapp', name: 'WhatsApp', status: 'connected', detail: '3 chats vigilados', lastCheck: ago(1) },
  { id: 'gmail', name: 'Correo', status: 'connected', detail: 'rodrigo@empresa-demo.cl', lastCheck: ago(2) },
  { id: 'calendar', name: 'Calendario', status: 'connected', detail: 'Turnos y eventos', lastCheck: ago(14) },
  { id: 'slack', name: 'Slack', status: 'off', detail: 'No conectado' },
];

// Estimated without asking him anything: last phone use, first phone use, watch if present.
// The trend is the story: since Sol took the guard (day -3), he goes to bed earlier.
export const sleep: SleepNight[] = [-6, -5, -4, -3, -2, -1, 0].map((offset, i) => ({
  date: dateKey(offset),
  bed: ['00:48', '00:31', '23:58', '23:52', '23:35', '23:20', '23:05'][i],
  wake: '06:30',
  hours: [5.4, 5.7, 6.2, 6.4, 6.6, 6.9, 7.1][i],
  woke: [2, 2, 1, 1, 0, 1, 1][i],
  source: 'estimado',
}));

export const watchedChats = [
  { id: 'w1', name: 'Guardia TI', kind: 'grupo', on: true },
  { id: 'w2', name: 'Marcela (jefa)', kind: 'persona', on: true },
  { id: 'w3', name: 'Equipo Soporte', kind: 'grupo', on: true },
  { id: 'w4', name: 'Familia', kind: 'grupo', on: false },
];
