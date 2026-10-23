import type { Classification, Decision, NightContext } from './contract.ts';

export const MIN_CONFIDENCE = 0.7;
export const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

export interface PolicyInput {
  classification: Classification;
  context: NightContext;
  /** Last alert sent for the same incident, if any. */
  lastWake: { message_id: string; at: number } | null;
  now: number;
}

export interface PolicyResult {
  decision: Decision;
  wake: boolean;
  duplicate_of: string | null;
  policy: string[];
}

// The policy lives in code, not in the prompt: no incoming message can change it.
export function applyPolicy({ classification, lastWake, now }: PolicyInput): PolicyResult {
  const policy: string[] = [];
  let decision = classification.decision;

  if (decision !== 'DESPERTAR' && classification.is_new) {
    decision = 'DESPERTAR';
    policy.push('Situación nueva: ante la duda, despierta.');
  } else if (decision !== 'DESPERTAR' && classification.confidence < MIN_CONFIDENCE) {
    decision = 'DESPERTAR';
    policy.push(`Confianza ${classification.confidence.toFixed(2)} bajo ${MIN_CONFIDENCE}: ante la duda, despierta.`);
  }

  let wake = decision === 'DESPERTAR';
  let duplicate_of: string | null = null;
  if (wake && lastWake && Math.abs(now - lastWake.at) < DUPLICATE_WINDOW_MS) {
    wake = false;
    duplicate_of = lastWake.message_id;
    policy.push('Mismo incidente que una alerta de hace menos de 30 minutos: no lo vuelve a despertar.');
  }

  // Shadow mode never silences anything, so it does not change `wake` or the decision.
  return { decision, wake, duplicate_of, policy };
}
