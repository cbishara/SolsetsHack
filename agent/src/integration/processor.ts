import { createChat } from '../chat.ts';
import type { ChatMessage } from '../chat.ts';
import { createCodexEngine } from '../engines/codex.ts';
import type { CodexRunner } from '../engines/codex.ts';
import { rulesEngine } from '../engines/rules.ts';
import { incidentKey, parseMessage } from '../agent.ts';
import { selectExamples, selectMemory, correctDecision } from '../memory.ts';
import type { MemoryEntry } from '../memory.ts';
import type { Classification, Decision } from '../contract.ts';
import { MemoryStore } from '../store.ts';
import { buildPrompt } from '../prompt.ts';
import { IntegrationError, parseJob, record, string, timestamp } from './contract.ts';
import type { AgentJob, JobContext, JobResult, ContextMemory, ServerDecision, ChatPayload, ChatResult } from './contract.ts';
export { decideForServer } from './server-policy.ts';

const local: Record<ServerDecision, Decision> = { wake: 'DESPERTAR', report: 'PARTE', noise: 'RUIDO' };
const remote: Record<Decision, ServerDecision> = { DESPERTAR: 'wake', PARTE: 'report', RUIDO: 'noise' };
const verdicts = { right: 'ok', should_have_woken: 'should_wake', should_not_have_woken: 'should_not_wake' } as const;
const commandText = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function validateContext(input: unknown): JobContext {
  const c = record(input), profile = record(c.profile);
  string(profile.name, 200); string(profile.role, 300);
  if (!Array.isArray(c.memory) || c.memory.length > 100 || !Array.isArray(c.examples) || c.examples.length > 50) throw new IntegrationError('invalid_job');
  const keys = new Set<string>();
  for (const raw of c.memory) {
    const m = record(raw), key = string(m.key, 100);
    if (keys.has(key) || !['rule', 'fact'].includes(String(m.kind)) || !['chat', 'onboarding', 'feedback'].includes(String(m.source))) throw new IntegrationError('invalid_job');
    keys.add(key); string(m.value, 300);
    if (m.evidence !== undefined) string(m.evidence, 2000);
  }
  for (const raw of c.examples) {
    const e = record(raw); string(e.text, 2000);
    if (!Object.hasOwn(local, String(e.agentDecision)) || !Object.hasOwn(verdicts, String(e.value))) throw new IntegrationError('invalid_job');
  }
  return c as unknown as JobContext;
}

function memoryEntry(m: ContextMemory, userId: string, at: number, i: number): MemoryEntry {
  return { id: `context-${i}`, user_id: userId, key: m.key, kind: m.kind, text: m.value,
    source: m.source, evidence: m.evidence, status: 'active', created_at: new Date(at - i).toISOString() };
}

export interface ProcessorOptions {
  /** A fresh runner uses the remaining lease as its hard process timeout. */
  runnerFor: (timeoutMs: number) => CodexRunner;
  model?: string | null;
  now?: () => number;
}

/** Stateless: a job gets a private in-memory snapshot; only the server accepts shared changes. */
export function createJobProcessor({ runnerFor, model = null, now = Date.now }: ProcessorOptions) {
  return async (input: AgentJob): Promise<JobResult> => {
    const job = parseJob(input);
    const remaining = Math.min(Date.parse(job.deadlineAt), Date.parse(job.leaseExpiresAt)) - now();
    if (remaining <= 0) throw new IntegrationError('deadline_expired');
    if (job.kind === 'chat') return processOwnerChat(job, { runnerFor, model, now });
    const p = record(job.payload), context = validateContext(p.context);
    const memories = context.memory.map((m, i) => memoryEntry(m, job.userId, now(), i));
    const profile = { user_id: job.userId, name: context.profile.name, role: context.profile.role };
    const runner = runnerFor(Math.max(1, Math.min(25_000, Math.floor(remaining))));
    const m = record(p.message);
    if (m.source === 'whatsapp' && (p.origin !== 'webhook' || p.direction !== 'incoming')) throw new IntegrationError('untrusted_origin');
    string(m.externalId); string(m.sender, 120); timestamp(m.receivedAt);
    let message;
    try {
      message = parseMessage({ id: m.id, user_id: job.userId, source: m.source === 'email' ? 'gmail' : m.source,
        sender: m.sender, chat: m.group, text: m.text, received_at: m.receivedAt });
    } catch { throw new IntegrationError('invalid_job'); }
    const examples = context.examples.map((e, i) => {
      const decision = local[e.agentDecision], verdict = verdicts[e.value];
      return { message_id: `example-${i}`, user_id: job.userId, text: e.text, chat: null,
        agent_decision: decision, verdict, correct_decision: correctDecision(decision, verdict), at: new Date(now() - i).toISOString() };
    });
    const prompt = buildPrompt({ profile, message, memory: selectMemory(memories), examples: selectExamples(examples) });
    let classification: Classification, engine: 'codex' | 'rules' = 'codex', fallbackReason: string | null = null;
    try { classification = await createCodexEngine({}, runner).classify(prompt, message); }
    catch { classification = await rulesEngine.classify(prompt, message); engine = 'rules'; fallbackReason = 'engine_unavailable'; }
    if (now() >= Math.min(Date.parse(job.deadlineAt), Date.parse(job.leaseExpiresAt))) throw new IntegrationError('deadline_expired');
    return { kind: 'classify', messageId: message.id, decision: remote[classification.decision], reason: classification.reason,
      isNew: classification.is_new, confidence: classification.confidence, incidentKey: incidentKey(message),
      engine, model: engine === 'codex' ? model : null, fallbackReason };
  };
}

