import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorker, workerOrigin, WorkerTransportError } from './worker.ts';
import { FileJournal, MemoryJournal } from './journal.ts';
import { IntegrationError } from './contract.ts';
import type { AgentJob, JobResult } from './contract.ts';

const token = 'synthetic-worker-token-not-for-a-service';
const at = Date.now();
const job = (): AgentJob => ({ version: 'v0', id: randomUUID(), userId: 'synthetic-user', requestId: randomUUID(),
  leaseId: randomUUID(), leaseExpiresAt: new Date(at + 120_000).toISOString(), deadlineAt: new Date(at + 180_000).toISOString(),
  synthetic: true, contextVersion: '1', kind: 'chat', payload: { conversationId: 'demo', text: 'Caso sintético', ownerVerified: true,
    messages: [], concern: '', plan: null, context: { profile: { name: 'Rodrigo ficticio', role: 'Soporte' }, memory: [], examples: [] } } });
const result = (): JobResult => ({ kind: 'chat', reply: { id: 'reply', role: 'assistant', text: 'Respuesta sintética', inference: { engine: 'codex' } },
  concern: 'Pendiente', plan: null, memoryUpdates: [], forgetKeys: [], clearHistory: false });

async function serverFixture(input: AgentJob | null, status = 200) {
  const requests: Array<{ path: string; body: Record<string, unknown>; auth: string | undefined }> = [];
  const server = createServer(async (req, res) => {
    let raw = ''; for await (const c of req) raw += c;
    const body = JSON.parse(raw || '{}');
    requests.push({ path: req.url!, body, auth: req.headers.authorization });
    if (status !== 200) { res.writeHead(status); return res.end(); }
    if (req.url === '/internal/agent/v0/claim' && !input) { res.writeHead(204); return res.end(); }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(req.url === '/internal/agent/v0/claim' ? { job: input } : { status: req.url!.endsWith('/result') ? 'accepted' : 'failed' }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, requests, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}

test('worker claims and delivers over HTTP with its own Bearer and lease, without posting Codex credentials', async () => {
  const j = job(), server = await serverFixture(j), journal = new MemoryJournal();
  try {
    let calls = 0;
    const worker = createWorker({ url: server.url, token, workerId: 'test-mac', journal, process: async () => { calls++; return result(); } });
    assert.equal(await worker.step(), 'delivered');
    assert.equal(calls, 1); assert.equal(journal.read(), null);
    assert.equal(server.requests[0].auth, `Bearer ${token}`);
    assert.equal(server.requests[0].body.workerId, 'test-mac');
    assert.equal(server.requests[1].body.leaseId, j.leaseId);
    assert.equal(Object.hasOwn(server.requests[1].body, 'token'), false);
  } finally { await server.close(); }
});

test('a lost result acknowledgement survives a worker restart and never reruns inference', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'worker-outbox-')), server = await serverFixture(job());
  const path = join(dir, 'outbox.json'), identity = { url: server.url, workerId: 'test' };
  let journal = new FileJournal(path, identity), calls = 0;
  try {
    const lost: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      if (String(input).endsWith('/result')) throw new Error('lost response');
      return response;
    };
    const worker = createWorker({ ...identity, token, journal, fetcher: lost, process: async () => { calls++; return result(); } });
    await assert.rejects(worker.step(), /connection_unavailable/);
    assert.equal(journal.read()?.phase, 'result');
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.ok(!readFileSync(path, 'utf8').includes(token));
    journal.close(); journal = new FileJournal(path, identity);
    const restarted = createWorker({ ...identity, token, journal, process: async () => { calls++; return result(); } });
    assert.equal(await restarted.step(), 'delivered');
    assert.equal(calls, 1);
    const deliveries = server.requests.filter(r => r.path.endsWith('/result'));
    assert.equal(deliveries.length, 2); assert.deepEqual(deliveries[0].body, deliveries[1].body);
  } finally { journal.close(); await server.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a lost claim response retries the same reservation UUID', async () => {
  const s = await serverFixture(job()), journal = new MemoryJournal();
  let first = true;
  try {
    const fetcher: typeof fetch = async (input, init) => {
      const r = await fetch(input, init);
      if (first) { first = false; throw new Error('lost'); }
      return r;
    };
    const worker = createWorker({ url: s.url, token, workerId: 'test', journal, fetcher, process: async () => result() });
    await assert.rejects(worker.step(), /connection_unavailable/);
    await worker.step();
    const claims = s.requests.filter(r => r.path.endsWith('/claim'));
    assert.equal(claims.length, 2); assert.deepEqual(claims[0].body, claims[1].body);
  } finally { await s.close(); }
});

