import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { IdentityError, IdentityService } from '../src/multiuser/identity.ts';
import { MemoryMultiUserStore, type MultiUserStore } from '../src/multiuser/store.ts';
import { CHAT_SCENARIOS, SyntheticAgentQueue, fixtureRouter, workerRouter, type AgentChatJob, type ChatResult } from '../src/multiuser/agent-queue.ts';

const secret = 'synthetic-identity-secret-for-test-12345678';
const workerToken = 'synthetic-worker-secret-not-for-users-12345678';
const errorCode = (code: string) => (error: unknown) => error instanceof IdentityError && error.code === code;
async function fixture() {
  let now = Date.parse('2026-10-23T22:00:00.000Z');
  const clock = () => now;
  const store = new MemoryMultiUserStore();
  const identity = new IdentityService(store, { secret, clock });
  const queue = new SyntheticAgentQueue(store, identity, { clock });
  const session = await identity.createSession(), secondSession = await identity.createSession();
  const a = await identity.authenticate(session.token), b = await identity.authenticate(secondSession.token);
  return { store, identity, queue, a, b, session, secondSession, clock, advance(ms: number) { now += ms; } };
}
function result(job: AgentChatJob, overrides: Partial<ChatResult> = {}): ChatResult {
  return { kind: 'chat', reply: { id: `${job.requestId}:reply`, role: 'assistant', text: 'Dejemos un paso breve para mañana.', inference: { engine: 'codex', model: 'synthetic-model' } },
    concern: 'Preparar reunión ficticia', plan: { title: 'Primer paso', nextStep: 'Anotar dos ideas.', minutes: 2 },
    memoryUpdates: [], forgetKeys: [], clearHistory: false, ...overrides };
}
async function claimed(f: Awaited<ReturnType<typeof fixture>>, text: string = CHAT_SCENARIOS.two_minute_steps) {
  const requestId = randomUUID();
  const enqueued = await f.queue.enqueueSyntheticChat(f.a, { requestId, text });
  const claimRequestId = randomUUID();
  const job = (await f.queue.claim({ workerId: 'quito-synthetic', requestId: claimRequestId }))!;
  return { enqueued, job, requestId, claimRequestId };
}

test('enqueue UUID is idempotent per user, rejects changed text and isolates the same UUID across users', async () => {
  const f = await fixture(), requestId = randomUUID();
  const one = await f.queue.enqueueSyntheticChat(f.a, { requestId, text: 'Caso sintético A.' });
  const repeat = await f.queue.enqueueSyntheticChat(f.a, { requestId, text: 'Caso sintético A.' });
  assert.deepEqual(one, repeat);
  await assert.rejects(f.queue.enqueueSyntheticChat(f.a, { requestId, text: 'Texto diferente.' }), errorCode('request_id_reused'));
  const other = await f.queue.enqueueSyntheticChat(f.b, { requestId, text: 'Caso sintético B.' });
  assert.notEqual(other.jobId, one.jobId);
  assert.deepEqual((await f.queue.state(f.a)).operations.map(j => j.jobId), [one.jobId]);
  assert.deepEqual((await f.queue.state(f.b)).operations.map(j => j.jobId), [other.jobId]);
});

test('claim is atomic under concurrency and a lost response recovers exactly the same lease', async () => {
  const f = await fixture();
  await f.queue.enqueueSyntheticChat(f.a, { requestId: randomUUID(), text: 'Prueba de reserva.' });
  const requestId = randomUUID();
  const answers = await Promise.all(Array.from({ length: 8 }, () => f.queue.claim({ workerId: 'same-worker', requestId })));
  assert.ok(answers[0]);
  for (const answer of answers) assert.deepEqual(answer, answers[0]);
  const otherClaims = await Promise.all(Array.from({ length: 8 }, (_, i) => f.queue.claim({ workerId: `worker-${i}`, requestId: randomUUID() })));
  assert.ok(otherClaims.every(answer => answer === null));
  await assert.rejects(f.queue.claim({ workerId: 'different-worker', requestId }), errorCode('claim_id_reused'));
});

test('an empty claim UUID remains empty after later work arrives', async () => {
  const f = await fixture(), requestId = randomUUID();
  assert.equal(await f.queue.claim({ workerId: 'w', requestId }), null);
  await f.queue.enqueueSyntheticChat(f.a, { requestId: randomUUID(), text: 'Trabajo posterior.' });
  assert.equal(await f.queue.claim({ workerId: 'w', requestId }), null);
  assert.ok(await f.queue.claim({ workerId: 'w', requestId: randomUUID() }));
});

