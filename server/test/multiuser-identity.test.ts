import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IdentityError, IdentityService, type CanonicalAccount } from '../src/multiuser/identity.ts';
import { MemoryMultiUserStore, scopedKey, type MultiUserTransaction } from '../src/multiuser/store.ts';

const secret = 'synthetic-test-secret-for-identity-only-12345';
const account = (suffix: string): CanonicalAccount => ({ accountId: `account-${suffix}`, ownerId: `owner-${suffix}`, recipientId: `recipient-${suffix}` });
const errorCode = (code: string, status?: number) => (error: unknown) => error instanceof IdentityError && error.code === code && (!status || error.status === status);
const differentCode = (code: string) => code === '000000' ? '111111' : '000000';

function fixture() {
  let now = Date.parse('2026-10-23T20:00:00.000Z');
  const store = new MemoryMultiUserStore();
  const identity = new IdentityService(store, { secret, clock: () => now });
  return { store, identity, clock: () => now, advance(ms: number) { now += ms; } };
}

async function pending(f: ReturnType<typeof fixture>, canonical = account('a')) {
  const session = await f.identity.createSession();
  const principal = await f.identity.authenticate(session.token);
  const connection = await f.identity.beginConnection(principal);
  await f.identity.attachAccount(connection.connectionId, connection.callbackToken, canonical);
  return { session, principal, connection };
}

async function verified(f: ReturnType<typeof fixture>, canonical = account('a')) {
  const current = await pending(f, canonical);
  const delivery = await f.identity.prepareCode(current.principal, current.connection.connectionId);
  await f.identity.markCodeDelivery(delivery.challengeId, 'sent');
  const binding = await f.identity.verifyCode(current.principal, current.connection.connectionId, delivery.code);
  return { ...current, delivery, binding };
}

test('transaction rolls back on failure, serializes updates and does not leak mutable references', async () => {
  const store = new MemoryMultiUserStore();
  await assert.rejects(store.transaction(async (tx) => {
    await tx.put('counter', 'one', { value: 9 });
    throw new Error('fail');
  }));
  assert.equal(await store.transaction((tx) => tx.get('counter', 'one')), undefined);
  await Promise.all(Array.from({ length: 10 }, () => store.transaction(async (tx) => {
    const before = await tx.get<{ value: number }>('counter', 'one');
    await Promise.resolve();
    await tx.put('counter', 'one', { value: (before?.value ?? 0) + 1 });
  })));
  const row = await store.transaction((tx) => tx.get<{ value: number }>('counter', 'one'));
  assert.equal(row?.value, 10);
  row!.value = 0;
  assert.deepEqual(await store.transaction((tx) => tx.get('counter', 'one')), { value: 10 });
});

test('prefixes keep similar user IDs apart and transactions cannot be used after completion', async () => {
  const store = new MemoryMultiUserStore();
  let leaked!: MultiUserTransaction;
  await store.transaction(async (tx) => {
    leaked = tx;
    await tx.put('messages', scopedKey('a', '1'), 'one');
    await tx.put('messages', scopedKey('ab', '1'), 'two');
    await tx.put('messages', scopedKey('a:', '1'), 'three');
    assert.deepEqual(await tx.list('messages', scopedKey('a')), ['one']);
  });
  await assert.rejects(leaked.put('messages', 'bad', 'bad'), /closed/);
});

test('session bearer is unique, stored hashed and expires; supplied principal cannot switch users', async () => {
  const f = fixture();
  const first = await f.identity.createSession();
  const second = await f.identity.createSession();
  assert.notEqual(first.token, second.token);
  const principal = await f.identity.authenticate(first.token);
  const rows = await f.store.transaction((tx) => tx.list('identity_sessions', ''));
  assert.equal(JSON.stringify(rows).includes(first.token), false);
  await assert.rejects(f.identity.authenticate('owner-pilot-bearer'), errorCode('invalid_session', 401));
  await assert.rejects(f.identity.beginConnection({ ...principal, userId: second.userId }), errorCode('invalid_session', 401));
  f.advance(30 * 24 * 60 * 60_000);
  await assert.rejects(f.identity.authenticate(first.token), errorCode('invalid_session', 401));
});

