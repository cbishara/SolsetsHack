// Candidate integration v0 for review in #24. This does not change server/ or mobile/.
import type { ChatPlan, ChatMessage } from '../chat.ts';
import type { MemorySource } from '../memory.ts';

export type ServerDecision = 'wake' | 'report' | 'noise';
export interface ServerMessage {
  id: string; externalId: string; source: 'whatsapp' | 'email' | 'simulated';
  sender: string; group?: string; text: string; receivedAt: string;
}
export interface ContextMemory {
  key: string; kind: 'rule' | 'fact'; value: string; source: MemorySource; evidence?: string;
}
export interface JobContext {
  profile: { name: string; role: string };
  memory: ContextMemory[];
  examples: Array<{ text: string; agentDecision: ServerDecision; value: 'right' | 'should_have_woken' | 'should_not_have_woken' }>;
}
export interface ClassifyPayload {
  message: ServerMessage; context: JobContext;
  origin?: 'history' | 'webhook'; direction?: 'incoming' | 'outgoing' | 'unknown';
}
export interface ChatPayload {
  conversationId: string; text: string; ownerVerified: true;
  messages: ChatMessage[]; concern: string; plan: ChatPlan | null; context: JobContext;
}
interface JobBase {
  version: 'v0'; id: string; userId: string; requestId: string; leaseId: string;
  leaseExpiresAt: string; deadlineAt: string; contextVersion: string;
  /** The first integration is restricted to synthetic demo jobs. */
  synthetic: true;
}
export type AgentJob = JobBase & (
  { kind: 'classify'; payload: ClassifyPayload } | { kind: 'chat'; payload: ChatPayload }
);
export interface ServerClassification {
  messageId: string; decision: ServerDecision; reason: string; isNew: boolean; confidence: number; incidentKey: string;
}
export interface ClassifyResult extends ServerClassification {
  kind: 'classify'; engine: 'codex' | 'rules'; model: string | null; fallbackReason: string | null;
}
export interface ChatResult {
  kind: 'chat'; reply: ChatMessage; concern: string; plan: ChatPlan | null;
  memoryUpdates: ContextMemory[]; forgetKeys: string[]; clearHistory: boolean;
}
export type JobResult = ClassifyResult | ChatResult;
export type FailureCode = 'invalid_job' | 'non_synthetic_job' | 'unverified_owner' | 'untrusted_origin' |
  'deadline_expired' | 'engine_unavailable' | 'inference_interrupted';
export class IntegrationError extends Error {
  readonly code: FailureCode;
  constructor(code: FailureCode) { super(code); this.code = code; }
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new IntegrationError('invalid_job');
  return v as Record<string, unknown>;
}
export function string(v: unknown, max = 200, empty = false): string {
  if (typeof v !== 'string' || (!empty && !v.trim()) || v.length > max) throw new IntegrationError('invalid_job');
  return v;
}
export function timestamp(v: unknown): string {
  const text = string(v, 64);
  if (!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(text) || !Number.isFinite(Date.parse(text))) throw new IntegrationError('invalid_job');
  return text;
}
/** Validate the lease before keeping any payload. Detailed payload checks happen before inference. */
export function parseJob(value: unknown): AgentJob {
  const v = record(value);
  if (v.synthetic !== true) throw new IntegrationError('non_synthetic_job');
  if (v.version !== 'v0' || (v.kind !== 'chat' && v.kind !== 'classify')) throw new IntegrationError('invalid_job');
  for (const key of ['id', 'userId', 'leaseId', 'contextVersion']) {
    const id = string(v[key]);
    if (['__proto__', 'constructor', 'prototype'].includes(id)) throw new IntegrationError('invalid_job');
  }
  if (!UUID.test(string(v.requestId))) throw new IntegrationError('invalid_job');
  timestamp(v.deadlineAt); timestamp(v.leaseExpiresAt); record(v.payload);
  if (JSON.stringify(v).length > 128_000) throw new IntegrationError('invalid_job');
  return v as unknown as AgentJob;
}