test('completion persists conversation/memory atomically, preserves real engine metadata and replays reordered JSON once', async () => {
  const f = await fixture(), c = await claimed(f);
  const answer = result(c.job, { memoryUpdates: [{ key: 'pasos', kind: 'fact', value: 'Prefiere pasos de dos minutos.', source: 'chat', evidence: 'Prefiero pasos de dos minutos.' }] });
  assert.deepEqual(await f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: answer }), { status: 'accepted' });
  const reordered = Object.fromEntries(Object.entries(answer).reverse());
  await f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: reordered });
  const restarted = new SyntheticAgentQueue(f.store, f.identity, { clock: f.clock });
  await restarted.accept(c.job.id, { leaseId: c.job.leaseId, result: answer });
  const state = await restarted.state(f.a);
  assert.equal(state.version, 1);
  assert.equal(state.messages.length, 2);
  assert.equal(state.messages[1].inference?.engine, 'codex');
  assert.equal(state.memory[0].evidence, 'Prefiero pasos de dos minutos.');
  assert.equal((await restarted.state(f.b)).memory.length, 0);
  assert.equal(await restarted.claim({ workerId: 'quito-synthetic', requestId: c.claimRequestId }), null);
});

test('worker cannot invent memory evidence, spoof result user, reply ID, role or successful fallback', async () => {
  const f = await fixture(), c = await claimed(f);
  await assert.rejects(f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: result(c.job, { memoryUpdates: [{ key: 'invented', kind: 'fact', value: 'Dato ajeno.', source: 'chat', evidence: 'No existe esta cita.' }] }) }), errorCode('invalid_memory_evidence'));
  await assert.rejects(f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: { ...result(c.job), userId: f.b.userId } }));
  const wrongReply = result(c.job); wrongReply.reply.id = `${randomUUID()}:reply`;
  await assert.rejects(f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: wrongReply }), errorCode('invalid_chat_result'));
  const fallback = result(c.job); (fallback.reply.inference as { engine: string }).engine = 'rules';
  await assert.rejects(f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: fallback }));
  assert.equal((await f.queue.state(f.a)).version, 0);
  assert.equal((await f.queue.state(f.b)).version, 0);
});

test('concurrent context changes return409 without overwriting newer memory', async () => {
  const f = await fixture();
  await f.queue.enqueueSyntheticChat(f.a, { requestId: randomUUID(), text: 'Prefiero pasos de dos minutos.' });
  await f.queue.enqueueSyntheticChat(f.a, { requestId: randomUUID(), text: 'Prefiero pasos de cinco minutos.' });
  const one = (await f.queue.claim({ workerId: 'w1', requestId: randomUUID() }))!;
  const two = (await f.queue.claim({ workerId: 'w2', requestId: randomUUID() }))!;
  const firstAnswer = result(one, { memoryUpdates: [{ key: 'pasos', kind: 'fact', value: one.payload.text, source: 'chat', evidence: one.payload.text }] });
  await f.queue.accept(one.id, { leaseId: one.leaseId, result: firstAnswer });
  await assert.rejects(f.queue.accept(two.id, { leaseId: two.leaseId, result: result(two) }), errorCode('context_changed'));
  const state = await f.queue.state(f.a);
  assert.equal(state.version, 1);
  assert.equal(state.memory[0].value, one.payload.text);
  assert.equal(state.operations.find(j => j.jobId === two.id)?.error, 'context_changed');
});

test('expired claimed work becomes uncertain and is never requeued or accepted late', async () => {
  const f = await fixture(), c = await claimed(f);
  f.advance(90_000);
  assert.equal(await f.queue.claim({ workerId: 'quito-synthetic', requestId: c.claimRequestId }), null);
  assert.equal(await f.queue.claim({ workerId: 'another', requestId: randomUUID() }), null);
  await assert.rejects(f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: result(c.job) }), errorCode('stale_lease'));
  assert.equal((await f.queue.state(f.a)).operations[0].status, 'uncertain');
  assert.equal((await f.queue.state(f.a)).version, 0);
});

test('wrong leases and conflicting duplicate results are rejected', async () => {
  const f = await fixture(), c = await claimed(f);
  await assert.rejects(f.queue.accept(c.job.id, { leaseId: randomUUID(), result: result(c.job) }), errorCode('stale_lease'));
  await f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: result(c.job) });
  await assert.rejects(f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: result(c.job, { concern: 'Otro resultado.' }) }), errorCode('result_already_applied'));
});