test('callback capability validates account attachment and immutable canonical destination', async () => {
  const f = fixture();
  const current = await pending(f);
  const { connectionId, callbackToken } = current.connection;
  assert.equal((await f.identity.callbackConnection(connectionId, callbackToken)).accountId, 'account-a');
  await assert.rejects(f.identity.attachAccount(connectionId, 'wrong', account('b')), errorCode('invalid_connection_callback', 401));
  await assert.rejects(f.identity.attachAccount(connectionId, callbackToken, account('b')), errorCode('connection_account_changed', 409));
  await f.identity.attachAccount(connectionId, callbackToken, { recipientId: 'recipient-a', ownerId: 'owner-a', accountId: 'account-a' });
  f.advance(10 * 60_000);
  await assert.rejects(f.identity.callbackConnection(connectionId, callbackToken), errorCode('invalid_connection_callback', 401));
});

test('callback creates exactly one code delivery under concurrency; storage and state never contain its plaintext', async () => {
  const f = fixture();
  const current = await pending(f);
  const deliveries = await Promise.all(Array.from({ length: 8 }, () => f.identity.prepareCodeFromCallback(current.connection.connectionId, current.connection.callbackToken)));
  const sent = deliveries.filter((delivery) => delivery !== null);
  assert.equal(sent.length, 1);
  const delivery = sent[0]!;
  assert.match(delivery.code, /^\d{6}$/);
  assert.equal(delivery.recipientId, 'recipient-a');
  const state = await f.identity.connection(current.principal, current.connection.connectionId);
  assert.equal('code' in state, false);
  const row = await f.store.transaction((tx) => tx.get<Record<string, unknown>>('identity_challenges', delivery.challengeId));
  assert.equal('code' in row!, false);
  assert.match(String(row?.codeHash), /^[0-9a-f]{64}$/);
  assert.notEqual(row?.codeHash, delivery.code);
  await assert.rejects(f.identity.verifyCode(current.principal, current.connection.connectionId, delivery.code), errorCode('invalid_or_expired_code'));
  await f.identity.markCodeDelivery(delivery.challengeId, 'sent');
  const binding = await f.identity.verifyCode(current.principal, current.connection.connectionId, delivery.code);
  assert.equal(binding.userId, current.principal.userId);
  assert.equal(binding.accountId, 'account-a');
  assert.equal(binding.version, 1);
  assert.equal(await f.identity.prepareCodeFromCallback(current.connection.connectionId, current.connection.callbackToken), null);
  await assert.rejects(f.identity.verifyCode(current.principal, current.connection.connectionId, delivery.code), errorCode('invalid_or_expired_code'));
});

test('two users cannot read or verify each other connection even with a correct code', async () => {
  const f = fixture();
  const a = await pending(f, account('a'));
  const b = await pending(f, account('b'));
  const codeA = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  await f.identity.markCodeDelivery(codeA.challengeId, 'sent');
  await assert.rejects(f.identity.connection(b.principal, a.connection.connectionId), errorCode('connection_not_found', 404));
  await assert.rejects(f.identity.verifyCode(b.principal, a.connection.connectionId, codeA.code), errorCode('connection_not_found', 404));
  await assert.rejects(f.identity.prepareCode(b.principal, a.connection.connectionId), errorCode('connection_not_found', 404));
  assert.equal((await f.identity.verifyCode(a.principal, a.connection.connectionId, codeA.code)).userId, a.principal.userId);
  await assert.rejects(f.identity.binding(b.principal), errorCode('whatsapp_not_verified', 409));
});

test('wrong attempts commit, cap at five and correct code then fails', async () => {
  const f = fixture();
  const a = await pending(f);
  const delivery = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  await f.identity.markCodeDelivery(delivery.challengeId, 'sent');
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(f.identity.verifyCode(a.principal, a.connection.connectionId, differentCode(delivery.code)), errorCode('invalid_or_expired_code'));
  await assert.rejects(f.identity.verifyCode(a.principal, a.connection.connectionId, delivery.code), errorCode('invalid_or_expired_code'));
  const challenge = await f.store.transaction((tx) => tx.get<{ attempts: number }>('identity_challenges', delivery.challengeId));
  assert.equal(challenge?.attempts, 5);
});

test('code expires at five minutes', async () => {
  const f = fixture();
  const a = await pending(f);
  const delivery = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  await f.identity.markCodeDelivery(delivery.challengeId, 'sent');
  f.advance(5 * 60_000);
  await assert.rejects(f.identity.verifyCode(a.principal, a.connection.connectionId, delivery.code), errorCode('invalid_or_expired_code'));
});

