// Candidate v1 negotiated in #30. Real data requires explicit operator opt-in; v0 remains synthetic.
import type { AgentJob, ChatPayload, ChatResult } from './contract.ts';
import { IntegrationError, validateLease, record, string, timestamp } from './contract.ts';

export interface CatalogChat { id: string; name: string; type: 'direct' | 'group' | 'unknown' }
export interface SuggestPayload {
  snapshotId: string; contextVersion: string; needs: string[]; chats: CatalogChat[];
}
export interface SelectedEvidence {
  chatId: string; messageId: string; text: string; sentAt: string; selectionGeneration: string;
}
export interface ContextAuthorization {
  userId: string; contextVersion: string; selectionVersion: string;
  selectedChats: Array<{ chatId: string; generation: string }>;
}
export interface ChatPayloadV1 extends Omit<ChatPayload, 'context'> {
  context: ChatPayload['context'] & { evidence: SelectedEvidence[]; authorization: ContextAuthorization };
}
type Base = Omit<AgentJob, 'version' | 'kind' | 'payload' | 'synthetic'> & {
  version: 'v1'; synthetic: boolean; ownerVerified: true;
  authorization: { userId: string; contextVersion: string; bindingVersion: string };
};
export type AgentJobV1 = Base & (
  { kind: 'suggest_chats'; payload: SuggestPayload } | { kind: 'chat'; payload: ChatPayloadV1 }
);
export interface ChatSuggestion { chatId: string; relevance: 'relevant' | 'uncertain' | 'not_relevant'; reason: string }
export interface SuggestResult {
  kind: 'suggest_chats'; snapshotId: string; contextVersion: string;
  suggestions: ChatSuggestion[]; engine: 'codex' | 'rules'; model: string | null;
}
export interface EvidenceCitation { chatId: string; messageId: string }
export interface ChatResultV1 extends ChatResult {
  contextVersion: string; selectionVersion: string; citations: EvidenceCitation[];
}
export type JobResultV1 = SuggestResult | ChatResultV1;
export const V1_LIMITS = { chats: 50, needs: 12, evidence: 20, evidenceCharacters: 24_000 } as const;

export function onlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new IntegrationError('invalid_job');
}
function list(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) throw new IntegrationError('invalid_job');
  return value;
}
function id(value: unknown): string {
  const result = string(value);
  if (['__proto__', 'prototype', 'constructor'].includes(result)) throw new IntegrationError('invalid_job');
  return result;
}
export const evidenceKey = (ref: EvidenceCitation) => JSON.stringify([ref.chatId, ref.messageId]);

/** Reject unknown fields in catalog/evidence: previews, participants and permissions cannot sneak into a prompt. */
export function parseJobV1(input: unknown, { allowReal = false }: { allowReal?: boolean } = {}): AgentJobV1 {
  const v = record(input);
  if (typeof v.synthetic !== 'boolean' || (!v.synthetic && !allowReal)) throw new IntegrationError('non_synthetic_job');
  if (v.version !== 'v1' || !['chat', 'suggest_chats'].includes(String(v.kind))) throw new IntegrationError('invalid_job');
  onlyKeys(v, ['version', 'id', 'userId', 'requestId', 'leaseId', 'leaseExpiresAt', 'deadlineAt', 'contextVersion', 'synthetic', 'kind', 'payload', 'ownerVerified', 'authorization']);
  if (v.ownerVerified !== true) throw new IntegrationError('unverified_owner');
  const auth = record(v.authorization);
  onlyKeys(auth, ['userId', 'contextVersion', 'bindingVersion']);
  if (id(auth.userId) !== v.userId || id(auth.contextVersion) !== v.contextVersion) throw new IntegrationError('invalid_job');
  id(auth.bindingVersion);
  validateLease(v);
  const p = record(v.payload);
  if (v.kind === 'suggest_chats') {
    onlyKeys(p, ['snapshotId', 'contextVersion', 'needs', 'chats']);
    id(p.snapshotId);
    if (id(p.contextVersion) !== v.contextVersion) throw new IntegrationError('invalid_job');
    for (const need of list(p.needs, V1_LIMITS.needs)) string(need, 500);
    const ids = new Set<string>();
    for (const raw of list(p.chats, V1_LIMITS.chats)) {
      const c = record(raw); onlyKeys(c, ['id', 'name', 'type']);
      const chatId = id(c.id); string(c.name, 200, true);
      if (ids.has(chatId) || !['direct', 'group', 'unknown'].includes(String(c.type))) throw new IntegrationError('invalid_job');
      ids.add(chatId);
    }
  } else {
    onlyKeys(p, ['conversationId', 'text', 'ownerVerified', 'messages', 'concern', 'plan', 'context']);
    if (p.ownerVerified !== true) throw new IntegrationError('unverified_owner');
    const context = record(p.context);
    onlyKeys(context, ['profile', 'memory', 'examples', 'evidence', 'authorization']);
    const a = record(context.authorization);
    onlyKeys(a, ['userId', 'contextVersion', 'selectionVersion', 'selectedChats']);
    if (id(a.userId) !== v.userId || id(a.contextVersion) !== v.contextVersion) throw new IntegrationError('invalid_job');
    id(a.selectionVersion);
    const grants = new Map<string, string>();
    for (const raw of list(a.selectedChats, 200)) {
      const grant = record(raw); onlyKeys(grant, ['chatId', 'generation']);
      const chatId = id(grant.chatId);
      if (grants.has(chatId)) throw new IntegrationError('invalid_job');
      grants.set(chatId, id(grant.generation));
    }
    let characters = 0;
    const seen = new Set<string>();
    for (const raw of list(context.evidence, V1_LIMITS.evidence)) {
      const e = record(raw); onlyKeys(e, ['chatId', 'messageId', 'text', 'sentAt', 'selectionGeneration']);
      const chatId = id(e.chatId), messageId = id(e.messageId);
      characters += string(e.text, 4000).length; timestamp(e.sentAt);
      if (grants.get(chatId) !== id(e.selectionGeneration)) throw new IntegrationError('untrusted_origin');
      const key = evidenceKey({ chatId, messageId });
      if (seen.has(key) || characters > V1_LIMITS.evidenceCharacters) throw new IntegrationError('invalid_job');
      seen.add(key);
    }
  }
  return structuredClone(v) as unknown as AgentJobV1;
}

export const createV1Protocol = (allowReal = false) => ({ version: 'v1', parseJob: (input: unknown) => parseJobV1(input, { allowReal }) } as const);
export const V1_PROTOCOL = createV1Protocol();
