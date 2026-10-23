import type { Decision } from './contract.ts';
import type { Agent } from './agent.ts';
import type { SimCase, SimWeek } from './cases.ts';

export interface CaseResult {
  case_id: string;
  text: string;
  status: SimCase['status'];
  expected: Decision;
  /** What the user lives: a repeat that did not wake again counts as PARTE. */
  got: Decision;
  /** The agent's decision as returned (a repeat stays DESPERTAR with wake=false). */
  decision: Decision;
  duplicate_of: string | null;
  ok: boolean;
  wake: boolean;
  reason: string;
  confidence: number;
  is_new: boolean;
  engine: string;
  fallback_reason: string | null;
  policy: string[];
  ms: number;
}

export interface Summary {
  confirmed: number;
  confirmed_ok: number;
  /** Share of Quito-confirmed cases the agent got right. This is the number for the pitch. */
  accuracy: number | null;
  /** Confirmed DESPERTAR the agent did not wake for. The error that matters most. */
  missed_wakes: string[];
  /** Confirmed non-DESPERTAR it woke for anyway. A bad night, not a missed outage. */
  extra_wakes: string[];
  proposed: number;
  proposed_agree: number;
  fallbacks: number;
}

/**
 * Replays the week through the agent. Messages of the same incident go in order (the 30-minute
 * rule depends on it); different incidents run in parallel.
 */
export async function runWeek(agent: Agent, week: SimWeek, opts: { runId: string; userId?: string; onResult?: (r: CaseResult) => void }): Promise<CaseResult[]> {
  const groups = new Map<string, SimCase[]>();
  for (const c of [...week.cases].sort((a, b) => a.received_at.localeCompare(b.received_at))) {
    const key = c.incident_key ?? c.id;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const results: CaseResult[] = [];
  await Promise.all([...groups.entries()].map(async ([key, cases]) => {
    for (const c of cases) {
      const started = Date.now();
      const d = await agent.classify({
        id: `${opts.runId}:${c.id}`, user_id: opts.userId ?? week.user_id, source: c.source,
        chat: c.chat, sender: c.sender, text: c.text, received_at: c.received_at,
        incident_key: `${opts.runId}:${key}`,
      });
      const got = d.duplicate_of ? 'PARTE' : d.decision;
      const result: CaseResult = {
        case_id: c.id, text: c.text, status: c.status, expected: c.expected, got,
        decision: d.decision, duplicate_of: d.duplicate_of, ok: got === c.expected, wake: d.wake, reason: d.reason, confidence: d.confidence,
        is_new: d.is_new, engine: d.engine, fallback_reason: d.fallback_reason, policy: d.policy,
        ms: Date.now() - started,
      };
      results.push(result);
      opts.onResult?.(result);
    }
  }));
  return results.sort((a, b) => a.case_id.localeCompare(b.case_id));
}

export function summarize(results: CaseResult[]): Summary {
  const confirmed = results.filter(r => r.status === 'confirmado');
  const proposed = results.filter(r => r.status !== 'confirmado');
  const confirmedOk = confirmed.filter(r => r.ok).length;
  return {
    confirmed: confirmed.length,
    confirmed_ok: confirmedOk,
    accuracy: confirmed.length ? confirmedOk / confirmed.length : null,
    missed_wakes: confirmed.filter(r => r.expected === 'DESPERTAR' && !r.wake).map(r => r.case_id),
    extra_wakes: confirmed.filter(r => r.expected !== 'DESPERTAR' && r.got === 'DESPERTAR').map(r => r.case_id),
    proposed: proposed.length,
    proposed_agree: proposed.filter(r => r.ok).length,
    fallbacks: results.filter(r => r.fallback_reason).length,
  };
}
