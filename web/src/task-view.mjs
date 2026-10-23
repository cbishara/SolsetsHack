// Backend execution and real-world resolution are deliberately kept separate.
export function taskView(task) {
  if (task.local || task.actionStatus === 'prepared' || task.status === 'prepared') return { group: 'prepared', label: 'Preparado', detail: 'Borrador local · sin enviar' };
  if (task.status === 'approval') return { group: 'decision', label: 'Tú decides', detail: 'Falta tu aprobación' };
  if (['escalated', 'blocked', 'failed'].includes(task.status)) return { group: 'decision', label: task.status === 'failed' ? 'Revisar fallo' : 'Necesita atención', detail: task.reason };
  if (task.status === 'draft' || task.status === 'shadow') return { group: 'prepared', label: 'Preparado', detail: task.status === 'shadow' ? 'Propuesta en modo sombra' : 'Borrador disponible' };
  if (task.status === 'resolved') return { group: 'activity', label: task.synthetic ? 'Acción simulada' : 'Acción registrada', detail: 'No confirma que el asunto esté resuelto' };
  return { group: 'waiting', label: 'En espera', detail: task.reason || 'Hay un siguiente paso pendiente' };
}
