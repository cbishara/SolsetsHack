export const workspaceId = '00000000-0000-4000-8000-000000000002';
export const scenarios = [
 { id: 'vpn', source: 'gmail', sender: 'Camila · Soporte', subject: 'Ticket #1042 · Acceso VPN', text: 'No puedo entrar a la VPN. Me aparece el error 809. ¿Me ayudas con el acceso?', incidentKey: 'demo-vpn-1042' },
 { id: 'shopping', source: 'whatsapp', sender: 'Rodrigo', subject: 'Compras para mañana', text: 'Prepara la compra del supermercado: leche, pan, fruta y colación para mi hijo.', incidentKey: 'demo-shopping' },
 { id: 'shift', source: 'whatsapp', sender: 'Coordinación', subject: 'Turno de la próxima semana', text: 'La próxima semana mi turno es de 08:00 a 16:00. Recuérdame revisar el calendario mañana.', incidentKey: 'demo-shift' },
 { id: 'critical', source: 'whatsapp', sender: 'Mesa de ayuda', subject: 'P1 · Plataforma sin servicio', text: 'P1: producción caída. Todos los clientes están sin servicio y el procedimiento de recuperación falló. Necesitamos a la guardia.', incidentKey: 'demo-p1-2048' },
];
export function initialState() {
 return { version: 1, profile: { name: 'Rodrigo', age: 41, city: 'Concepción', role: 'Soporte TI · Turnos rotativos' },
  settings: { paused: false, shadow: true, sleepStart: '23:00', sleepEnd: '07:00', timezone: 'America/Santiago', permissions: { reply: 'auto', draft: 'auto', calendar: 'ask', purchase: 'ask' } },
  tasks: [
   { id: 'seed-1', title: 'Ticket #1038 · Guía de acceso VPN', source: 'gmail', sender: 'Camila · Soporte', status: 'resolved', decision: 'PARTE', reason: 'Respuesta de ejemplo con el procedimiento de autoservicio.', reply: 'Te comparto la guía para recuperar el acceso desde el portal de autoservicio.', text: '¿Cómo recupero mi acceso VPN?', createdAt: '2026-10-23T02:14:00Z', synthetic: true, action: 'reply', effects: [{ channel: 'gmail', status: 'simulated' }] },
   { id: 'seed-2', title: 'Lista de compras de la semana', source: 'whatsapp', sender: 'Rodrigo', status: 'approval', decision: 'PARTE', reason: 'Lista preparada; cualquier pago necesita tu aprobación.', reply: 'Lista: leche, pan, fruta y colaciones. Falta confirmar presupuesto.', text: 'Prepara las compras de la semana.', createdAt: '2026-10-23T02:32:00Z', synthetic: true, action: 'purchase', effects: [] },
   { id: 'seed-3', title: 'Revisión de turno · Próxima semana', source: 'whatsapp', sender: 'Coordinación', status: 'queued', decision: 'PARTE', reason: 'La coordinación de turnos puede esperar hasta la mañana.', reply: 'Pendiente de confirmar las fechas exactas del turno.', text: 'Revisemos el turno de la próxima semana mañana.', createdAt: '2026-10-23T02:44:00Z', synthetic: true, action: 'calendar', effects: [] },
  ], activity: [{ id: 'welcome', title: 'Tu guardia de demostración está preparada', description: 'Datos ficticios. El modo sombra permite revisar cada decisión antes de automatizar.', type: 'info', createdAt: '2026-10-23T02:00:00Z' }], feedback: [], lastWake: {}, integrationEvents: [],
 };
}
