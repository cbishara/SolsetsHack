import { z } from 'zod';

export const classificationSchema = z.object({
  decision: z.enum(['DESPERTAR', 'PARTE', 'RUIDO']), reason: z.string().min(1).max(500),
  isNew: z.boolean(), confidence: z.number().min(0).max(1),
  reply: z.string().max(1500), action: z.enum(['reply', 'draft', 'calendar', 'purchase', 'none']).default('none'),
});

// Trust policy lives outside the model and cannot be changed by an incoming message.
export function applyPolicy(classification, settings, { duplicate = false } = {}) {
  const value = classificationSchema.parse(classification);
  const decision = value.isNew || value.confidence < 0.7 ? 'DESPERTAR' : value.decision;
  const requiresApproval = value.action !== 'none' && settings.permissions[value.action] !== 'auto';
  const blocked = value.action !== 'none' && settings.permissions[value.action] === 'never';
  return { ...value, decision, requiresApproval, blocked,
    wake: decision === 'DESPERTAR' && !duplicate && !settings.paused,
    execute: !settings.paused && !settings.shadow && !requiresApproval && !blocked && decision !== 'DESPERTAR',
    duplicate, shadow: settings.shadow,
    reason: value.isNew ? 'Situación nueva: requiere revisión humana. ' + value.reason : value.confidence < 0.7 ? 'Confianza insuficiente: requiere revisión humana. ' + value.reason : value.reason,
  };
}

export function demoClassify(text) {
  const value = text.toLowerCase();
  if (/caíd|caid|sin servicio|producción|produccion|p1|incendio|seguridad|filtraci/.test(value)) return { decision: 'DESPERTAR', reason: 'Servicio crítico afectado; necesita intervención de la guardia.', isNew: false, confidence: .98, reply: 'Rodrigo, hay un incidente crítico de servicio. Necesitamos tu revisión ahora. Te dejo el contexto y la acción pendiente.', action: 'none' };
  if (/compra|comprar|pagar|pedido|supermercado/.test(value)) return { decision: 'PARTE', reason: 'Compra cotidiana sin urgencia. Preparar la lista no autoriza un pago.', isNew: false, confidence: .95, reply: 'Dejé la lista de compras preparada. El pago queda pendiente de tu aprobación.', action: 'purchase' };
  if (/turno|calendario|reunión|reunion|mañana|manana/.test(value)) return { decision: 'PARTE', reason: 'Coordinación de horario; puede revisarse al terminar el descanso.', isNew: false, confidence: .93, reply: 'Lo dejé en tu parte de la mañana. Confirmaremos el horario antes de modificar tu calendario.', action: 'calendar' };
  if (/\b(gracias|recibido|ok)\b|👍|promoci|newsletter/.test(value)) return { decision: 'RUIDO', reason: 'Confirmación o contenido informativo sin acción pendiente.', isNew: false, confidence: .97, reply: 'Mensaje registrado; no requiere una interrupción.', action: 'none' };
  if (/vpn|contraseña|contrasena|acceso|ticket|impresora/.test(value)) return { decision: 'PARTE', reason: 'Consulta habitual con procedimiento disponible; no afecta un servicio crítico.', isNew: false, confidence: .94, reply: 'Soy el asistente de Rodrigo. Para revisar el acceso VPN, confirma el código de error y si puedes abrir el portal de autoservicio. No compartas tu contraseña.', action: 'reply' };
  return { decision: 'DESPERTAR', reason: 'No hay un procedimiento conocido para este mensaje.', isNew: true, confidence: .5, reply: 'Necesito que revises una situación que no reconozco. No ejecuté cambios.', action: 'none' };
}
