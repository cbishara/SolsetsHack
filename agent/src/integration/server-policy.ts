// Importable by server/ without loading Codex, local storage or prompt files.
import { applyPolicy } from '../policy.ts';
import type { Decision } from '../contract.ts';
import { IntegrationError, timestamp } from './contract.ts';
import type { ServerClassification, ServerDecision } from './contract.ts';
const local: Record<ServerDecision, Decision> = { wake: 'DESPERTAR', report: 'PARTE', noise: 'RUIDO' };
const remote: Record<Decision, ServerDecision> = { DESPERTAR: 'wake', PARTE: 'report', RUIDO: 'noise' };

const CATEGORY_ACTIONS = ['alert', 'task', 'calendar', 'digest', 'ignore'];

export interface ServerPolicyContext {
  /** onCall is the app's "avisos activos esta noche": true, false or not answered (null). */
  night: { onCall: boolean | null }; settings: { mode: 'shadow' | 'active' };
  recent: Array<{ messageId: string; incidentKey: string; wouldWake: boolean; message: { receivedAt: string } }>;
  /** The owner's category resolved by the server from classify's categoryId (#61). Absent or null: no category. */
  category?: { wakeAtNight: boolean; action: 'alert' | 'task' | 'calendar' | 'digest' | 'ignore' } | null;
}
/** Runs on the server's current state, after accepting a classification. No inference or side effects. */
export function decideForServer(c: ServerClassification, context: ServerPolicyContext, receivedAt: string) {
  if (!Object.hasOwn(local, c.decision) || !Number.isFinite(c.confidence) || c.confidence < 0 || c.confidence > 1 || typeof c.isNew !== 'boolean') throw new IntegrationError('invalid_job');
  const category = context.category ?? null;
  if (category && (typeof category.wakeAtNight !== 'boolean' || !CATEGORY_ACTIONS.includes(category.action))) throw new IntegrationError('invalid_job');
  // A category may add a wake, never remove one: wakeAtNight=false or 'ignore' cannot override "ante la duda, despierta".
  const byCategory = !!category?.wakeAtNight && c.decision !== 'wake';
  const now = Date.parse(timestamp(receivedAt));
  const previous = context.recent.filter(r => r.incidentKey === c.incidentKey && r.wouldWake && Date.parse(r.message.receivedAt) <= now)
    .sort((a, b) => Date.parse(b.message.receivedAt) - Date.parse(a.message.receivedAt))[0];
  const result = applyPolicy({ classification: { decision: byCategory ? 'DESPERTAR' : local[c.decision], reason: c.reason, is_new: c.isNew, confidence: c.confidence },
    context: { shadow: context.settings.mode === 'shadow' }, lastWake: previous ? { message_id: previous.messageId, at: Date.parse(previous.message.receivedAt) } : null, now });
  const offDuty = context.night.onCall === false && result.decision === 'DESPERTAR';
  const why = offDuty ? 'off_duty' : result.duplicate_of ? 'duplicate' : c.isNew ? 'new' : c.confidence < 0.7 ? 'low_confidence' : byCategory ? 'category' : result.wake ? 'urgent' : 'not_urgent';
  return { ...c, decision: remote[result.decision], wouldWake: result.wake && !offDuty, why };
}
