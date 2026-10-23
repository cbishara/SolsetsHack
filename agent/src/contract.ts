// Shared contract between agent/, server/ and mobile/.
// Proposal until the three agree (docs/equipo/adr/por-confirmar/2026-10-23-contrato-compartido.md).
// After that, change it only in a small PR and tell the other two.

export const DECISIONS = ['DESPERTAR', 'PARTE', 'RUIDO'] as const;
export type Decision = (typeof DECISIONS)[number];

export type Source = 'whatsapp' | 'gmail' | 'simulated';

/** A message that arrived during the night, as server/ hands it to the agent. */
export interface IncomingMessage {
  /** Stable id from the source. Classifying the same id twice returns the stored decision. */
  id: string;
  user_id: string;
  source: Source;
  /** WhatsApp group name or email subject. */
  chat?: string | null;
  sender?: string | null;
  text: string;
  /** ISO 8601 with offset. */
  received_at: string;
  /** Groups repeated messages about the same incident. */
  incident_key?: string | null;
}

/** Per-request context that server/ owns (user settings for the night). */
export interface NightContext {
  /** Shadow mode: the agent only shows what it would have done; nothing is silenced. */
  shadow: boolean;
}

/** What the engine (model or rules) returns, before the policy runs. */
export interface Classification {
  decision: Decision;
  reason: string;
  is_new: boolean;
  confidence: number;
}

export type EngineName = 'codex' | 'rules';

/** What the agent returns to server/ for each message. */
export interface AgentDecision {
  message_id: string;
  user_id: string;
  /** Final decision, after the policy. */
  decision: Decision;
  /** What the engine said before the policy. */
  engine_decision: Decision;
  /** One line, in Spanish, for the user. */
  reason: string;
  is_new: boolean;
  confidence: number;
  /** Whether this incident would wake the user. server/ must suppress real alerts when shadow=true. */
  wake: boolean;
  shadow: boolean;
  /** Set when an alert for the same incident already went out in the last 30 minutes. */
  duplicate_of: string | null;
  engine: EngineName;
  /** Why the rules engine answered instead of the model, if it did. */
  fallback_reason: string | null;
  /** Human-readable list of the policy rules that changed the outcome. */
  policy: string[];
  decided_at: string;
}

/** One-tap feedback from the user on a decision. */
export type FeedbackVerdict = 'ok' | 'should_wake' | 'should_not_wake';

export function isDecision(value: unknown): value is Decision {
  return typeof value === 'string' && (DECISIONS as readonly string[]).includes(value);
}