/** Shared owner-only chat processing. This is not a v0 envelope and never changes a job's data provenance. */
export async function processOwnerChat(
  job: Pick<AgentJob, 'userId' | 'requestId' | 'deadlineAt' | 'leaseExpiresAt'> & { payload: ChatPayload },
  { runnerFor, model = null, now = Date.now, ownerHistoryOnly = false }: ProcessorOptions & { ownerHistoryOnly?: boolean },
): Promise<ChatResult> {
  const remaining = Math.min(Date.parse(job.deadlineAt), Date.parse(job.leaseExpiresAt)) - now();
  if (remaining <= 0) throw new IntegrationError('deadline_expired');
  const p = record(job.payload), context = validateContext(p.context);
  const memories = context.memory.map((m, i) => memoryEntry(m, job.userId, now(), i));
  const profile = { user_id: job.userId, name: context.profile.name, role: context.profile.role };
  const runner = runnerFor(Math.max(1, Math.min(60_000, Math.floor(remaining))));
  if (p.ownerVerified !== true) throw new IntegrationError('unverified_owner');
  const text = string(p.text, 2000), conversationId = string(p.conversationId);
  string(p.concern, 300, true);
  if (!Array.isArray(p.messages) || p.messages.length > 60) throw new IntegrationError('invalid_job');
  const messages = p.messages.map((raw): ChatMessage => {
    const m = record(raw); string(m.id); string(m.text, 4000);
    if (m.role !== 'user' && m.role !== 'assistant') throw new IntegrationError('invalid_job');
    return { id: m.id as string, role: m.role, text: m.text as string };
  });
  let plan = null;
  if (p.plan !== null) {
    const v = record(p.plan); string(v.title, 300); string(v.nextStep, 2000);
    if (v.minutes !== undefined && (typeof v.minutes !== 'number' || !Number.isFinite(v.minutes) || v.minutes < 1)) throw new IntegrationError('invalid_job');
    plan = { title: v.title as string, nextStep: v.nextStep as string, ...(v.minutes !== undefined ? { minutes: v.minutes as number } : {}) };
  }
  const store = new MemoryStore();
  store.setProfile(profile);
  for (const m of memories) store.addMemory(m);
  const sessionId = `job:${job.userId}:${conversationId}`;
  store.saveChat({ id: sessionId, user_id: job.userId, messages: ownerHistoryOnly ? messages.filter(m => m.role === 'user') : messages,
    concern: p.concern as string, plan, processed: [] });
  const chat = createChat({ store, userId: job.userId, runner, model, now });
  const view = await chat.send(sessionId, { text, requestId: job.requestId });
  const reply = view.messages.at(-1)!;
  if (reply.inference?.engine === 'unavailable') throw new IntegrationError('engine_unavailable');
  if (now() >= Math.min(Date.parse(job.deadlineAt), Date.parse(job.leaseExpiresAt))) throw new IntegrationError('deadline_expired');
  const after = store.listMemory(job.userId);
  const memoryUpdates = after.filter(m => !memories.some(old => old.key === m.key && old.text === m.text && old.kind === m.kind && old.source === m.source && old.evidence === m.evidence))
    .map(m => ({ key: m.key!, kind: m.kind, value: m.text, source: m.source, ...(m.evidence ? { evidence: m.evidence } : {}) }));
  return { kind: 'chat', reply, concern: view.concern, plan: view.plan, memoryUpdates,
    forgetKeys: memories.filter(m => !after.some(saved => saved.key === m.key)).map(m => m.key!),
    clearHistory: commandText(text) === 'borrar' };
}
