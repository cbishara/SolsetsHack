// Synthetic test night for local work without keys. Invented messages only.
// The full simulated week (with expected decisions) belongs to agent/ (Quito).
import type { NewMessage } from './guard.ts';

const night: [string, Omit<NewMessage, 'externalId' | 'receivedAt'>][] = [
  ['23:10', { source: 'whatsapp', group: 'Guardia TI (demo)', sender: 'Javier', text: '¿Alguien vio el partido? jaja' }],
  ['23:25', { source: 'email', sender: 'Mesa de ayuda', text: '[SOLSETS-DEMO] Ticket #4812: usuaria pide reseteo de clave de correo' }],
  ['00:40', { source: 'whatsapp', group: 'Guardia TI (demo)', sender: 'Paula', text: 'URGENTE: la impresora del tercer piso se quedó sin tóner' }],
  ['01:50', { source: 'whatsapp', group: 'Guardia TI (demo)', sender: 'Supervisión', text: 'Oigan, están llamando clientes, dicen que no pueden entrar al portal' }],
  ['01:52', { source: 'whatsapp', group: 'Guardia TI (demo)', sender: 'Javier', text: 'Confirmo, el portal no carga' }],
  ['02:30', { source: 'email', sender: 'Monitoreo', text: '[SOLSETS-DEMO] Respaldo nocturno de la base de clientes falló: disco sin espacio' }],
  ['03:05', { source: 'email', sender: 'Alertas SSL', text: '[SOLSETS-DEMO] El certificado SSL del portal vence en 14 días' }],
  ['03:40', { source: 'whatsapp', group: 'Guardia TI (demo)', sender: 'Diego', text: "¿Qué es un proceso 'xmrig' corriendo en el servidor de reportes?" }],
  ['05:20', { source: 'whatsapp', sender: 'Marcela (jefa)', text: 'Rodrigo, cuando despiertes revisa lo del portal porfa' }],
];

/** The test night placed on the last night (yesterday 22:00 → today 06:30, Santiago). */
export function syntheticNight(runId = Date.now().toString(36)): NewMessage[] {
  const today = new Date();
  return night.map(([hhmm, m], i) => {
    const [h, min] = hhmm.split(':').map(Number);
    const d = new Date(today);
    d.setHours(h, min, 0, 0);
    if (h >= 12) d.setDate(d.getDate() - 1);
    return { ...m, externalId: `sim-${runId}-${i}`, source: 'simulated', receivedAt: d.toISOString() };
  });
}
