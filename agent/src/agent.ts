import { createHash, randomUUID } from 'node:crypto';
import type { AgentDecision, Classification, FeedbackVerdict, IncomingMessage, NightContext, Source } from './contract.ts';
import type { Engine } from './engines/engine.ts';
import { rulesEngine } from './engines/rules.ts';
import { exampleFromFeedback, selectExamples, selectMemory } from './memory.ts';
import type { FeedbackExample, MemoryEntry, UserProfile } from './memory.ts';
import { applyPolicy } from './policy.ts';
import { buildPrompt } from './prompt.ts';
import type { AgentStore, StoredDecision } from './store.ts';

export class InputError extends Error {}
export class NotFoundError extends Error {}

const SOURCES: Source[] = ['whatsapp', 'gmail', 'simulated'];
const VERDICTS: FeedbackVerdict[] = ['ok', 'should_wake', 'should_not_wake'];
export const MEMORY_ENTRY_MAX = 300;

export interface AgentDeps {
  store: AgentStore;
  engine: Engine;
  now?: () => number;
}

function str(value: unknown, field: string, max = 10_000): string {
  if (typeof value !== 'string' || !value.trim()) throw new InputError(`Falta ${field}.`);
  if (value.length > max) throw new InputError(`${field} supera ${max} caracteres.`);
  return value;
}

function optStr(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return str(value, field, 500);
}

export function parseMessage(input: unknown): IncomingMessage {
  const v = (input ?? {}) as Record<string, unknown>;
  const source = v.source as Source;
  if (!SOURCES.includes(source)) throw new InputError(`source debe ser ${SOURCES.join(', ')}.`);
  const received_at = str(v.received_at, 'received_at', 64);
  if (Number.isNaN(Date.parse(received_at))) throw new InputError('received_at no es una fecha ISO 8601.');
  return {
    id: str(v.id, 'id', 200), user_id: str(v.user_id, 'user_id', 200), source,
    chat: optStr(v.chat, 'chat'), sender: optStr(v.sender, 'sender'), text: str(v.text, 'text'),
    received_at, incident_key: optStr(v.incident_key, 'incident_key'),
  };
}

/** Without an incident_key from server/, the same text in the same chat counts as the same incident. */
export function incidentKey(message: IncomingMessage): string {
  if (message.incident_key) return message.incident_key;
  const normalized = message.text.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update([message.source, message.chat ?? '', normalized].join('|')).digest('hex').slice(0, 24);
}

export function createAgent({ store, engine, now = Date.now }: AgentDeps) {
  async function classify(rawMessage: unknown, context: NightContext = { shadow: true }): Promise<AgentDecision> {
    const message = parseMessage(rawMessage);
    const existing = store.getDecision(message.id);
    if (existing) return existing.decision;

    const profile = store.getProfile(message.user_id);
    const prompt = buildPrompt({
      profile, message,
      memory: selectMemory(store.listMemory(message.user_id)),
      examples: selectExamples(store.listFeedback(message.user_id)),
    });

    let classification: Classification;
    let engineName = engine.name;
    let fallback_reason: string | null = null;
    try {
      classification = await engine.classify(prompt, message);
    } catch (error) {
      classification = await rulesEngine.classify(prompt, message);
      engineName = 'rules';
      fallback_reason = (error as Error).message;
    }

    const key = incidentKey(message);
    // The 30-minute window runs on arrival time, so a replayed night behaves like the real one.
    const at = Date.parse(message.received_at);
    const result = applyPolicy({ classification, context, lastWake: store.getLastWake(message.user_id, key), now: at });
    const decision: AgentDecision = {
      message_id: message.id, user_id: message.user_id,
      decision: result.decision, engine_decision: classification.decision,
      reason: classification.reason, is_new: classification.is_new, confidence: classification.confidence,
      wake: result.wake, shadow: context.shadow, duplicate_of: result.duplicate_of,
      engine: engineName, fallback_reason, policy: result.policy,
      decided_at: new Date(now()).toISOString(),
    };
    // A message can never write memory: classifying only stores the decision.
    store.saveDecision({ message, decision });
    if (result.wake) store.setLastWake(message.user_id, key, { message_id: message.id, at });
    return decision;
  }

  function feedback(input: unknown): FeedbackExample {
    const v = (input ?? {}) as Record<string, unknown>;
    const userId = str(v.user_id, 'user_id', 200);
    const messageId = str(v.message_id, 'message_id', 200);
    const verdict = v.verdict as FeedbackVerdict;
    if (!VERDICTS.includes(verdict)) throw new InputError(`verdict debe ser ${VERDICTS.join(', ')}.`);
    const stored = store.getDecision(messageId);
    if (!stored || stored.message.user_id !== userId) throw new NotFoundError('No hay una decisión con ese message_id para ese usuario.');
    const example = exampleFromFeedback(stored.decision, stored.message.text, stored.message.chat ?? null, verdict, new Date(now()).toISOString());
    store.addFeedback(example);
    return example;
  }

  /** Memory written by the user from the chat or the onboarding. Rules go straight to active: the user wrote them. */
  function remember(input: unknown): MemoryEntry {
    const v = (input ?? {}) as Record<string, unknown>;
    const source = v.source;
    if (source !== 'chat' && source !== 'onboarding') throw new InputError('source debe ser chat u onboarding.');
    const kind = v.kind;
    if (kind !== 'rule' && kind !== 'fact') throw new InputError('kind debe ser rule o fact.');
    const entry: MemoryEntry = {
      id: randomUUID(), user_id: str(v.user_id, 'user_id', 200), kind,
      text: str(v.text, 'text', MEMORY_ENTRY_MAX).trim(), source, status: 'active',
      created_at: new Date(now()).toISOString(),
    };
    store.addMemory(entry);
    return entry;
  }

  function memoryOf(userId: string): { profile: UserProfile; memory: MemoryEntry[]; feedback: FeedbackExample[] } {
    return { profile: store.getProfile(userId), memory: store.listMemory(userId), feedback: store.listFeedback(userId) };
  }

  /** Decisions with their message, newest first. The morning report is the PARTE ones. */
  function decisionsOf(userId: string, since?: string): StoredDecision[] {
    const from = since ? Date.parse(since) : 0;
    if (Number.isNaN(from)) throw new InputError('since no es una fecha ISO 8601.');
    return store.listDecisions(userId)
      .filter(d => Date.parse(d.message.received_at) >= from);
  }

  return { classify, feedback, remember, memoryOf, decisionsOf };
}

export type Agent = ReturnType<typeof createAgent>;
