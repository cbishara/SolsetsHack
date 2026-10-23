import type { AgentDecision, Decision, FeedbackVerdict } from './contract.ts';

// Pattern taken from Hermes (entries with a size cap, loaded into the prompt),
// with one change: only the user writes memory. The text being classified never does.

/** Where an entry came from. Never 'message': incoming messages are untrusted third-party text. */
export type MemorySource = 'feedback' | 'chat' | 'onboarding';

export interface MemoryEntry {
  id: string;
  user_id: string;
  /** rule: changes how messages are classified. fact: context about the user. */
  kind: 'rule' | 'fact';
  text: string;
  source: MemorySource;
  /** Only active entries reach the prompt. Rules proposed by the agent start as pending. */
  status: 'active' | 'pending';
  created_at: string;
  /** Stable key for entries written from the chat, so a correction replaces the old value. */
  key?: string | null;
  /** The user's own words that justify the entry. */
  evidence?: string | null;
}

export interface FeedbackExample {
  message_id: string;
  user_id: string;
  text: string;
  chat: string | null;
  agent_decision: Decision;
  verdict: FeedbackVerdict;
  correct_decision: Decision;
  at: string;
}

export interface UserProfile {
  user_id: string;
  name: string;
  role: string;
}

/** Hermes caps its user profile at 1,375 characters and its notes at 2,200. */
export const MEMORY_CHAR_CAP = 2000;
export const FEEDBACK_EXAMPLES_IN_PROMPT = 6;

export function correctDecision(agentDecision: Decision, verdict: FeedbackVerdict): Decision {
  if (verdict === 'should_wake') return 'DESPERTAR';
  // "No debió despertarme" does not say whether it was routine or noise. PARTE keeps it visible in the morning.
  if (verdict === 'should_not_wake') return agentDecision === 'DESPERTAR' ? 'PARTE' : agentDecision;
  return agentDecision;
}

export function exampleFromFeedback(decision: AgentDecision, text: string, chat: string | null, verdict: FeedbackVerdict, at: string): FeedbackExample {
  return {
    message_id: decision.message_id, user_id: decision.user_id, text, chat,
    agent_decision: decision.decision, verdict, correct_decision: correctDecision(decision.decision, verdict), at,
  };
}

/** Active entries, newest first, until the character cap. */
export function selectMemory(entries: MemoryEntry[]): MemoryEntry[] {
  const active = entries.filter(e => e.status === 'active').sort((a, b) => b.created_at.localeCompare(a.created_at));
  const selected: MemoryEntry[] = [];
  let used = 0;
  for (const entry of active) {
    if (used + entry.text.length > MEMORY_CHAR_CAP) continue;
    selected.push(entry);
    used += entry.text.length;
  }
  return selected;
}

/** Corrections first (they teach the most), then confirmations, newest first. */
export function selectExamples(examples: FeedbackExample[]): FeedbackExample[] {
  const rank = (e: FeedbackExample) => (e.verdict === 'ok' ? 1 : 0);
  return [...examples].sort((a, b) => rank(a) - rank(b) || b.at.localeCompare(a.at)).slice(0, FEEDBACK_EXAMPLES_IN_PROMPT);
}