test('interrupted inference is acknowledged idempotently, remains uncertain and never runs again', async () => {
  const f = await fixture(), c = await claimed(f);
  const body = { leaseId: c.job.leaseId, code: 'inference_interrupted' as const };
  assert.deepEqual(await f.queue.fail(c.job.id, body), { status: 'failed' });
  assert.deepEqual(await f.queue.fail(c.job.id, body), { status: 'failed' });
  assert.equal((await f.queue.state(f.a)).operations[0].status, 'uncertain');
  assert.equal(await f.queue.claim({ workerId: 'new-worker', requestId: randomUUID() }), null);
});

test('clearHistory is accepted only for owner borrar command and clears only that users chat data', async () => {
  const f = await fixture(), first = await claimed(f);
  await assert.rejects(f.queue.accept(first.job.id, { leaseId: first.job.leaseId, result: result(first.job, { clearHistory: true }) }), errorCode('invalid_chat_result'));
  await f.queue.accept(first.job.id, { leaseId: first.job.leaseId, result: result(first.job, { memoryUpdates: [{ key: 'pasos', kind: 'fact', value: 'Dos minutos.', source: 'chat', evidence: 'dos minutos' }] }) });
  const clear = await claimed(f, 'borrar');
  const answer = result(clear.job, { clearHistory: true, forgetKeys: ['pasos'], concern: '', plan: null });
  answer.reply.inference = { engine: 'command' };
  await f.queue.accept(clear.job.id, { leaseId: clear.job.leaseId, result: answer });
  const state = await f.queue.state(f.a);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].role, 'assistant');
  assert.equal(state.memory.length, 0);
  assert.equal((await f.queue.state(f.b)).version, 0);
});

test('failure during completion rolls back memory and messages; retry applies the delta once', async () => {
  const f = await fixture(), c = await claimed(f);
  const faulty: MultiUserStore = { close: () => f.store.close(), transaction: run => f.store.transaction(tx => run({ ...tx,
    async put(bucket, key, value) { if (bucket === 'agent_demo_jobs' && (value as { status: string }).status === 'accepted') throw new Error('Synthetic database failure'); await tx.put(bucket, key, value); },
  })) };
  const faultyQueue = new SyntheticAgentQueue(faulty, f.identity, { clock: f.clock });
  await assert.rejects(faultyQueue.accept(c.job.id, { leaseId: c.job.leaseId, result: result(c.job) }), /Synthetic database failure/);
  assert.equal((await f.queue.state(f.a)).messages.length, 0);
  await f.queue.accept(c.job.id, { leaseId: c.job.leaseId, result: result(c.job) });
  assert.equal((await f.queue.state(f.a)).messages.length, 2);
});

test('HTTP fixture chat requires individual session, fixed scenario and live worker; exact v0 worker flow persists response', async t => {
  const f = await fixture(), app = express();
  app.use(express.json());
  app.use('/internal/agent/v0', workerRouter(f.queue, { workerToken }));
  app.use('/api/v1/demo', fixtureRouter(f.queue, f.identity));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, token: string, body: unknown) => fetch(origin + path, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post('/internal/agent/v0/claim', f.session.token, { workerId: 'w', requestId: randomUUID() })).status, 401);
  assert.equal((await post('/api/v1/demo/chat', workerToken, { requestId: randomUUID(), scenario: 'two_minute_steps' })).status, 401);
  assert.equal((await post('/api/v1/demo/chat', f.session.token, { requestId: randomUUID(), scenario: 'two_minute_steps' })).status, 503);
  assert.equal((await post('/internal/agent/v0/claim', workerToken, { workerId: 'w', requestId: randomUUID() })).status, 204);
  assert.equal((await post('/api/v1/demo/chat', f.session.token, { requestId: randomUUID(), text: 'Real text must not be called synthetic', scenario: 'two_minute_steps' })).status, 400);
  const requestId = randomUUID();
  assert.equal((await post('/api/v1/demo/chat', f.session.token, { requestId, scenario: 'two_minute_steps' })).status, 202);
  const claim = await post('/internal/agent/v0/claim', workerToken, { workerId: 'w', requestId: randomUUID() });
  const { job } = await claim.json() as { job: AgentChatJob };
  assert.equal(job.requestId, requestId);
  assert.equal(job.synthetic, true);
  assert.equal(job.payload.text, CHAT_SCENARIOS.two_minute_steps);
  assert.equal((await post(`/internal/agent/v0/jobs/${job.id}/result`, workerToken, { leaseId: job.leaseId, result: result(job) })).status, 200);
  const read = await fetch(origin + '/api/v1/demo/chat', { headers: { authorization: `Bearer ${f.session.token}` } });
  assert.equal((await read.json() as { messages: unknown[] }).messages.length, 2);
  f.advance(15_000);
  assert.equal((await post('/api/v1/demo/chat', f.session.token, { requestId: randomUUID(), scenario: 'new_concern' })).status, 503);
});
