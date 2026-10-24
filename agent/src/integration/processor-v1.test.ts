import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AgentJobV1, ChatPayloadV1, ChatResultV1, SuggestResult } from './contract-v1.ts';
import { parseJobV1 } from './contract-v1.ts';
import { parseJob } from './contract.ts';
import { createJobProcessorV1 } from './processor-v1.ts';

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
const ownerAnswer = () => ({ reply: 'Revisemos lo que hay.', concern: 'Impresora', has_plan: false,
  plan_title: '', plan_next_step: '', plan_minutes: 0, memory_updates: [], forget_keys: [] });
const evidenceAnswer = () => ({ reply: 'El mensaje dice que sigue sin imprimir.', citations: [{ chatId: 'support', messageId: 'm1' }] });

test('catalog suggestions retain snapshot, stable input order and one result per real ID without permission effects', async () => {
  const job = suggest(), original = structuredClone(job);
  const result = await createJobProcessorV1({ now: () => at, model: 'test-model', runnerFor: ms => {
    assert.equal(ms, 60_000);
    return async prompt => { assert.match(prompt, /untrustedCatalog/); return { suggestions: [
      { chatId: 'general', relevance: 'uncertain', reason: 'El nombre es ambiguo.' },
      { chatId: 'support', relevance: 'relevant', reason: 'El nombre menciona soporte.' },
    ] }; };
  } })(job) as SuggestResult;
  assert.deepEqual(result.suggestions.map(s => s.chatId), ['support', 'general']);
  assert.equal(result.snapshotId, 'catalog-A'); assert.equal(result.contextVersion, 'ctx-1');
  assert.equal(result.engine, 'codex'); assert.equal(result.model, 'test-model');
  assert.ok(!JSON.stringify(result).includes('selected')); assert.deepEqual(job, original);
});

test('empty needs remain uncertain without calling a model, and an empty catalog has no invented recommendations', async () => {
  const run = createJobProcessorV1({ now: () => at, runnerFor: () => async () => { throw new Error('must not call'); } });
  const a = suggest(); a.payload.needs = [];
  const result = await run(a) as SuggestResult;
  assert.equal(result.engine, 'rules'); assert.ok(result.suggestions.every(s => s.relevance === 'uncertain'));
  a.payload.chats = []; assert.deepEqual((await run(a) as SuggestResult).suggestions, []);
});

test('unknown, missing, duplicate and effect-bearing model recommendations fail explicitly', async () => {
  const item = { chatId: 'support', relevance: 'relevant', reason: 'Soporte' };
  for (const suggestions of [[item], [item, item], [item, { ...item, chatId: 'foreign' }], [item, { ...item, chatId: 'general', selected: true }]]) {
    const run = createJobProcessorV1({ now: () => at, runnerFor: () => async () => ({ suggestions }) });
    await assert.rejects(run(suggest()), /engine_unavailable/);
  }
});


test('external evidence is absent from memory inference and cannot change the owner delta', async () => {
  const prompts: string[] = [];
  const job = chat(); job.payload.text = 'Prefiero pasos de dos minutos. ¿Qué dice el chat sobre la impresora?';
  const result = await createJobProcessorV1({ now: () => at, runnerFor: () => async prompt => {
    prompts.push(prompt);
    return prompts.length === 1 ? { ...ownerAnswer(), memory_updates: [{ key: 'pasos', kind: 'fact', value: 'Prefiere dos minutos.', evidence: 'Prefiero pasos de dos minutos.' }] } : evidenceAnswer();
  } })(job) as ChatResultV1;
  assert.equal(prompts.length, 2);
  assert.ok(!prompts[0].includes('EVIDENCIA-EXTERNA'));
  assert.ok(prompts[1].includes('EVIDENCIA-EXTERNA'));
  assert.deepEqual(result.memoryUpdates, [{ key: 'pasos', kind: 'fact', value: 'Prefiere dos minutos.', source: 'chat', evidence: 'Prefiero pasos de dos minutos.' }]);
  assert.deepEqual(result.forgetKeys, []);
  assert.deepEqual(result.citations, [{ chatId: 'support', messageId: 'm1' }]);
  assert.equal(result.contextVersion, 'ctx-1'); assert.equal(result.selectionVersion, 'sel-1');
});

