// Official wake policy, replicated from agent/src/integration/server-policy.ts
// (decideForServer) and agent/src/policy.ts (applyPolicy). server/ deploys on
// its own (the Dockerfile copies only server/), so it cannot import agent/.
// Keep both in sync: server/test/policy.test.ts pins the same cases as
// agent/src/integration/server-policy.test.ts.
import { CATEGORY_ACTIONS } from './contract.ts';
import type { Category, Classification, Decision, FeedItem, Night, Settings, Verdict } from './contract.ts';

export const MIN_CONFIDENCE = 0.7;
export const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

export type PolicyContext = {
  /** onCall is the app's "night alerts on": true, false or not answered (null). */
  night: Pick<Night, 'onCall'>;
  settings: Settings;
  recent: Array<Pick<FeedItem, 'messageId' | 'incidentKey' | 'wouldWake'> & { message: { receivedAt: string } }>;
  /** The owner's category resolved from classify's categoryId. Absent or null: no category. */
  category?: Pick<Category, 'wakeAtNight' | 'action'> | null;
};

export class PolicyError extends Error {}

const DECISIONS: Decision[] = ['wake', 'report', 'noise'];

function timestamp(value: string): number {
  const ms = Date.parse(value);
  if (!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(ms)) throw new PolicyError('invalid_job');
  return ms;
}

/** Runs after classify, on the server's current state. No side effects. Throws on malformed input (guard then wakes). */
export function decideForServer(c: Classification, context: PolicyContext, receivedAt: string): Verdict {
  if (!DECISIONS.includes(c.decision) || !Number.isFinite(c.confidence) || c.confidence < 0 || c.confidence > 1 || typeof c.isNew !== 'boolean') {
    throw new PolicyError('invalid_job');
  }
  const category = context.category ?? null;
  if (category && (typeof category.wakeAtNight !== 'boolean' || !(CATEGORY_ACTIONS as readonly string[]).includes(category.action))) {
    throw new PolicyError('invalid_job');
  }
  // A category may add a wake, never remove one: wakeAtNight=false or 'ignore' cannot override "ante la duda, despierta".
  const byCategory = !!category?.wakeAtNight && c.decision !== 'wake';
  const now = timestamp(receivedAt);
  const previous = context.recent
    .filter((r) => r.incidentKey === c.incidentKey && r.wouldWake && Date.parse(r.message.receivedAt) <= now)
    .sort((a, b) => Date.parse(b.message.receivedAt) - Date.parse(a.message.receivedAt))[0];

  // New or low confidence wakes. The policy lives in code, not in the prompt.
  let decision: Decision = byCategory ? 'wake' : c.decision;
  if (decision !== 'wake' && (c.isNew || c.confidence < MIN_CONFIDENCE)) decision = 'wake';

  // Same incident woke less than 30 minutes ago: do not wake again.
  let wake = decision === 'wake';
  let duplicate = false;
  if (wake && previous && Math.abs(now - Date.parse(previous.message.receivedAt)) < DUPLICATE_WINDOW_MS) {
    wake = false;
    duplicate = true;
  }

  // Shadow mode never silences: it does not change wake or decision. The guard blocks real alerts.
  const offDuty = context.night.onCall === false && decision === 'wake';
  const why: Verdict['why'] = offDuty ? 'off_duty' : duplicate ? 'duplicate' : c.isNew ? 'new'
    : c.confidence < MIN_CONFIDENCE ? 'low_confidence' : byCategory ? 'category' : wake ? 'urgent' : 'not_urgent';
  return { ...c, decision, wouldWake: wake && !offDuty, why };
}
