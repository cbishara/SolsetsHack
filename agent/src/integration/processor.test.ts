import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createJobProcessor, decideForServer } from './processor.ts';
import type { AgentJob, JobContext, ChatResult, ClassifyResult } from './contract.ts';
import { IntegrationError, parseJob } from './contract.ts';

const at = Date.parse('2026-10-23T23:00:00Z');
const context = (): JobContext => ({ profile: { name: 'Rodrigo', role: 'Soporte TI' }, memory: [], examples: [] });
export function chatJob(): AgentJob {
  return { version: 'v0', id: randomUUID(), userId: 'rodrigo-demo', requestId: randomUUID(), leaseId: randomUUID(),
    leaseExpiresAt: new Date(at + 90_000).toISOString(), deadlineAt: new Date(at + 120_000).toISOString(), contextVersion: '1', synthetic: true,
    kind: 'chat', payload: { conversationId: 'demo', text: 'Prefiero pasos de dos minutos', ownerVerified: true,
      messages: [], concern: '', plan: null, context: context() } };
}
const answer = () => ({ reply: 'Empecemos con dos minutos.', concern: 'Revisar impresora', has_plan: true,
  plan_title: 'Primer paso', plan_next_step: 'Comprobar si la impresora está encendida.', plan_minutes: 2,
  memory_updates: [{ key: 'step-length', kind: 'fact', value: 'Prefiere pasos de dos minutos', evidence: 'Prefiero pasos de dos minutos' }], forget_keys: [] });
function classifierJob(): AgentJob {
  return { ...chatJob(), kind: 'classify', payload: { context: context(), message: { id: 'mail-demo', externalId: 'mail-1',
    source: 'email', sender: 'Compañero ficticio', text: 'Mañana revisa la impresora', receivedAt: new Date(at).toISOString() } } };
}

test('chat returns a delta, literal memory evidence and a real engine label without persisting a user snapshot', async () => {
  const j = chatJob();
  const original = structuredClone(j);
  const run = createJobProcessor({ now: () => at, runnerFor: timeout => {
    assert.equal(timeout, 60_000);
    return async prompt => { assert.match(prompt, /Rodrigo/); return answer(); };
  } });
  const result = await run(j) as ChatResult;
  assert.equal(result.kind, 'chat');
  assert.equal(result.reply.inference?.engine, 'codex');
  assert.equal(result.plan?.minutes, 2);
  assert.deepEqual(result.memoryUpdates, [{ key: 'step-length', kind: 'fact', value: 'Prefiere pasos de dos minutos', source: 'chat', evidence: 'Prefiero pasos de dos minutos' }]);
  assert.ok(!('messages' in result));
  assert.equal(result.clearHistory, false);
  assert.deepEqual(j, original);
});

test('classification adapts email/camelCase and leaves final policy to the server', async () => {
  const result = await createJobProcessor({ now: () => at, runnerFor: timeout => {
    assert.equal(timeout, 25_000);
    return async prompt => { assert.match(prompt, /Canal: gmail/); return { decision: 'PARTE', reason: 'Caso nuevo.', is_new: true, confidence: 0.9 }; };
  } })(classifierJob()) as ClassifyResult;
  assert.equal(result.decision, 'report');
  assert.equal(result.messageId, 'mail-demo');
  assert.equal(result.isNew, true);
  assert.ok(result.incidentKey.length > 0);
  const verdict = decideForServer(result, { night: { onCall: true }, settings: { mode: 'shadow' }, recent: [] }, new Date(at).toISOString());
  assert.equal(verdict.decision, 'wake');
  assert.equal(verdict.wouldWake, true);
});

test('failed classification uses conservative rules and never exports provider logs', async () => {
  const result = await createJobProcessor({ now: () => at, runnerFor: () => async () => { throw new Error('secret-provider-output'); } })(classifierJob()) as ClassifyResult;
  assert.equal(result.engine, 'rules');
  assert.equal(result.fallbackReason, 'engine_unavailable');
  assert.ok(!JSON.stringify(result).includes('secret-provider-output'));
});

test('the same processor never carries one user memory into another job', async () => {
  const prompts: string[] = [];
  const run = createJobProcessor({ now: () => at, runnerFor: () => async prompt => { prompts.push(prompt); return answer(); } });
  const a = chatJob();
  a.payload.context.memory = [{ key: 'private', kind: 'fact', value: 'PREFERENCIA-SOLO-A', source: 'chat' }];
  await run(a);
  const b = chatJob(); b.userId = 'another-demo-user';
  await run(b);
  assert.ok(prompts[0].includes('PREFERENCIA-SOLO-A'));
  assert.ok(!prompts[1].includes('PREFERENCIA-SOLO-A'));
});