test('uncertain/failed delivery cannot verify; explicit resend waits, replaces challenge and does not replay callbacks', async () => {
  const f = fixture();
  const a = await pending(f);
  const first = (await f.identity.prepareCodeFromCallback(a.connection.connectionId, a.connection.callbackToken))!;
  await f.identity.markCodeDelivery(first.challengeId, 'uncertain');
  await assert.rejects(f.identity.verifyCode(a.principal, a.connection.connectionId, first.code), errorCode('invalid_or_expired_code'));
  assert.equal(await f.identity.prepareCodeFromCallback(a.connection.connectionId, a.connection.callbackToken), null);
  await assert.rejects(f.identity.prepareCode(a.principal, a.connection.connectionId), errorCode('code_resend_cooldown', 429));
  f.advance(60_000);
  const second = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  assert.notEqual(second.challengeId, first.challengeId);
  await assert.rejects(f.identity.markCodeDelivery(first.challengeId, 'sent'), errorCode('delivery_already_resolved'));
  await f.identity.markCodeDelivery(second.challengeId, 'failed');
  await assert.rejects(f.identity.verifyCode(a.principal, a.connection.connectionId, second.code), errorCode('invalid_or_expired_code'));
  f.advance(60_000);
  const third = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  await f.identity.markCodeDelivery(third.challengeId, 'sent');
  assert.equal((await f.identity.verifyCode(a.principal, a.connection.connectionId, third.code)).userId, a.principal.userId);
});

test('send quota persists across sessions/connections for the canonical owner', async () => {
  const f = fixture();
  for (let count = 0; count < 5; count++) {
    const a = await pending(f);
    const code = await f.identity.prepareCode(a.principal, a.connection.connectionId);
    await f.identity.markCodeDelivery(code.challengeId, 'failed');
    f.advance(60_000);
  }
  const last = await pending(f);
  await assert.rejects(f.identity.prepareCode(last.principal, last.connection.connectionId), errorCode('code_send_limit', 429));
});

test('concurrent valid codes cannot bind the same account to two users', async () => {
  const f = fixture();
  const a = await pending(f, { ...account('a'), accountId: 'shared-account' });
  const b = await pending(f, { ...account('b'), accountId: 'shared-account' });
  const codes = await Promise.all([a, b].map((current) => f.identity.prepareCode(current.principal, current.connection.connectionId)));
  await Promise.all(codes.map((code) => f.identity.markCodeDelivery(code.challengeId, 'sent')));
  const results = await Promise.allSettled([a, b].map((current, i) => f.identity.verifyCode(current.principal, current.connection.connectionId, codes[i].code)));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const loser = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
  assert.equal(loser.reason.code, 'identity_already_linked');
  assert.ok(await f.identity.resolveAccount('shared-account'));
});

test('different provider accounts cannot bind the same owner identity to two users', async () => {
  const f = fixture();
  const a = await pending(f, { ...account('a'), ownerId: 'shared-owner' });
  const b = await pending(f, { ...account('b'), ownerId: 'shared-owner' });
  const codeA = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  f.advance(60_000);
  const codeB = await f.identity.prepareCode(b.principal, b.connection.connectionId);
  await f.identity.markCodeDelivery(codeA.challengeId, 'sent');
  await f.identity.markCodeDelivery(codeB.challengeId, 'sent');
  const results = await Promise.allSettled([
    f.identity.verifyCode(a.principal, a.connection.connectionId, codeA.code),
    f.identity.verifyCode(b.principal, b.connection.connectionId, codeB.code),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await f.identity.resolveOwner('shared-owner'))?.userId, a.principal.userId);
});

test('disconnect invalidates routing and increments version without releasing ownership to another user', async () => {
  const f = fixture();
  const a = await verified(f);
  const disconnected = await f.identity.disconnect(a.principal);
  assert.equal(disconnected.version, 2);
  assert.equal(await f.identity.resolveOwner('owner-a'), undefined);
  assert.equal(await f.identity.resolveAccount('account-a'), undefined);
  await assert.rejects(f.identity.binding(a.principal), errorCode('whatsapp_not_verified'));
  await assert.rejects(pending(f), errorCode('identity_already_linked'));
  const connection = await f.identity.beginConnection(a.principal);
  await f.identity.attachAccount(connection.connectionId, connection.callbackToken, account('a'));
  f.advance(60_000);
  const code = await f.identity.prepareCode(a.principal, connection.connectionId);
  await f.identity.markCodeDelivery(code.challengeId, 'sent');
  const reconnected = await f.identity.verifyCode(a.principal, connection.connectionId, code.code);
  assert.equal(reconnected.userId, a.principal.userId);
  assert.equal(reconnected.version, 3);
});

