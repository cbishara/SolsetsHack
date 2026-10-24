import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createV1Protocol, V1_PROTOCOL } from './contract-v1.ts';
import type { AgentJobV1, JobResultV1 } from './contract-v1.ts';
import { createJobProcessorV1 } from './processor-v1.ts';
import { createWorker } from './worker.ts';
import { FileJournal, MemoryJournal } from './journal.ts';

function job(): AgentJobV1 {
  return { version: 'v1', id: randomUUID(), userId: 'synthetic-A', requestId: randomUUID(), leaseId: randomUUID(),
    contextVersion: 'ctx-1', synthetic: true, ownerVerified: true,
    authorization: { userId: 'synthetic-A', contextVersion: 'ctx-1', bindingVersion: 'binding-1' }, deadlineAt: new Date(Date.now() + 120_000).toISOString(), leaseExpiresAt: new Date(Date.now() + 90_000).toISOString(),
    kind: 'suggest_chats', payload: { snapshotId: 'snapshot-A', contextVersion: 'ctx-1', needs: ['Soporte'], chats: [{ id: 'support', name: 'Soporte', type: 'group' }] } };
}
const modelAnswer = { suggestions: [{ chatId: 'support', relevance: 'relevant', reason: 'El nombre menciona soporte.' }] };
const token = 'synthetic-v1-test-worker-private-token';
async function fixture(input: unknown) {
  const deliveries: unknown[] = [], paths: string[] = [];
  const server = createServer(async (req, res) => {
    paths.push(req.url!); assert.equal(req.headers.authorization, `Bearer ${token}`);
    let raw = ''; for await (const c of req) raw += c;
    const body = JSON.parse(raw);
    res.writeHead(200, { 'content-type': 'application/json' });
    if (req.url === '/internal/agent/v1/claim') res.end(JSON.stringify({ job: input }));
    else { deliveries.push(body); res.end(JSON.stringify({ status: req.url!.endsWith('/result') ? 'accepted' : 'failed' })); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, deliveries, paths,
    close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}

test('v1 exact processor travels over its own HTTP routes and re-delivers from disk after a lost acknowledgement without reinference', async () => {
  const f = await fixture(job()), dir = mkdtempSync(join(tmpdir(), 'sol-v1-outbox-'));
  const path = join(dir, 'outbox.json'), identity = { url: f.url, workerId: 'v1-test', protocol: 'v1' as const };
  let outbox = new FileJournal<AgentJobV1, JobResultV1>(path, identity, V1_PROTOCOL.parseJob), calls = 0;
  const processor = createJobProcessorV1({ runnerFor: () => async () => { calls++; return modelAnswer; } });
  try {
    const worker = createWorker({ ...identity, token, journal: outbox, protocol: V1_PROTOCOL, process: processor,
      fetcher: async (url, init) => { const response = await fetch(url, init); if (String(url).endsWith('/result')) { await response.text(); throw new Error('lost ack'); } return response; } });
    await assert.rejects(worker.step(), /connection_unavailable/);
    assert.equal(outbox.read()?.phase, 'result'); outbox.close();
    outbox = new FileJournal<AgentJobV1, JobResultV1>(path, identity, V1_PROTOCOL.parseJob);
    const restarted = createWorker({ ...identity, token, journal: outbox, protocol: V1_PROTOCOL, process: processor });
    assert.equal(await restarted.step(), 'delivered'); assert.equal(calls, 1);
    assert.equal(f.deliveries.length, 2); assert.deepEqual(f.deliveries[0], f.deliveries[1]);
    assert.ok(f.paths.every(p => p.startsWith('/internal/agent/v1/')));
    assert.throws(() => new FileJournal(path, { url: f.url, workerId: 'v1-test' }), /Ya hay un trabajador/);
    outbox.close();
    assert.throws(() => new FileJournal(path, { url: f.url, workerId: 'v1-test' }), /protocolo/);
  } finally { outbox.close(); await f.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('an interrupted v1 inference is reported once as uncertain and is never run again after restart', async () => {
  const j = job(), f = await fixture(j), journal = new MemoryJournal<AgentJobV1, JobResultV1>();
  journal.write({ phase: 'running', job: j });
  try {
    const worker = createWorker({ url: f.url, token, workerId: 'test', journal, protocol: V1_PROTOCOL,
      process: async () => { throw new Error('must not infer'); } });
    assert.equal(await worker.step(), 'delivered');
    assert.deepEqual(f.deliveries, [{ leaseId: j.leaseId, code: 'inference_interrupted' }]);
    assert.ok(!f.paths.some(p => p.endsWith('/claim')));
  } finally { await f.close(); }
});

test('v1 rejects wrong versions, real content and a mismatched saved job before inference or result delivery', async () => {
  for (const input of [{ ...job(), version: 'v0' }, { ...job(), synthetic: false }]) {
    const f = await fixture(input);
    try {
      const worker = createWorker({ url: f.url, token, workerId: 'test', journal: new MemoryJournal<AgentJobV1, JobResultV1>(),
        protocol: V1_PROTOCOL, process: async () => { throw new Error('must not infer'); } });
      await assert.rejects(worker.step(), /invalid_job|non_synthetic_job/);
      assert.equal(f.deliveries.length, 0);
    } finally { await f.close(); }
  }
  const f = await fixture(null), journal = new MemoryJournal<AgentJobV1, JobResultV1>();
  journal.write({ phase: 'claimed', job: { ...job(), version: 'v0' } as unknown as AgentJobV1 });
  try {
    await assert.rejects(createWorker({ url: f.url, token, workerId: 'test', journal, protocol: V1_PROTOCOL,
      process: async () => { throw new Error('must not infer'); } }).step(), /journal_protocol_mismatch/);
    assert.equal(f.paths.length, 0);
  } finally { await f.close(); }
});

test('operator real-data opt-in applies to both HTTP claims and disk recovery without changing provenance', async () => {
  const input = job(); input.synthetic = false;
  const f = await fixture(input), dir = mkdtempSync(join(tmpdir(), 'sol-v1-real-gate-'));
  const path = join(dir, 'state.json'), identity = { url: f.url, workerId: 'real-opt-in-test', protocol: 'v1' as const };
  const protocol = createV1Protocol(true);
  let outbox = new FileJournal<AgentJobV1, JobResultV1>(path, identity, protocol.parseJob);
  try {
    outbox.write({ phase: 'claimed', job: input }); outbox.close();
    assert.throws(() => new FileJournal<AgentJobV1, JobResultV1>(path, identity, V1_PROTOCOL.parseJob), /non_synthetic_job/);
    outbox = new FileJournal<AgentJobV1, JobResultV1>(path, identity, protocol.parseJob);
    const processor = createJobProcessorV1({ allowReal: true, runnerFor: () => async () => modelAnswer });
    const worker = createWorker({ ...identity, token, journal: outbox, protocol, process: async j => {
      assert.equal(j.synthetic, false); return processor(j);
    } });
    assert.equal(await worker.step(), 'delivered');
    assert.equal(await worker.step(), 'delivered');
    assert.equal(f.deliveries.length, 2); assert.equal(input.synthetic, false);
  } finally { outbox.close(); await f.close(); rmSync(dir, { recursive: true, force: true }); }
});
