// Importable by server/ without loading Codex, local storage or prompt files.
import { applyPolicy } from '../policy.ts';
import type { Decision } from '../contract.ts';
import { IntegrationError, timestamp } from './contract.ts';
import type { ServerClassification, ServerDecision } from './contract.ts';
const local: Record<ServerDecision, Decision> = { wake: 'DESPERTAR', report: 'PARTE', noise: 'RUIDO' };
const remote: Record<Decision, ServerDecision> = { DESPERTAR: 'wake', PARTE: 'report', RUIDO: 'noise' };

export interface ServerPolicyContext {
  night: { onCall: boolean | null }; settings: { mode: 'shadow' | 'active' };
  recent: Array<{ messageId: string; incidentKey: string; wouldWake: boolean; message: { receivedAt: string } }>;
}
/** Runs on the server's current state, after accepting a classification. No inference or side effects. */
export function decideForServer(c: ServerClassification, context: ServerPolicyContext, receivedAt: string) {
  if (!Object.hasOwn(local, c.decision) || !Number.isFinite(c.confidence) || c.confidence < 0 || c.confidence > 1 || typeof c.isNew !== 'boolean') throw new IntegrationError('invalid_job');
  const now = Date.parse(timestamp(receivedAt));
  const previous = context.recent.filter(r => r.incidentKey === c.incidentKey && r.wouldWake && Date.parse(r.message.receivedAt) <= now)
    .sort((a, b) => Date.parse(b.message.receivedAt) - Date.parse(a.message.receivedAt))[0];
  const result = applyPolicy({ classification: { decision: local[c.decision], reason: c.reason, is_new: c.isNew, confidence: c.confidence },
    context: { shadow: context.settings.mode === 'shadow' }, lastWake: previous ? { message_id: previous.messageId, at: Date.parse(previous.message.receivedAt) } : null, now });
  const offDuty = context.night.onCall === false && result.decision === 'DESPERTAR';
  const why = offDuty ? 'off_duty' : result.duplicate_of ? 'duplicate' : c.isNew ? 'new' : c.confidence < 0.7 ? 'low_confidence' : result.wake ? 'urgent' : 'not_urgent';
  return { ...c, decision: remote[result.decision], wouldWake: result.wake && !offDuty, why };
}
