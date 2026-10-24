import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AgentJobV1 } from './contract-v1.ts';
import { parseJobV1, V1_LIMITS } from './contract-v1.ts';
import { parseJob } from './contract.ts';

const at = Date.parse('2026-10-23T23:00:00Z');
function base() {
  return { version: 'v1' as const, id: randomUUID(), userId: 'owner-A', requestId: randomUUID(), leaseId: randomUUID(),
    contextVersion: 'ctx-1', synthetic: true as const, ownerVerified: true as const,
    authorization: { userId: 'owner-A', contextVersion: 'ctx-1', bindingVersion: 'binding-1' }, deadlineAt: new Date(at + 120_000).toISOString(), leaseExpiresAt: new Date(at + 90_000).toISOString() };
}
function suggest(): AgentJobV1 & { kind: 'suggest_chats' } {
  return { ...base(), kind: 'suggest_chats', payload: { snapshotId: 'catalog-A', contextVersion: 'ctx-1', needs: ['Guardia de soporte TI'], chats: [
    { id: 'support', name: 'Guardia soporte', type: 'group' }, { id: 'general', name: 'General', type: 'unknown' },
  ] } };
}
function chat(): AgentJobV1 & { kind: 'chat' } {
  return { ...base(), kind: 'chat', payload: { ownerVerified: true, conversationId: 'shared-app-bot', text: '¿Qué dice el chat sobre la impresora?',
    messages: [], concern: '', plan: null, context: { profile: { name: 'Rodrigo ficticio', role: 'Soporte TI' }, memory: [], examples: [],
      evidence: [{ chatId: 'support', messageId: 'm1', text: 'EVIDENCIA-EXTERNA: Sigue sin imprimir.', sentAt: new Date(at).toISOString(), selectionGeneration: '3' }],
      authorization: { userId: 'owner-A', contextVersion: 'ctx-1', selectionVersion: 'sel-1', selectedChats: [{ chatId: 'support', generation: '3' }] } } } };
}

test('catalog cannot carry messages, previews, phone or participants; oversized or duplicate batches fail before inference', async () => {
  for (const field of ['messages', 'preview', 'phone', 'participants']) {
    const job = suggest(); Object.assign(job.payload.chats[0], { [field]: 'private-data' });
    assert.throws(() => parseJobV1(job), /invalid_job/);
  }
  const duplicate = suggest(); duplicate.payload.chats[1].id = 'support';
  assert.throws(() => parseJobV1(duplicate), /invalid_job/);
  const tooMany = suggest(); tooMany.payload.chats = Array.from({ length: V1_LIMITS.chats + 1 }, (_, i) => ({ id: `chat-${i}`, name: 'Demo', type: 'group' }));
  assert.throws(() => parseJobV1(tooMany), /invalid_job/);
  const needs = suggest(); needs.payload.needs = Array.from({ length: 13 }, () => 'need');
  assert.throws(() => parseJobV1(needs), /invalid_job/);
  const stale = suggest(); stale.payload.contextVersion = 'old'; assert.throws(() => parseJobV1(stale), /invalid_job/);
});

test('v0 rejects v1, v1 rejects v0, and v1 rejects real data without explicit opt-in', () => {
  assert.throws(() => parseJob(suggest()), /invalid_job/);
  assert.throws(() => parseJobV1({ ...chat(), version: 'v0' }), /invalid_job/);
  assert.throws(() => parseJobV1({ ...chat(), synthetic: false }), /non_synthetic_job/);
});