test('unverified owners, real data and imported/outgoing/unknown WhatsApp do not invoke Codex', async () => {
  let calls = 0;
  const run = createJobProcessor({ now: () => at, runnerFor: () => async () => { calls++; return answer(); } });
  const owner = chatJob();
  (owner.payload as unknown as Record<string, unknown>).ownerVerified = false;
  await assert.rejects(run(owner), (e: IntegrationError) => e.code === 'unverified_owner');
  await assert.rejects(run({ ...chatJob(), synthetic: false } as unknown as AgentJob), (e: IntegrationError) => e.code === 'non_synthetic_job');
  for (const [origin, direction] of [['history', 'incoming'], ['webhook', 'outgoing'], ['webhook', 'unknown']]) {
    const job = classifierJob();
    assert.equal(job.kind, 'classify');
    if (job.kind !== 'classify') throw new Error();
    job.payload.message.source = 'whatsapp';
    Object.assign(job.payload, { origin, direction });
    await assert.rejects(run(job), (e: IntegrationError) => e.code === 'untrusted_origin');
  }
  assert.equal(calls, 0);
});

test('an unavailable chat is a fixed failure code and cannot overwrite shared context', async () => {
  const run = createJobProcessor({ now: () => at, runnerFor: () => async () => { throw new Error('credentials must not escape'); } });
  await assert.rejects(run(chatJob()), (e: IntegrationError) => e.code === 'engine_unavailable' && !e.message.includes('credentials'));
});

test('borrar returns explicit deletion of chat memory and preserves onboarding', async () => {
  const job = chatJob(); if (job.kind !== 'chat') throw new Error();
  job.payload.text = 'BORRAR';
  job.payload.context.memory = [
    { key: 'chat-pref', kind: 'fact', value: 'Dos minutos', source: 'chat' },
    { key: 'onboard-rule', kind: 'rule', value: 'Facturación despierta', source: 'onboarding' },
  ];
  const result = await createJobProcessor({ now: () => at, runnerFor: () => async () => { throw new Error('must not invoke'); } })(job) as ChatResult;
  assert.equal(result.clearHistory, true);
  assert.deepEqual(result.forgetKeys, ['chat-pref']);
  assert.deepEqual(result.memoryUpdates, []);
  assert.equal(result.reply.inference?.engine, 'command');
});

test('bad payloads and expired leases fail before inference; late results are rejected too', async () => {
  let calls = 0, now = at;
  const run = createJobProcessor({ now: () => now, runnerFor: () => async () => { calls++; now += 200_000; return answer(); } });
  const bad = chatJob(); bad.payload.context.memory = [{ key: 'x', kind: 'fact', value: 'v', source: 'chat' }, { key: 'x', kind: 'fact', value: 'duplicate', source: 'chat' }];
  await assert.rejects(run(bad), /invalid_job/);
  await assert.rejects(run({ ...chatJob(), leaseExpiresAt: new Date(at - 1).toISOString() }), /deadline_expired/);
  assert.equal(calls, 0);
  await assert.rejects(run(chatJob()), /deadline_expired/);
  assert.equal(calls, 1);
  assert.throws(() => parseJob({ ...chatJob(), requestId: 'bad' }), /invalid_job/);
});

test('server policy respects current duplicate/off-duty state and validates confidence', () => {
  const c = { messageId: 'm2', decision: 'wake' as const, reason: 'Urgente', isNew: false, confidence: 0.9, incidentKey: 'incident' };
  const context = { night: { onCall: true }, settings: { mode: 'active' as const }, recent: [
    { messageId: 'm1', incidentKey: 'incident', wouldWake: true, message: { receivedAt: new Date(at - 10 * 60_000).toISOString() } },
  ] };
  assert.equal(decideForServer(c, context, new Date(at).toISOString()).why, 'duplicate');
  const off = decideForServer(c, { ...context, night: { onCall: false }, recent: [] }, new Date(at).toISOString());
  assert.equal(off.why, 'off_duty'); assert.equal(off.wouldWake, false);
  assert.throws(() => decideForServer({ ...c, confidence: NaN }, context, new Date(at).toISOString()), /invalid_job/);
});