test('a process interrupted during inference reports uncertainty instead of invoking Codex again', async () => {
  const s = await serverFixture(null), journal = new MemoryJournal();
  journal.write({ phase: 'running', job: job() });
  try {
    const w = createWorker({ url: s.url, token, workerId: 'test', journal, process: async () => { throw new Error('must not invoke'); } });
    assert.equal(await w.step(), 'delivered');
    assert.equal(s.requests[0].body.code, 'inference_interrupted');
    assert.ok(s.requests[0].path.endsWith('/failure'));
  } finally { await s.close(); }
});

test('no work is idle; expired leases are not sent to the model; 409 discards a late result', async () => {
  const empty = await serverFixture(null);
  try {
    assert.equal(await createWorker({ url: empty.url, token, workerId: 'test', journal: new MemoryJournal(), process: async () => result() }).step(), 'idle');
  } finally { await empty.close(); }
  const s = await serverFixture(null), journal = new MemoryJournal();
  journal.write({ phase: 'claimed', job: { ...job(), leaseExpiresAt: new Date(at - 1).toISOString() } });
  try {
    await createWorker({ url: s.url, token, workerId: 'test', journal, process: async () => { throw new Error('must not invoke'); } }).step();
    assert.equal(s.requests[0].body.code, 'deadline_expired');
  } finally { await s.close(); }
  const conflict = await serverFixture(null, 409), pending = new MemoryJournal();
  pending.write({ phase: 'result', job: job(), result: result() });
  try {
    assert.equal(await createWorker({ url: conflict.url, token, workerId: 'test', journal: pending, process: async () => result() }).step(), 'discarded');
    assert.equal(pending.read(), null);
  } finally { await conflict.close(); }
});

test('real jobs and auth failures stop explicitly without logging tokens or inferring', async () => {
  const unauthorized = await serverFixture(null, 401);
  try {
    await assert.rejects(createWorker({ url: unauthorized.url, token, workerId: 'test', journal: new MemoryJournal(), process: async () => result() }).step(),
      (e: WorkerTransportError) => e.fatal && e.code === 'worker_unauthorized' && !e.message.includes(token));
  } finally { await unauthorized.close(); }
  const real = await serverFixture({ ...job(), synthetic: false } as unknown as AgentJob), journal = new MemoryJournal();
  try {
    await assert.rejects(createWorker({ url: real.url, token, workerId: 'test', journal, process: async () => { throw new Error('must not invoke'); } }).step(), /non_synthetic_job/);
    assert.equal(journal.read()?.phase, 'claim');
  } finally { await real.close(); }
});

test('processor failures are delivered as bounded codes; endpoint and token validation fail closed', async () => {
  const s = await serverFixture(job());
  try {
    await createWorker({ url: s.url, token, workerId: 'test', journal: new MemoryJournal(), process: async () => { throw new IntegrationError('unverified_owner'); } }).step();
    assert.equal(s.requests[1].body.code, 'unverified_owner');
  } finally { await s.close(); }
  for (const url of ['http://public.example', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com/?token=x']) assert.throws(() => workerOrigin(url));
  assert.equal(workerOrigin('https://example.com/'), 'https://example.com');
  assert.throws(() => createWorker({ url: 'https://example.com', token: 'short', workerId: 'w', journal: new MemoryJournal(), process: async () => result() }));
});

test('journal refuses concurrent workers, endpoint changes and corruption without destroying pending work', () => {
  const dir = mkdtempSync(join(tmpdir(), 'worker-journal-')), path = join(dir, 'outbox.json'), identity = { url: 'https://test.example', workerId: 'test' };
  let journal: FileJournal | undefined;
  try {
    journal = new FileJournal(path, identity);
    assert.throws(() => new FileJournal(path, identity), /Ya hay/);
    journal.write({ phase: 'running', job: job() }); journal.close(); journal = undefined;
    assert.throws(() => new FileJournal(path, { ...identity, url: 'https://different.example' }), /otro servidor/);
    journal = new FileJournal(path, identity);
    assert.equal(journal.read()?.phase, 'running'); journal.close(); journal = undefined;
    const damaged = JSON.parse(readFileSync(path, 'utf8'));
    damaged.state.job.userId = 'different-user'; writeFileSync(path, JSON.stringify(damaged));
    assert.throws(() => new FileJournal(path, identity), /comprobación/);
    writeFileSync(path, '{corrupted');
    assert.throws(() => new FileJournal(path, identity));
    assert.equal(readFileSync(path, 'utf8'), '{corrupted');
  } finally { journal?.close(); rmSync(dir, { recursive: true, force: true }); }
});
