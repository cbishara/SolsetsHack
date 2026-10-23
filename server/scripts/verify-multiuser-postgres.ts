// Synthetic persistence/concurrency proof. Uses isolated random bucket prefixes and removes only those rows.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { PostgresMultiUserStore } from '../src/multiuser/postgres.ts';
import { IdentityService } from '../src/multiuser/identity.ts';
import type { MultiUserStore } from '../src/multiuser/store.ts';
import { SyntheticAgentQueue } from '../src/multiuser/agent-queue.ts';

const url = process.env.SOL_TEST_DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;
if (!url) throw new Error('Set SOL_TEST_DATABASE_URL privately, or run with the Postgres service environment.');
const prefix = `soltest_${randomBytes(6).toString('hex')}_`;
function scoped(store: MultiUserStore): MultiUserStore {
  return {
    close: () => store.close(),
    transaction: run => store.transaction(tx => run({
      get: (bucket, key) => tx.get(prefix + bucket, key),
      put: (bucket, key, data) => tx.put(prefix + bucket, key, data),
      remove: (bucket, key) => tx.remove(prefix + bucket, key),
      list: (bucket, key, limit) => tx.list(prefix + bucket, key, limit),
    })),
  };
}
let a: MultiUserStore | undefined, b: MultiUserStore | undefined;
try {
  a = scoped(await PostgresMultiUserStore.connect(url));
  b = scoped(await PostgresMultiUserStore.connect(url));
  await a.transaction(tx => tx.put('proof', 'counter', { n: 0 }));
  await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? a! : b!).transaction(async tx => {
    const current = await tx.get<{ n: number }>('proof', 'counter');
    await tx.put('proof', 'counter', { n: current!.n + 1 });
  })));
  assert.equal((await a.transaction(tx => tx.get<{ n: number }>('proof', 'counter')))?.n, 20);
  await assert.rejects(a.transaction(async tx => { await tx.put('proof', 'rolled_back', { n: 1 }); throw new Error('synthetic rollback'); }));
  assert.equal(await b.transaction(tx => tx.get('proof', 'rolled_back')), undefined);
  const secret = randomBytes(32).toString('hex');
  const first = new IdentityService(a, { secret }), second = new IdentityService(b, { secret });
  const sa = await first.createSession(), sb = await second.createSession();
  const pa = await first.authenticate(sa.token), pb = await second.authenticate(sb.token);
  for (const [service, principal, suffix] of [[first, pa, 'a'], [second, pb, 'b']] as const) {
    const connection = await service.beginConnection(principal);
    await service.attachAccount(connection.connectionId, connection.callbackToken, { accountId: `synthetic-${suffix}`, ownerId: `synthetic-owner-${suffix}`, recipientId: `synthetic-recipient-${suffix}` });
    const code = await service.prepareCodeFromCallback(connection.connectionId, connection.callbackToken);
    assert.ok(code);
    await service.markCodeDelivery(code.challengeId, 'sent');
    const attempts = await Promise.allSettled([
      service.verifyCode(principal, connection.connectionId, code.code),
      service.verifyCode(principal, connection.connectionId, code.code),
    ]);
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
  }
  assert.notEqual((await first.binding(pa)).userId, (await second.binding(pb)).userId);
  const wrong = await first.beginConnection(pa);
  await assert.rejects(first.attachAccount(wrong.connectionId, wrong.callbackToken, { accountId: 'synthetic-b', ownerId: 'synthetic-owner-b', recipientId: 'synthetic-recipient-b' }));
  await a.close(); a = scoped(await PostgresMultiUserStore.connect(url));
  const restarted = new IdentityService(a, { secret });
  const restored = await restarted.authenticate(sa.token);
  assert.equal(restored.userId, pa.userId);
  assert.equal((await restarted.binding(restored)).accountId, 'synthetic-a');
  const queue = new SyntheticAgentQueue(a, restarted);
  const requestId = randomUUID();
  await queue.enqueueSyntheticChat(restored, { requestId, text: 'Escenario ficticio: prefiero pasos cortos.' });
  const claimId = randomUUID();
  const job = await queue.claim({ workerId: 'synthetic-worker', requestId: claimId });
  assert.ok(job);
  assert.deepEqual(await queue.claim({ workerId: 'synthetic-worker', requestId: claimId }), job);
  const result = { kind: 'chat' as const, reply: { id: `${requestId}:reply`, role: 'assistant' as const, text: 'Respuesta sintética para verificar persistencia.', inference: { engine: 'command' as const } }, concern: '', plan: null,
    memoryUpdates: [{ key: 'short_steps', kind: 'rule' as const, value: 'Pasos cortos', source: 'chat' as const, evidence: 'prefiero pasos cortos' }], forgetKeys: [], clearHistory: false };
  await queue.accept(job.id, { leaseId: job.leaseId, result });
  await queue.accept(job.id, { leaseId: job.leaseId, result });
  assert.equal((await queue.state(restored)).messages.length, 2);
  assert.equal((await queue.state(pb)).messages.length, 0);
  await a.close(); a = scoped(await PostgresMultiUserStore.connect(url));
  const finalIdentity = new IdentityService(a, { secret });
  const finalQueue = new SyntheticAgentQueue(a, finalIdentity);
  assert.equal((await finalQueue.state(await finalIdentity.authenticate(sa.token))).memory.length, 1);
  assert.equal(await finalQueue.claim({ workerId: 'synthetic-worker', requestId: claimId }), null);
  console.log('PASS: PostgreSQL real; 20 concurrent transactions, rollback, one-time OTP, isolated users, idempotent agent result and identity/chat/memory after restart. Synthetic rows only; no model called.');
} catch (error) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'verification_failed';
  console.error(`FAIL: multiuser Postgres verification (${/^[a-zA-Z0-9_]{1,40}$/.test(code) ? code : 'verification_failed'}).`);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([a?.close(), b?.close()]);
  const cleanup = new pg.Pool({ connectionString: url, max: 1 });
  try { await cleanup.query('DELETE FROM sol_identity.documents WHERE starts_with(bucket, $1)', [prefix]); }
  catch { console.error('Could not remove this run’s isolated synthetic rows.'); process.exitCode = 1; }
  finally { await cleanup.end(); }
}