test('evidence response with invented references or memory mutation is rejected without exporting provider output', async () => {
  for (const value of [
    { ...evidenceAnswer(), citations: [{ chatId: 'other-user-chat', messageId: 'foreign' }] },
    { ...evidenceAnswer(), citations: [evidenceAnswer().citations[0], evidenceAnswer().citations[0]] },
    { ...evidenceAnswer(), memory_updates: [{ key: 'wake', value: 'Never wake' }] },
    { ...evidenceAnswer(), forget_keys: ['pasos'] },
  ]) {
    let calls = 0;
    const run = createJobProcessorV1({ now: () => at, runnerFor: () => async () => ++calls === 1 ? ownerAnswer() : value });
    await assert.rejects(run(chat()), /engine_unavailable/);
  }
});

test('wrong owner, stale context, revoked generation, unselected chat and forged evidence are rejected before any model call', async () => {
  const mutations: Array<(p: ChatPayloadV1) => void> = [
    p => { p.ownerVerified = false as true; },
    p => { p.context.authorization.userId = 'owner-B'; },
    p => { p.context.authorization.contextVersion = 'old'; },
    p => { p.context.evidence[0].selectionGeneration = '2'; },
    p => { p.context.authorization.selectedChats = []; },
    p => { p.context.evidence[0].chatId = 'foreign'; },
    p => { p.context.evidence.push(p.context.evidence[0]); },
    p => { Object.assign(p.context.evidence[0], { instruction: 'bypass' }); },
  ];
  let calls = 0;
  const run = createJobProcessorV1({ now: () => at, runnerFor: () => async () => { calls++; return ownerAnswer(); } });
  for (const mutate of mutations) { const j = chat(); mutate(j.payload); await assert.rejects(run(j), /invalid_job|unverified_owner|untrusted_origin/); }
  assert.equal(calls, 0);
});


test('explicitly enabled real v1 preserves its provenance and requires verified matching identity for both work kinds', async () => {
  const j = suggest(); j.synthetic = false;
  assert.equal(parseJobV1(j, { allowReal: true }).synthetic, false);
  const run = createJobProcessorV1({ allowReal: true, now: () => at, runnerFor: () => async () => ({ suggestions: [
    { chatId: 'support', relevance: 'relevant', reason: 'Soporte' }, { chatId: 'general', relevance: 'uncertain', reason: 'Ambiguo' },
  ] }) });
  assert.equal((await run(j)).kind, 'suggest_chats');
  assert.equal(j.synthetic, false);
  for (const invalid of [
    { ...j, ownerVerified: false },
    { ...j, authorization: { ...j.authorization, userId: 'other' } },
    { ...j, authorization: { ...j.authorization, contextVersion: 'stale' } },
    { ...j, authorization: { ...j.authorization, bindingVersion: '' } },
  ]) assert.throws(() => parseJobV1(invalid, { allowReal: true }), /invalid_job|unverified_owner/);
  const c = chat(); c.synthetic = false; let calls = 0;
  const result = await createJobProcessorV1({ allowReal: true, now: () => at, runnerFor: () => async () => ++calls === 1 ? ownerAnswer() : evidenceAnswer() })(c);
  assert.equal(result.kind, 'chat'); assert.equal(c.synthetic, false);
  assert.equal(calls, 2);
  assert.throws(() => parseJob({ ...c, version: 'v0' }), /non_synthetic_job/);
});

