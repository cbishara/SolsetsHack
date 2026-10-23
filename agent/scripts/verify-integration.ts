// A real Codex inference through a local HTTP receiver implementing candidate v0.
// This receiver is a test fixture, NOT Amaru's server or a Railway deployment.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createWorker } from '../src/integration/worker.ts';
import { MemoryJournal } from '../src/integration/journal.ts';
import { createJobProcessor } from '../src/integration/processor.ts';
import { createCodexRunner } from '../src/engines/codex.ts';
import type { AgentJob, ChatResult } from '../src/integration/contract.ts';

const start = Date.now(), token = randomUUID(), leaseId = randomUUID();
const job: AgentJob = { version: 'v0', id: randomUUID(), userId: 'synthetic-owner', requestId: randomUUID(), leaseId,
  deadlineAt: new Date(start + 75_000).toISOString(), leaseExpiresAt: new Date(start + 75_000).toISOString(),
  contextVersion: 'synthetic-1', synthetic: true, kind: 'chat', payload: {
    conversationId: 'synthetic-room', ownerVerified: true,
    text: 'Caso ficticio: mañana tengo que revisar la impresora. Prefiero empezar con pasos de dos minutos.',
    messages: [], concern: '', plan: null, context: { profile: { name: 'Rodrigo ficticio', role: 'Soporte TI' }, memory: [], examples: [] },
  } };
let delivered: ChatResult | undefined, claimCount = 0;
const server = createServer(async (req, res) => {
  if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); return res.end(); }
  let text = ''; for await (const chunk of req) text += chunk;
  const body = JSON.parse(text);
  if (req.url === '/internal/agent/v0/claim') {
    claimCount++;
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ job }));
  }
  if (req.url === `/internal/agent/v0/jobs/${job.id}/result` && body.leaseId === leaseId) {
    delivered = body.result;
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'accepted' }));
  }
  res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'fixture_failed' }));
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const processor = createJobProcessor({ model: process.env.CODEX_MODEL ?? null,
    runnerFor: timeoutMs => createCodexRunner({ bin: process.env.CODEX_BIN, model: process.env.CODEX_MODEL, timeoutMs, maxConcurrent: 1 }) });
  const worker = createWorker({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, token,
    workerId: 'verification-only', journal: new MemoryJournal(), process: processor });
  console.log('Prueba sintética HTTP → trabajador → Codex → receptor local. No conecta WhatsApp ni Railway.');
  assert.equal(await worker.step(), 'delivered');
  assert.equal(claimCount, 1);
  assert.equal(delivered?.kind, 'chat');
  assert.equal(delivered?.reply.inference?.engine, 'codex');
  assert.ok(delivered.reply.text.trim());
  assert.equal(delivered.plan?.minutes, 2);
  assert.ok(delivered.memoryUpdates.some(m => m.kind === 'fact' && m.evidence && job.payload.text.includes(m.evidence)));
  const evidence = { environment: 'local synthetic v0 receiver; not server/ or Railway',
    verifiedAt: new Date().toISOString(), elapsedMs: Date.now() - start, claimCount,
    result: delivered, synthetic: true, modelCalls: 1 };
  if (process.env.INTEGRATION_PROOF) writeFileSync(process.env.INTEGRATION_PROOF, JSON.stringify(evidence, null, 2) + '\n', { mode: 0o600 });
  console.log(`Verificado: una respuesta real de Codex, plan de dos minutos y memoria con evidencia; ${Date.now() - start} ms.`);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
