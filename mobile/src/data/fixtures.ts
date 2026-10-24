// Synthetic data only. Every person, message, company and system is invented.
// Dates are relative to "today" so the demo reads right on any day.
// This is example data for one invented person; nothing in the app's copy
// depends on it: screens read whatever the store holds.
import type {
  AgentQuestion, Calendar, CalendarEvent, Category, Connection, Item, MemoryItem, NightAlerts, Person, Profile,
  Rule, SleepNight, SummarySettings, Task, Training, WatchedChat,
} from './types';

const DAY = 24 * 60 * 60 * 1000;

/** ISO for `offset` days from today at "HH:MM" local time. */
export function at(offset: number, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Date(d.getTime() + offset * DAY).toISOString();
}

/**
 * Today at "HH:MM", but never in the future: before that hour it becomes
 * `fallback` minutes ago, so the example inbox reads right at any time of day.
 */
export function earlier(hhmm: string, fallback: number): string {
  const t = at(0, hhmm);
  return new Date(t).getTime() < Date.now() ? t : new Date(Date.now() - fallback * 60_000).toISOString();
}

/** ISO for `minutes` ago: keeps "last checked" fresh on any day. */
export const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export function dateKey(offset = 0): string {
  const d = new Date(Date.now() + offset * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const profile: Profile = {
  name: 'Rodrigo',
  fullName: 'Rodrigo Saavedra',
  role: 'Soporte TI',
  about: 'Trabajas en soporte TI en Andes Retail, con turnos que rotan y guardias nocturnas por WhatsApp. Vives con Carolina y su hijo Tomás, de 6 años.',
  goals: ['guardia', 'dormir_mas', 'orden'],
  workdayEnd: '18:30',
  agentMode: 'shadow',
  pilot: { startedAt: at(-4, '21:00'), days: 14 },
};

// Categories -------------------------------------------------------------------

export const categories: Category[] = [
  {
    id: 'c-incident', name: 'Caída de servicio', color: 'red', icon: 'alert', action: 'alert', wakeAtNight: true, origin: 'sol', status: 'active',
    description: 'Un sistema que usan clientes o sucursales deja de funcionar: portal, VPN, cajas o el correo de toda la empresa.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-security', name: 'Seguridad', color: 'pink', icon: 'shield', action: 'alert', wakeAtNight: true, origin: 'sol', status: 'active',
    description: 'Accesos sospechosos, correos de phishing reportados o cuentas bloqueadas en masa.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-boss', name: 'Pedidos de Marcela', color: 'orange', icon: 'briefcase', action: 'task', wakeAtNight: false, origin: 'sol', status: 'active',
    description: 'Lo que te pide Marcela, tu jefa. Si ella escribe "urgente", pasa a Caída de servicio.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-request', name: 'Solicitudes de usuarios', color: 'blue', icon: 'wrench', action: 'task', wakeAtNight: false, origin: 'sol', status: 'active',
    description: 'Alguien pide ayuda con su clave, su equipo, una impresora o un acceso.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-deadline', name: 'Vencimientos y pagos', color: 'yellow', icon: 'receipt', action: 'task', wakeAtNight: false, origin: 'sol', status: 'active',
    description: 'Certificados, licencias, contratos o cuentas con fecha de vencimiento.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-shifts', name: 'Turnos y reemplazos', color: 'teal', icon: 'repeat', action: 'task', wakeAtNight: false, origin: 'sol', status: 'active',
    description: 'Cambios de turno, reemplazos y quién cubre la guardia o la mesa de ayuda.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-meetings', name: 'Reuniones y mantenciones', color: 'indigo', icon: 'calendar', action: 'calendar', wakeAtNight: false, origin: 'sol', status: 'active',
    description: 'Invitaciones, reuniones y ventanas de mantención con día y hora.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-family', name: 'Familia', color: 'green', icon: 'home', action: 'task', wakeAtNight: false, origin: 'you', status: 'active',
    description: 'Lo que te piden Carolina o el colegio de Tomás.', createdAt: at(-4, '21:30'),
  },
  {
    id: 'c-info', name: 'Informativo', color: 'gray', icon: 'info', action: 'digest', wakeAtNight: false, origin: 'sol', status: 'active',
    description: 'Comunicados, boletines y avisos que conviene saber pero no piden nada.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-noise', name: 'Conversación del grupo', color: 'gray', icon: 'mute', action: 'ignore', wakeAtNight: false, origin: 'sol', status: 'active',
    description: 'Saludos, agradecimientos, "ok", stickers y conversación que no pide nada.', createdAt: at(-4, '21:10'),
  },
  {
    id: 'c-backup', name: 'Respaldos', color: 'red', icon: 'package', action: 'alert', wakeAtNight: true, origin: 'sol', status: 'suggested',
    description: 'Avisos de respaldos que fallan o quedan incompletos.', createdAt: at(0, '02:31'),
  },
];

// Inbox ------------------------------------------------------------------------

const GUARD = 'Soporte TI · Guardia';

const noise = (id: string, time: string, name: string, body: string, offset = -1): Item => ({
  id, source: 'whatsapp', channel: GUARD, direct: false, from: { name }, receivedAt: at(offset, time), body,
  summary: body, categoryId: 'c-noise', confidence: 0.97, review: 'none', outcome: { kind: 'ignored' }, read: true,
  night: offset === -1 && time >= '23:00' ? { decision: 'noise', wouldWake: false, reason: 'Conversación del grupo.' } : undefined,
});

const exampleItems: Item[] = [
  // Last night -----------------------------------------------------------------
  noise('i-n1', '23:12', 'Diego Soto', 'Buenas noches equipo, quedo atento'),
  noise('i-n2', '23:18', 'Andrés Pérez', '¿Alguien vio el partido? 😅'),
  noise('i-n3', '23:20', 'Diego Soto', 'Jaja buenísimo'),
  {
    id: 'i5', source: 'whatsapp', channel: GUARD, direct: false, from: { name: 'Andrés Pérez', handle: '+56 9 5555 0142' }, receivedAt: at(0, '00:40'),
    body: 'URGENTE: la impresora del 3er piso se quedó sin tóner y mañana a primera hora hay que imprimir los contratos.',
    summary: 'Impresora del 3er piso sin tóner',
    context: 'Dice "urgente", pero es una solicitud de rutina y se necesita mañana temprano. La dejé como tarea para hoy en la mañana.',
    categoryId: 'c-request', confidence: 0.91, review: 'none', outcome: { kind: 'task', taskId: 't7' }, read: true,
    night: { decision: 'report', wouldWake: false, reason: 'Dice urgente, pero es rutina.' },
  },
  {
    id: 'i4', source: 'whatsapp', channel: GUARD, direct: false, from: { name: 'Paula Díaz', handle: '+56 9 5555 0177' }, receivedAt: at(0, '01:47'),
    body: 'Hola, perdón la hora. Necesito resetear mi clave del correo, no puedo entrar y mañana tengo cierre.',
    summary: 'Paula necesita resetear la clave del correo',
    context: 'Solicitud de una usuaria de Contabilidad. Puede esperar a la mañana: el cierre es en horario laboral.',
    categoryId: 'c-request', confidence: 0.95, review: 'none', outcome: { kind: 'task', taskId: 't4' }, read: true,
    night: { decision: 'report', wouldWake: false, reason: 'Solicitud de una usuaria. Puede esperar a la mañana.' },
  },
  {
    id: 'i8', source: 'email', channel: 'Correo de trabajo', direct: true, from: { name: 'Backup Server', handle: 'backup@andesretail.example' }, receivedAt: at(0, '02:30'),
    subject: 'Respaldo nocturno incompleto (92 %)',
    body: 'El trabajo "Respaldo diario BD ventas" terminó con advertencias.\n\nProgreso: 92 %\nArchivos omitidos: 14\nCausa probable: espacio insuficiente en el volumen de destino.\n\nEste es un mensaje automático.',
    summary: 'Respaldo de la base de ventas quedó al 92 %',
    context: 'Es la quinta vez este mes. No tengo una categoría para esto, así que no te desperté y te pregunto qué hago la próxima vez.',
    categoryId: null, confidence: 0.42, review: 'new_kind', outcome: { kind: 'digest' }, read: false,
    night: { decision: 'report', wouldWake: false, reason: 'No lo reconozco con seguridad: lo dejé para que lo revises.' },
  },
  {
    id: 'i1', source: 'whatsapp', channel: GUARD, direct: false, from: { name: 'Supervisión Sucursales', handle: '+56 9 5555 0100' }, receivedAt: at(0, '03:05'),
    body: 'Se cayó la VPN de la sucursal Ñuñoa, hay 12 personas sin acceso a los sistemas. ¿Alguien de guardia lo puede ver?',
    summary: 'VPN de la sucursal Ñuñoa caída',
    context: '12 personas sin acceso desde las 03:05. Te avisé a las 03:05 y lo viste al minuto. Diego confirmó la caída a las 03:09 y a las 03:41 Supervisión avisó que volvió.',
    categoryId: 'c-incident', confidence: 0.98, review: 'none', outcome: { kind: 'alerted', seenAt: at(0, '03:06') }, read: true,
    night: { decision: 'wake', wouldWake: true, reason: 'Caída de servicio: puede despertarte de noche.' },
  },
  {
    id: 'i7', source: 'email', channel: 'Correo de trabajo', direct: true, from: { name: 'CertiSur Alertas', handle: 'alertas@certisur.example' }, receivedAt: at(0, '03:05'),
    subject: 'Su certificado SSL para portal.andesretail.example vence en 14 días',
    body: 'Estimado cliente:\n\nEl certificado SSL emitido para portal.andesretail.example vence el próximo mes. Para evitar interrupciones en su sitio, renuévelo antes del vencimiento desde su panel.\n\nEquipo CertiSur',
    attachments: [{ name: 'detalle-certificado.pdf', kind: 'pdf' }],
    summary: 'El certificado del portal vence en 14 días',
    context: 'Si vence, el portal de clientes deja de cargar. Tienes dos semanas: lo dejé como tarea con aviso un día antes.',
    categoryId: 'c-deadline', confidence: 0.96, review: 'none', outcome: { kind: 'task', taskId: 't1' }, read: true,
    night: { decision: 'report', wouldWake: false, reason: 'Tiene plazo de días: no requiere despertarte.' },
  },
  {
    id: 'i2', source: 'whatsapp', channel: GUARD, direct: false, from: { name: 'Diego Soto' }, receivedAt: at(0, '03:09'),
    body: 'Confirmo, la VPN no conecta desde acá tampoco',
    summary: 'Diego confirma la caída de la VPN',
    context: 'Es el mismo incidente de las 03:05. No te avisé dos veces.',
    categoryId: 'c-incident', confidence: 0.93, review: 'none', outcome: { kind: 'digest' }, read: true,
    night: { decision: 'noise', wouldWake: false, reason: 'Mismo incidente de la VPN: no te desperté dos veces.' },
  },
  {
    id: 'i3', source: 'whatsapp', channel: GUARD, direct: false, from: { name: 'Supervisión Sucursales' }, receivedAt: at(0, '03:41'),
    body: 'VPN arriba de nuevo en Ñuñoa. Gracias Rodrigo 🙏',
    summary: 'La VPN de Ñuñoa volvió a funcionar',
    categoryId: 'c-incident', confidence: 0.9, review: 'none', outcome: { kind: 'digest' }, read: true,
    night: { decision: 'noise', wouldWake: false, reason: 'Cierre del incidente.' },
  },
  {
    id: 'i6', source: 'whatsapp', channel: 'Marcela Rojas', direct: true, from: { name: 'Marcela Rojas', handle: '+56 9 5555 0111' }, receivedAt: at(0, '05:20'),
    body: 'Rodrigo, cuando despiertes revisa lo de la VPN de Ñuñoa porfa. Quiero entender qué pasó antes del comité de las 12.',
    thread: [{ from: 'Marcela Rojas', at: at(-1, '18:02'), body: 'Gracias por lo de hoy, buen fin de semana' }],
    summary: 'Marcela quiere entender la caída de la VPN antes del comité',
    context: 'No dice urgente y es para antes de las 12:00. Te dejé una tarea a las 11:30 con aviso 15 minutos antes.',
    categoryId: 'c-boss', confidence: 0.94, review: 'none', outcome: { kind: 'task', taskId: 't2' }, read: false,
    night: { decision: 'report', wouldWake: false, reason: 'Viene de tu jefa, pero no es urgente.' },
  },
  // Today ------------------------------------------------------------------------
  {
    id: 'i9', source: 'whatsapp', channel: 'Javier Muñoz', direct: true, from: { name: 'Javier Muñoz', handle: '+56 9 5555 0123' }, receivedAt: earlier('08:12', 95),
    body: 'Oye Rodrigo, ¿me cambiai la guardia del sábado por la del domingo? Tengo un matrimonio. Avísame hoy si puedes 🙏',
    summary: 'Javier te pide cambiar la guardia del sábado por la del domingo',
    context: 'Necesita la respuesta hoy. El sábado tienes guardia y el domingo estás libre.',
    categoryId: 'c-shifts', confidence: 0.92, review: 'none', outcome: { kind: 'task', taskId: 't3' }, read: false,
  },
  {
    id: 'i10', source: 'email', channel: 'Correo de trabajo', direct: true, from: { name: 'Recursos Humanos', handle: 'rrhh@andesretail.example' }, receivedAt: earlier('09:02', 80),
    subject: 'Nuevo ingreso el lunes: Camila Fuentes (Contabilidad)',
    body: 'Hola equipo TI:\n\nEl lunes ingresa Camila Fuentes al área de Contabilidad. Necesitamos su usuario de red, correo y un notebook configurado antes de las 9:00.\n\nSaludos,\nRecursos Humanos',
    summary: 'Crear usuario y equipo para Camila Fuentes antes del lunes',
    context: 'Necesita usuario de red, correo y notebook listos el lunes a las 9:00. Te dejé la tarea para el viernes en la tarde.',
    categoryId: 'c-request', confidence: 0.9, review: 'none', outcome: { kind: 'task', taskId: 't5' }, read: true,
  },
  {
    id: 'i11', source: 'calendar', channel: 'Invitación de calendario', direct: true, from: { name: 'Marcela Rojas', handle: 'marcela.rojas@andesretail.example' }, receivedAt: earlier('09:30', 70),
    subject: 'Comité de operaciones',
    body: 'Marcela Rojas te invitó a "Comité de operaciones".\nHoy, 12:00 a 13:00 · Sala 4\n\nRevisaremos los incidentes de la semana.',
    summary: 'Invitación al comité de operaciones, hoy a las 12:00',
    categoryId: 'c-meetings', confidence: 0.99, review: 'none', outcome: { kind: 'event', eventId: 'e8' }, read: true,
  },
  {
    id: 'i12', source: 'email', channel: 'Correo de trabajo', direct: false, from: { name: 'Boletín TI', handle: 'boletin@andesretail.example' }, receivedAt: earlier('10:15', 55),
    subject: 'Novedades TI de la semana',
    body: 'Esta semana: nueva política de contraseñas desde el 1 de noviembre, mantención del ERP el domingo y resultados de la encuesta de soporte.',
    summary: 'Boletín TI: nueva política de contraseñas desde el 1 de noviembre',
    categoryId: 'c-info', confidence: 0.93, review: 'none', outcome: { kind: 'digest' }, read: true,
  },
  {
    id: 'i13', source: 'whatsapp', channel: 'Familia', direct: false, from: { name: 'Carolina' }, receivedAt: earlier('10:40', 42),
    body: '¿Puedes ver el regalo de Tomás esta semana? Le encantan los dinosaurios 🦖',
    summary: 'Carolina te pide ver el regalo de cumpleaños de Tomás',
    context: 'El cumpleaños es en 4 días. Lo dejé como tarea un día antes.',
    categoryId: 'c-family', confidence: 0.88, review: 'none', outcome: { kind: 'task', taskId: 't6' }, read: true,
  },
  { ...noise('i-n4', '11:05', 'Paula Díaz', '¡Ya pude entrar! Gracias igual', 0), receivedAt: earlier('11:05', 24) },
  {
    id: 'i15', source: 'email', channel: 'Correo de trabajo', direct: true, from: { name: 'Fibra Sur', handle: 'noc@fibrasur.example' }, receivedAt: earlier('11:20', 30),
    subject: 'Mantención programada del enlace principal',
    body: 'Le informamos una ventana de mantención en el enlace principal de su oficina central, en 2 días entre las 21:00 y las 22:00. Puede haber cortes de hasta 10 minutos.',
    summary: 'Mantención del enlace de internet en 2 días, 21:00 a 22:00',
    context: 'Puede cortar internet hasta 10 minutos. La agregué a tu calendario.',
    categoryId: 'c-meetings', confidence: 0.86, review: 'none', outcome: { kind: 'event', eventId: 'e6' }, read: true,
  },
  {
    id: 'i16', source: 'whatsapp', channel: 'Equipo Soporte', direct: false, from: { name: 'Diego Soto' }, receivedAt: earlier('11:48', 16),
    body: '¿Quién puede cubrir la mesa de ayuda mañana de 14 a 15? Tengo médico',
    summary: 'Diego busca quién cubra la mesa de ayuda mañana de 14:00 a 15:00',
    context: 'Creo que es de Turnos y reemplazos, pero no te lo pidió a ti directamente.',
    categoryId: 'c-shifts', confidence: 0.58, review: 'category', outcome: { kind: 'digest' }, read: false,
  },
  {
    id: 'i17', source: 'email', channel: 'Correo personal', direct: true, from: { name: 'Eléctrica Demo', handle: 'cuentas@electricademo.example' }, receivedAt: earlier('12:02', 6),
    subject: 'Tu boleta de octubre ya está disponible',
    body: 'Hola Rodrigo, tu boleta de octubre por $38.420 ya está disponible. Vence en 6 días.',
    summary: 'Cuenta de la luz: $38.420, vence en 6 días',
    categoryId: 'c-deadline', confidence: 0.95, review: 'none', outcome: { kind: 'task', taskId: 't10' }, read: true,
  },
  // Yesterday --------------------------------------------------------------------
  {
    id: 'i18', source: 'email', channel: 'Correo de trabajo', direct: true, from: { name: 'Marcela Rojas', handle: 'marcela.rojas@andesretail.example' }, receivedAt: at(-1, '09:00'),
    subject: 'Informe semanal de tickets',
    body: 'Rodrigo, ¿me mandas el informe semanal de tickets antes de las 17:00? Gracias.',
    summary: 'Marcela pide el informe semanal de tickets',
    categoryId: 'c-boss', confidence: 0.97, review: 'none', outcome: { kind: 'task', taskId: 't9' }, read: true,
  },
  noise('i-n5', '13:10', 'Andrés Pérez', 'Recibido 👍', -1),
  noise('i-n6', '16:44', 'Diego Soto', 'Ok, quedo atento', -1),
];

// Tasks ------------------------------------------------------------------------

const exampleTasks: Task[] = [
  {
    id: 't2', title: 'Revisar la caída de la VPN de Ñuñoa con Marcela', categoryId: 'c-boss', itemId: 'i6', source: 'whatsapp', sourceLabel: 'Marcela Rojas · WhatsApp',
    date: dateKey(0), time: '11:30', reminder: '15m', repeat: 'never', priority: 'high', flagged: true,
    why: 'Lo quiere entender antes del comité de las 12:00.', done: false, createdAt: at(0, '05:21'),
    subtasks: [
      { id: 's1', title: 'Revisar el registro del firewall de Ñuñoa', done: false },
      { id: 's2', title: 'Anotar hora de caída y de vuelta', done: true },
    ],
  },
  {
    id: 't3', title: 'Responder a Javier por el cambio de guardia', categoryId: 'c-shifts', itemId: 'i9', source: 'whatsapp', sourceLabel: 'Javier Muñoz · WhatsApp',
    date: dateKey(0), reminder: 'none', repeat: 'never', priority: 'medium', flagged: false,
    why: 'Necesita la respuesta hoy. El sábado tienes guardia y el domingo estás libre.', done: false, createdAt: at(0, '08:13'),
  },
  {
    id: 't7', title: 'Cambiar el tóner de la impresora del 3er piso', categoryId: 'c-request', itemId: 'i5', source: 'whatsapp', sourceLabel: 'Andrés Pérez · WhatsApp',
    date: dateKey(0), time: '09:00', reminder: 'none', repeat: 'never', priority: 'low', flagged: false, done: false, createdAt: at(0, '00:41'),
  },
  {
    id: 't4', title: 'Resetear la clave de correo de Paula', categoryId: 'c-request', itemId: 'i4', source: 'whatsapp', sourceLabel: 'Paula Díaz · WhatsApp',
    date: dateKey(0), reminder: 'none', repeat: 'never', priority: 'none', flagged: false,
    why: 'Paula avisó que ya pudo entrar, así que la di por resuelta.', done: true, doneAt: earlier('11:05', 24), createdAt: at(0, '01:48'),
  },
  {
    id: 't5', title: 'Crear usuario, correo y notebook para Camila Fuentes', categoryId: 'c-request', itemId: 'i10', source: 'email', sourceLabel: 'Recursos Humanos · Correo',
    date: dateKey(2), time: '16:00', reminder: 'at', repeat: 'never', priority: 'medium', flagged: false,
    why: 'Entra el lunes a las 9:00 y necesita todo listo.', done: false, createdAt: at(0, '09:03'),
  },
  {
    id: 't1', title: 'Renovar el certificado SSL del portal', categoryId: 'c-deadline', itemId: 'i7', source: 'email', sourceLabel: 'CertiSur Alertas · Correo',
    date: dateKey(3), time: '10:00', reminder: '1d', repeat: 'never', priority: 'high', flagged: true,
    why: 'Si vence, el portal de clientes deja de cargar.', done: false, createdAt: at(0, '03:06'),
  },
  {
    id: 't6', title: 'Comprar el regalo de cumpleaños de Tomás', notes: 'Le encantan los dinosaurios.', categoryId: 'c-family', itemId: 'i13', source: 'whatsapp', sourceLabel: 'Carolina · WhatsApp',
    date: dateKey(3), reminder: 'at', repeat: 'never', priority: 'none', flagged: false,
    why: 'El cumpleaños es en 4 días.', done: false, createdAt: at(0, '10:41'),
  },
  {
    id: 't10', title: 'Pagar la cuenta de la luz', notes: '$38.420', categoryId: 'c-deadline', itemId: 'i17', source: 'email', sourceLabel: 'Eléctrica Demo · Correo',
    date: dateKey(6), reminder: '1d', repeat: 'monthly', priority: 'none', flagged: false, done: false, createdAt: at(0, '12:03'),
  },
  {
    id: 't8', title: 'Pedir hora al médico por los ronquidos', categoryId: null, source: 'voice', sourceLabel: 'Nota de voz',
    reminder: 'none', repeat: 'never', priority: 'none', flagged: false, done: false, createdAt: at(-2, '22:40'),
  },
  {
    id: 't9', title: 'Enviar el informe semanal de tickets', categoryId: 'c-boss', itemId: 'i18', source: 'email', sourceLabel: 'Marcela Rojas · Correo',
    date: dateKey(-1), time: '17:00', reminder: '1h', repeat: 'weekly', priority: 'medium', flagged: false, done: true, doneAt: at(-1, '16:20'), createdAt: at(-1, '09:01'),
  },
];

export const items: Item[] = exampleItems.map((i) => ({ ...i, example: true })).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
export const tasks: Task[] = exampleTasks.map((t) => ({ ...t, example: true }));

// Calendar ---------------------------------------------------------------------

export const calendars: Calendar[] = [
  { id: 'work', name: 'Trabajo', color: 'blue', account: 'Google · trabajo', visible: true },
  { id: 'personal', name: 'Personal', color: 'green', account: 'Google · personal', visible: true },
  { id: 'shifts', name: 'Turnos', color: 'teal', account: 'Compartido por Supervisión', visible: true },
];

// Guard nights on Monday, Wednesday and Friday, two weeks back and four ahead.
const guardNights: CalendarEvent[] = Array.from({ length: 42 }, (_, i) => i - 14).flatMap((offset) => {
  const d = new Date(Date.now() + offset * DAY);
  if (![1, 3, 5].includes(d.getDay())) return [];
  return [{
    id: `g${offset}`, title: 'Guardia nocturna', start: at(offset, '23:00'), end: at(offset + 1, '07:00'),
    calendarId: 'shifts', alert: 'none' as const, source: 'calendar' as const,
  }];
});

export const events: CalendarEvent[] = [
  { id: 'e1', title: 'Reunión de equipo TI', start: at(0, '10:00'), end: at(0, '10:30'), calendarId: 'work', place: 'Google Meet', alert: '5m', source: 'calendar', attendees: ['Marcela Rojas', 'Diego Soto', 'Javier Muñoz'] },
  { id: 'e8', title: 'Comité de operaciones', start: at(0, '12:00'), end: at(0, '13:00'), calendarId: 'work', place: 'Sala 4', alert: '15m', source: 'calendar', itemId: 'i11', notes: 'Revisaremos los incidentes de la semana.', attendees: ['Marcela Rojas'] },
  { id: 'e2', title: 'Buscar a Tomás al colegio', start: at(0, '17:30'), end: at(0, '18:00'), calendarId: 'personal', alert: '15m', source: 'calendar' },
  { id: 'e9', title: 'Reunión 1:1 con Marcela', start: at(1, '09:30'), end: at(1, '10:00'), calendarId: 'work', place: 'Oficina de Marcela', alert: '5m', source: 'calendar' },
  { id: 'e4', title: 'Control dental', start: at(1, '11:00'), end: at(1, '11:45'), calendarId: 'personal', place: 'Clínica Centro', alert: '1h', source: 'calendar' },
  { id: 'e6', title: 'Mantención del enlace de Fibra Sur', start: at(2, '21:00'), end: at(2, '22:00'), calendarId: 'work', alert: '15m', source: 'email', itemId: 'i15', notes: 'Puede haber cortes de hasta 10 minutos.' },
  { id: 'e5', title: 'Cumpleaños de Tomás', start: at(4, '16:00'), end: at(4, '19:00'), calendarId: 'personal', place: 'Casa', alert: '1d', source: 'calendar' },
  { id: 'e10', title: 'Capacitación de seguridad', start: at(5, '15:00'), end: at(5, '16:30'), calendarId: 'work', place: 'Auditorio', alert: '15m', source: 'calendar' },
  ...guardNights,
];

// Night and summaries ----------------------------------------------------------

export const nightAlerts: NightAlerts = {
  mode: 'urgent',
  when: 'calendar',
  days: [1, 3, 5],
  calendarId: 'shifts',
  keyword: 'Guardia',
  from: '23:00',
  to: '07:00',
  call: true,
  callAfterMin: 3,
  askBefore: true,
  override: null,
};

export const summaries: SummarySettings = {
  morning: { on: true, at: '07:00', channels: ['app', 'whatsapp'] },
  evening: { on: true, at: '19:00', channels: ['app', 'whatsapp'] },
};

// Sol --------------------------------------------------------------------------

export const questions: AgentQuestion[] = [
  {
    id: 'q-backup', categoryId: 'c-backup', itemId: 'i8',
    text: '¿Qué hago cuando un respaldo queda incompleto?',
    context: 'Llegaron 5 avisos así este mes, siempre de madrugada. Anoche el de ventas quedó al 92 %.',
    options: ['Avisarme al tiro', 'Dejarlo en el resumen', 'Crear una tarea'],
    effects: [
      'Creo la categoría Respaldos y puede despertarte en las noches con avisos.',
      'Creo la categoría Respaldos y la sumo al resumen de la mañana.',
      'Creo la categoría Respaldos y cada aviso queda como tarea.',
    ],
    actions: ['alert', 'digest', 'task'],
  },
  {
    id: 'q-cover', itemId: 'i16', categoryId: 'c-shifts',
    text: '¿Lo de Diego es para ti?',
    context: 'Busca quién cubra la mesa de ayuda mañana de 14:00 a 15:00. Lo puse en Turnos y reemplazos.',
    options: ['Sí, crear tarea', 'Solo informativo'],
    effects: ['Te dejo una tarea para responderle.', 'Lo dejo en el resumen y no creo tarea.'],
    actions: ['task', 'digest'],
  },
  {
    id: 'q-p1',
    text: '¿Qué significa "P1" cuando lo escribe Supervisión?',
    context: 'Lo vi 4 veces, siempre de madrugada.',
    options: ['Una urgencia', 'Una sucursal', 'No sé'],
  },
];

export const people: Person[] = [
  { id: 'p1', name: 'Marcela Rojas', relation: 'Tu jefa', channels: ['whatsapp', 'email', 'calendar'], importance: 'high' },
  { id: 'p2', name: 'Carolina', relation: 'Tu pareja', channels: ['whatsapp'], importance: 'high' },
  { id: 'p3', name: 'Supervisión Sucursales', relation: 'Reporta caídas en las sucursales', channels: ['whatsapp'], importance: 'high' },
  { id: 'p4', name: 'Javier Muñoz', relation: 'Compañero de guardia', channels: ['whatsapp'], importance: 'normal' },
  { id: 'p5', name: 'Diego Soto', relation: 'Compañero de guardia', channels: ['whatsapp'], importance: 'normal' },
  { id: 'p6', name: 'Paula Díaz', relation: 'Usuaria de Contabilidad', channels: ['whatsapp'], importance: 'normal' },
];

export const rules: Rule[] = [
  { id: 'r1', text: 'Si un servicio de clientes se cae, despiértame', kind: 'wake', origin: 'onboarding', confirmed: true, examples: 6 },
  { id: 'r2', text: 'Cualquier cosa de seguridad me despierta', kind: 'wake', origin: 'onboarding', confirmed: true, examples: 3 },
  { id: 'r4', text: 'Si es algo nuevo o no estás seguro, pregúntame', kind: 'wake', origin: 'default', confirmed: true },
  { id: 'r5', text: 'Las solicitudes de usuarios esperan a la mañana', kind: 'wait', origin: 'onboarding', confirmed: true, examples: 41 },
  { id: 'r6', text: 'Lo de Marcela que no diga "urgente" puede esperar', kind: 'wait', origin: 'onboarding', confirmed: true, examples: 9 },
  { id: 'r7', text: 'Los avisos con plazo de días se vuelven tarea', kind: 'task', origin: 'onboarding', confirmed: true, examples: 7 },
  { id: 'r8', text: 'La conversación del grupo no se muestra', kind: 'ignore', origin: 'default', confirmed: true },
  { id: 'r9', text: 'Si un respaldo falla a fin de mes, despiértame', kind: 'wake', origin: 'feedback', confirmed: true, examples: 1 },
];

export const memory: MemoryItem[] = [
  { id: 'm1', category: 'vida', text: 'Vives con Carolina y su hijo Tomás, de 6 años.', source: 'onboarding', learnedAt: at(-4, '21:00') },
  { id: 'm2', category: 'trabajo', text: 'Trabajas en soporte TI en Andes Retail, con turnos que rotan cada semana.', source: 'onboarding', learnedAt: at(-4, '21:00') },
  { id: 'm3', category: 'trabajo', text: 'Las caídas de servicio llegan por el grupo "Soporte TI · Guardia".', source: 'whatsapp', learnedAt: at(-4, '21:05') },
  { id: 'm4', category: 'personas', text: 'Marcela Rojas es tu jefa. Cuando algo es urgente, lo dice.', source: 'whatsapp', learnedAt: at(-3, '08:00') },
  { id: 'm5', category: 'personas', text: 'Javier y Diego comparten la guardia contigo.', source: 'whatsapp', learnedAt: at(-3, '08:00') },
  { id: 'm6', category: 'horarios', text: 'Tienes guardia nocturna los lunes, miércoles y viernes.', source: 'calendar', learnedAt: at(-2, '07:00') },
  { id: 'm7', category: 'preferencias', text: 'Prefieres los resúmenes por WhatsApp.', source: 'chat', learnedAt: at(-3, '07:10') },
  { id: 'm8', category: 'preferencias', text: 'No quieres que te despierte por impresoras ni claves.', source: 'chat', learnedAt: at(-1, '07:12') },
];

export const training: Training = {
  phase: 'pilot',
  read: { messages: 4812, emails: 1290, months: 3 },
  categories: [
    { id: 'c1', label: 'Caídas de servicio', count: 23, example: '"Se cayó el portal de clientes"' },
    { id: 'c2', label: 'Solicitudes de usuarios', count: 412, example: '"Necesito resetear mi clave"' },
    { id: 'c3', label: 'Pedidos de Marcela', count: 57, example: '"Cuando puedas revisa..."' },
    { id: 'c4', label: 'Vencimientos y pagos', count: 31, example: '"Vence en 14 días"' },
    { id: 'c5', label: 'Conversación del grupo', count: 2380, example: '"Jaja buenísimo"' },
  ],
  pilot: { nights: 4, target: 14, agreement: 0.93, missed: 0, tooMany: 2, rated: 44 },
  questions,
};

export const connections: Connection[] = [
  { id: 'whatsapp', name: 'WhatsApp', status: 'connected', detail: '5 chats vigilados', account: '+56 9 5555 0199', lastCheck: ago(1) },
  { id: 'gmail', name: 'Gmail', status: 'connected', detail: '2 cuentas', account: 'rodrigo@andesretail.example', lastCheck: ago(2) },
  { id: 'calendar', name: 'Google Calendar', status: 'connected', detail: '3 calendarios', account: 'rodrigo@andesretail.example', lastCheck: ago(4) },
  { id: 'outlook', name: 'Outlook', status: 'off', detail: 'No conectado' },
  { id: 'slack', name: 'Slack', status: 'off', detail: 'No conectado' },
];

// Estimated without asking anything: last and first phone use, a watch if present.
export const sleep: SleepNight[] = [-6, -5, -4, -3, -2, -1, 0].map((offset, i) => ({
  date: dateKey(offset),
  bed: ['00:48', '00:31', '23:58', '23:52', '23:35', '23:20', '23:05'][i],
  wake: '06:30',
  hours: [5.4, 5.7, 6.2, 6.4, 6.6, 6.9, 7.1][i],
  woke: [2, 2, 1, 1, 0, 1, 1][i],
  source: 'estimado',
}));

export const watchedChats: WatchedChat[] = [
  { id: 'w1', name: 'Soporte TI · Guardia', kind: 'grupo', on: true, suggested: true, reason: 'Aquí llegan las caídas de servicio', members: 14 },
  { id: 'w2', name: 'Marcela Rojas', kind: 'persona', on: true, suggested: true, reason: 'Tu jefa: te escribe pedidos' },
  { id: 'w3', name: 'Equipo Soporte', kind: 'grupo', on: true, suggested: true, reason: 'Coordinación de turnos y reemplazos', members: 6 },
  { id: 'w5', name: 'Javier Muñoz', kind: 'persona', on: true, suggested: true, reason: 'Comparte la guardia contigo' },
  { id: 'w4', name: 'Familia', kind: 'grupo', on: true, members: 4 },
  { id: 'w6', name: 'Apoderados 1°B', kind: 'grupo', on: false, suggested: true, reason: 'Avisos del colegio de Tomás', members: 38 },
  { id: 'w7', name: 'Fútbol martes', kind: 'grupo', on: false, members: 12 },
  { id: 'w8', name: 'Ofertas Supermercado', kind: 'grupo', on: false, members: 240 },
];