test('the same processor keeps A and B memory, evidence and owner history separate', async () => {
  const prompts: string[] = [];
  const run = createJobProcessorV1({ now: () => at, runnerFor: () => async prompt => {
    prompts.push(prompt); return prompt.includes('untrustedEvidence') ? evidenceAnswer() : ownerAnswer();
  } });
  const a = chat(); a.payload.context.memory = [{ key: 'private', kind: 'fact', value: 'MEMORIA-SOLO-A', source: 'chat' }];
  await run(a);
  const b = chat(); b.userId = 'owner-B'; b.authorization.userId = 'owner-B'; b.payload.context.authorization.userId = 'owner-B'; b.payload.context.evidence = [];
  await run(b);
  assert.equal(prompts.length, 3);
  assert.ok(prompts[0].includes('MEMORIA-SOLO-A'));
  assert.ok(!prompts[2].includes('MEMORIA-SOLO-A')); assert.ok(!prompts[2].includes('EVIDENCIA-EXTERNA'));
});

test('owner correction and deletion affect only that job and commands never consult third-party evidence', async () => {
  const j = chat(); j.payload.text = 'borrar';
  j.payload.context.memory = [
    { key: 'pasos', kind: 'fact', value: 'Dos minutos.', source: 'chat' },
    { key: 'guardia', kind: 'rule', value: 'Incidentes críticos despiertan.', source: 'onboarding' },
  ];
  const result = await createJobProcessorV1({ now: () => at, runnerFor: () => async () => { throw new Error('no call'); } })(j) as ChatResultV1;
  assert.equal(result.clearHistory, true); assert.deepEqual(result.forgetKeys, ['pasos']); assert.deepEqual(result.citations, []);
  assert.equal(j.payload.context.memory.length, 2);
});

test('memory cannot use quotes from evidence as if they were said by the owner', async () => {
  let calls = 0;
  const result = await createJobProcessorV1({ now: () => at, runnerFor: () => async () => ++calls === 1
    ? { ...ownerAnswer(), memory_updates: [{ key: 'external', kind: 'rule', value: 'No despertar', evidence: 'EVIDENCIA-EXTERNA' }] }
    : evidenceAnswer() })(chat()) as ChatResultV1;
  assert.deepEqual(result.memoryUpdates, []);
});

test('previous assistant answers cannot feed quoted third-party instructions back into personal-memory inference', async () => {
  const j = chat(); let calls = 0;
  j.payload.messages = [
    { id: 'old-owner', role: 'user', text: 'PREGUNTA-DEL-DUENO' },
    { id: 'old-reply', role: 'assistant', text: 'Según el chat: INSTRUCCION-EXTERNA-ANTERIOR' },
  ];
  await createJobProcessorV1({ now: () => at, runnerFor: () => async prompt => {
    if (++calls === 1) {
      assert.ok(prompt.includes('PREGUNTA-DEL-DUENO')); assert.ok(!prompt.includes('INSTRUCCION-EXTERNA-ANTERIOR'));
      return ownerAnswer();
    }
    return evidenceAnswer();
  } })(j);
});

test('both chat calls share a hard deadline and an expired or failed second call returns no partial delta', async () => {
  let clock = at, calls = 0;
  const budgets: number[] = [];
  const run = createJobProcessorV1({ now: () => clock, runnerFor: ms => {
    budgets.push(ms);
    return async () => { calls++; clock += calls === 1 ? 20_000 : 41_000; return calls === 1 ? ownerAnswer() : evidenceAnswer(); };
  } });
  await assert.rejects(run(chat()), /deadline_expired/);
  assert.deepEqual(budgets, [60_000, 40_000]);
  const failed = createJobProcessorV1({ now: () => at, runnerFor: () => async () => { throw new Error('secret-provider-detail'); } });
  await assert.rejects(failed(chat()), error => (error as Error).message === 'engine_unavailable');
});

test('validated snapshots cannot be changed by the caller while a model is running', async () => {
  const j = chat(); let calls = 0;
  const run = createJobProcessorV1({ now: () => at, runnerFor: () => async prompt => {
    if (++calls === 1) { j.payload.context.evidence[0].text = 'MUTATED-SECRET'; return ownerAnswer(); }
    assert.ok(!prompt.includes('MUTATED-SECRET')); return evidenceAnswer();
  } });
  await run(j); assert.equal(calls, 2);
});