test('storage failure during verify does not consume code or partially assign an identity', async () => {
  const f = fixture();
  const a = await pending(f);
  const code = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  await f.identity.markCodeDelivery(code.challengeId, 'sent');
  const identity = new IdentityService({
    close: () => f.store.close(),
    transaction: (run) => f.store.transaction((tx) => run({ ...tx, async put(bucket, key, value) {
      if (bucket === 'identity_whatsapp_owners') throw new Error('database unavailable');
      await tx.put(bucket, key, value);
    } })),
  }, { secret, clock: f.clock });
  await assert.rejects(identity.verifyCode(a.principal, a.connection.connectionId, code.code), /database unavailable/);
  assert.equal(await f.identity.resolveAccount('account-a'), undefined);
  assert.equal((await f.identity.verifyCode(a.principal, a.connection.connectionId, code.code)).userId, a.principal.userId);
});

test('disconnect invalidates every earlier callback and pending code; reverify only the same account', async () => {
  const f = fixture();
  const a = await verified(f);
  assert.equal(a.binding.connectionId, a.connection.connectionId);
  const next = await f.identity.beginConnection(a.principal);
  await assert.rejects(f.identity.attachAccount(next.connectionId, next.callbackToken, account('b')), errorCode('identity_already_linked'));
  await f.identity.attachAccount(next.connectionId, next.callbackToken, account('a'));
  f.advance(60_000);
  const pendingCode = await f.identity.prepareCodeFromCallback(next.connectionId, next.callbackToken);
  await f.identity.markCodeDelivery(pendingCode!.challengeId, 'sent');
  await f.identity.disconnect(a.principal);
  for (const connection of [a.connection, next]) {
    await assert.rejects(f.identity.callbackConnection(connection.connectionId, connection.callbackToken), errorCode('connection_disconnected'));
    await assert.rejects(f.identity.prepareCodeFromCallback(connection.connectionId, connection.callbackToken), errorCode('connection_disconnected'));
    assert.equal((await f.identity.connection(a.principal, connection.connectionId)).status, 'disconnected');
  }
  await assert.rejects(f.identity.verifyCode(a.principal, next.connectionId, pendingCode!.code), errorCode('invalid_or_expired_code'));
});

test('stale owner/account lookup indexes cannot route against a newer current binding', async () => {
  const f = fixture();
  const a = await verified(f);
  await f.store.transaction(async (tx) => {
    const user = (await tx.get<Record<string, unknown>>('identity_users', a.principal.userId))!;
    await tx.put('identity_users', a.principal.userId, { ...user, binding: { ...a.binding, version: a.binding.version + 1 } });
  });
  assert.equal(await f.identity.resolveAccount(a.binding.accountId), undefined);
  assert.equal(await f.identity.resolveOwner(a.binding.ownerId), undefined);
});

test('reconnect account comes only from existing verified or disconnected user binding', async () => {
  const f = fixture();
  const session = await f.identity.createSession();
  const principal = await f.identity.authenticate(session.token);
  const initial = await f.identity.beginConnection(principal);
  assert.equal(initial.reconnectAccountId, undefined);
  await f.identity.cancelConnection(principal, initial.connectionId);
  const a = await verified(f);
  const reconnect = await f.identity.beginConnection(a.principal);
  assert.equal(reconnect.reconnectAccountId, a.binding.accountId);
  await f.identity.cancelConnection(a.principal, reconnect.connectionId);
  assert.equal((await f.identity.binding(a.principal)).status, 'verified');
  await f.identity.disconnect(a.principal);
  const afterDisconnect = await f.identity.beginConnection(a.principal);
  assert.equal(afterDisconnect.reconnectAccountId, a.binding.accountId);
});

test('cancelled link callback/code cannot activate and a new link can be created immediately', async () => {
  const f = fixture();
  const a = await pending(f);
  const code = await f.identity.prepareCode(a.principal, a.connection.connectionId);
  await f.identity.markCodeDelivery(code.challengeId, 'sent');
  await f.identity.cancelConnection(a.principal, a.connection.connectionId);
  await assert.rejects(f.identity.callbackConnection(a.connection.connectionId, a.connection.callbackToken), errorCode('connection_disconnected'));
  await assert.rejects(f.identity.verifyCode(a.principal, a.connection.connectionId, code.code), errorCode('invalid_or_expired_code'));
  const next = await f.identity.beginConnection(a.principal);
  assert.notEqual(next.connectionId, a.connection.connectionId);
  const sessionB = await f.identity.createSession();
  const principalB = await f.identity.authenticate(sessionB.token);
  await assert.rejects(f.identity.cancelConnection(principalB, next.connectionId), errorCode('connection_not_found'));
});
