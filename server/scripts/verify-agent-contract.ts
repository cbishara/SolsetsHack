/** Exact Quito worker + processor interoperability. Uses a fake runner: NO Codex process or account. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { CHAT_SCENARIOS, SyntheticAgentQueue, workerRouter, type AgentChatJob } from '../src/multiuser/agent-queue.ts';
import { IdentityService } from '../src/multiuser/identity.ts';
import { MemoryMultiUserStore } from '../src/multiuser/store.ts';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const commit = execFileSync('git', ['rev-parse', '8f939ee^{commit}'], { cwd: repo, encoding: 'utf8' }).trim();
const temporary = await mkdtemp(join(tmpdir(), 'sol-quito-contract-'));
const source = execFileSync('git', ['archive', '--format=tar', commit, 'agent'], { cwd: repo });
execFileSync('tar', ['-xf', '-', '-C', temporary], { input: source });

const store = new MemoryMultiUserStore();
const identity = new IdentityService(store, { secret: 'synthetic-local-identity-proof-000000000000' });
const queue = new SyntheticAgentQueue(store, identity);
const one = await identity.createSession(), two = await identity.createSession();
const a = await identity.authenticate(one.token), b = await identity.authenticate(two.token);
const token = 'synthetic-local-worker-proof-00000000000000';
const app = express();
app.use(express.json());
app.use('/internal/agent/v0', workerRouter(queue, { workerToken: token }));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));

try {
  const { createWorker } = await import(pathToFileURL(join(temporary, 'agent/src/integration/worker.ts')).href);
  const { createJobProcessor } = await import(pathToFileURL(join(temporary, 'agent/src/integration/processor.ts')).href);
  let journalState: unknown = null, processorCalls = 0, fakeRunnerCalls = 0, loseAcknowledgement = true;
  const processJob = createJobProcessor({
    model: 'synthetic-runner-no-model-call',
    runnerFor: () => async (prompt: string) => {
      fakeRunnerCalls++;
      const correcting = prompt.includes('ahora prefiero pasos de cinco minutos.');
      return {
        reply: 'Dejemos preparado un paso breve para mañana.', concern: 'Reunión ficticia', has_plan: true,
        plan_title: 'Primer paso', plan_next_step: 'Escribir dos ideas.', plan_minutes: correcting ? 5 : 2,
        memory_updates: [{ key: 'pasos', value: correcting ? 'Prefiere cinco minutos.' : 'Prefiere dos minutos.',
          kind: 'fact', evidence: correcting ? 'ahora prefiero pasos de cinco minutos.' : 'Prefiero pasos de dos minutos.' }],
        forget_keys: [],
      };
    },
  });
  const worker = createWorker({
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, token, workerId: 'quito-contract-proof',
    journal: { read: () => structuredClone(journalState), write: (value: unknown) => { journalState = structuredClone(value); } },
    fetcher: async (url: string, options: RequestInit) => {
      const response = await fetch(url, options);
      if (url.endsWith('/result') && loseAcknowledgement) {
        loseAcknowledgement = false;
        await response.text();
        throw new Error('Synthetic lost acknowledgement');
      }
      return response;
    },
    process: async (job: AgentChatJob) => {
      processorCalls++;
      if (job.userId === b.userId) {
        assert.equal(job.payload.context.memory.length, 0);
        assert.equal(job.payload.messages.length, 0);
      }
      return processJob(job);
    },
  });
  await queue.enqueueSyntheticChat(a, { requestId: randomUUID(), text: CHAT_SCENARIOS.two_minute_steps });
  await assert.rejects(worker.step());
  assert.equal((journalState as { phase: string }).phase, 'result');
  assert.equal(await worker.step(), 'delivered');
  assert.equal(processorCalls, 1);
  assert.equal((await queue.state(a)).memory[0].value, 'Prefiere dos minutos.');

  await queue.enqueueSyntheticChat(a, { requestId: randomUUID(), text: CHAT_SCENARIOS.correct_routine });
  assert.equal(await worker.step(), 'delivered');
  const corrected = await queue.state(a);
  assert.equal(corrected.memory.length, 1);
  assert.equal(corrected.memory[0].value, 'Prefiere cinco minutos.');
  assert.equal(corrected.plan?.minutes, 5);

  await queue.enqueueSyntheticChat(b, { requestId: randomUUID(), text: CHAT_SCENARIOS.two_minute_steps });
  assert.equal(await worker.step(), 'delivered');
  assert.equal((await queue.state(b)).memory[0].value, 'Prefiere dos minutos.');

  await queue.enqueueSyntheticChat(a, { requestId: randomUUID(), text: CHAT_SCENARIOS.forget_chat });
  assert.equal(await worker.step(), 'delivered');
  const cleared = await queue.state(a), unaffected = await queue.state(b);
  assert.equal(cleared.memory.length, 0);
  assert.equal(cleared.messages.length, 1);
  assert.equal(cleared.messages[0].inference?.engine, 'command');
  assert.equal(unaffected.memory.length, 1);
  assert.equal(processorCalls, 4);
  assert.equal(fakeRunnerCalls, 3);
  console.log(JSON.stringify({
    sourceCommit: commit, exactQuitoWorker: true, exactQuitoProcessor: true, syntheticRunner: true,
    realModelCalls: 0, processorCalls, fakeRunnerCalls, lostAcknowledgementRecovered: true,
    correctedMemory: true, isolatedUsers: true, ownerClearHistory: true,
  }));
} finally {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await store.close();
  await rm(temporary, { recursive: true, force: true });
}
