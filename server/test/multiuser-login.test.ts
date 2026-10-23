import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IdentityError, IdentityService } from '../src/multiuser/identity.ts';
import { MemoryMultiUserStore } from '../src/multiuser/store.ts';

const secret = 'synthetic-login-secret-only-for-tests-0000';
const invalid = (error: unknown) => error instanceof IdentityError && error.code === 'invalid_or_expired_code';
const invalidSession = (error: unknown) => error instanceof IdentityError && error.code === 'invalid_session';

function fixture() {
  let now = Date.parse('2026-10-23T22:00:00Z');
  const store = new MemoryMultiUserStore();
  const clock = () => now;
  const identity = new IdentityService(store, { secret, clock });
  async function verified(phone = '56911111111') {
    const session = await identity.createSession();
    const principal = await identity.authenticate(session.token);
    const connection = await identity.beginConnection(principal);
    await identity.attachAccount(connection.connectionId, connection.callbackToken, {
      accountId: `account-${phone}`, ownerId: `whatsapp:${phone}`, recipientId: `${phone}@s.whatsapp.net`,
    });
    const link = await identity.prepareCode(principal, connection.connectionId);
    await identity.markCodeDelivery(link.challengeId, 'sent');
    const binding = await identity.verifyCode(principal, connection.connectionId, link.code);
    now += 60_000;
    return { session, principal, binding, link, phone };
  }
  async function login(phone: string) {
    const challenge = await identity.prepareLogin(phone);
    assert.ok(challenge.delivery);
    await identity.markLoginDelivery(challenge.challengeId, 'sent');
    const session = await identity.verifyLogin(challenge.challengeId, challenge.loginToken, challenge.delivery.code);
    return { session, challenge, principal: await identity.authenticate(session.token) };
  }
  return { store, identity, verified, login, clock, advance(ms: number) { now += ms; } };
}

test('login creates a second device session for the existing owner without merging another installation', async () => {
  const f = fixture(), a = await f.verified(), b = await f.verified('56922222222');
  const anonymous = await f.identity.createSession();
  const second = await f.login(`+${a.phone}`);
  assert.equal(second.session.userId, a.session.userId);
  assert.notEqual(second.session.sessionId, a.session.sessionId);
  assert.notEqual(second.session.token, a.session.token);
  assert.deepEqual(await f.identity.binding(second.principal), a.binding);
  assert.equal((await f.identity.authenticate(b.session.token)).userId, b.session.userId);
  assert.equal((await f.identity.authenticate(anonymous.token)).userId, anonymous.userId);
  assert.equal(second.challenge.delivery?.recipientId, a.binding.recipientId);
  const users = await f.store.transaction(tx => tx.list('identity_users', ''));
  assert.equal(users.length, 3);
});

test('unknown phones, cooldown and exhausted send quota return opaque challenges without any delivery', async () => {
  const f = fixture(), a = await f.verified();
  const unknown = await f.identity.prepareLogin('56933333333');
  assert.equal(unknown.delivery, undefined);
  await assert.rejects(f.identity.verifyLogin(unknown.challengeId, unknown.loginToken, '000000'), invalid);
  for (let i = 0; i < 4; i++) {
    const current = await f.identity.prepareLogin(a.phone);
    assert.ok(current.delivery);
    assert.equal((await f.identity.prepareLogin(a.phone)).delivery, undefined);
    f.advance(60_000);
  }
  assert.equal((await f.identity.prepareLogin(a.phone)).delivery, undefined); // link + 4 logins = 5/day
  f.advance(24 * 60 * 60_000);
  assert.ok((await f.identity.prepareLogin(a.phone)).delivery);
});

test('login proof, purpose and user isolation prevent crossed verification; consumption is atomic', async () => {
  const f = fixture(), a = await f.verified(), b = await f.verified('56922222222');
  const first = await f.identity.prepareLogin(a.phone), second = await f.identity.prepareLogin(b.phone);
  await f.identity.markLoginDelivery(first.challengeId, 'sent');
  await f.identity.markLoginDelivery(second.challengeId, 'sent');
  await assert.rejects(f.identity.verifyLogin(first.challengeId, second.loginToken, first.delivery!.code), invalid);
  await assert.rejects(f.identity.verifyLogin(a.link.challengeId, first.loginToken, a.link.code), invalid);
  if (first.delivery!.code !== second.delivery!.code) {
    await assert.rejects(f.identity.verifyLogin(first.challengeId, first.loginToken, second.delivery!.code), invalid);
  }
  const results = await Promise.allSettled([
    f.identity.verifyLogin(first.challengeId, first.loginToken, first.delivery!.code),
    f.identity.verifyLogin(first.challengeId, first.loginToken, first.delivery!.code),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await f.identity.verifyLogin(second.challengeId, second.loginToken, second.delivery!.code)).userId, b.session.userId);
});

test('five wrong login attempts persist, valid codes expire at five minutes and sessions at thirty days', async () => {
  const f = fixture(), a = await f.verified();
  const challenge = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(challenge.challengeId, 'sent');
  const wrong = challenge.delivery!.code === '000000' ? '000001' : '000000';
  for (let i = 0; i < 5; i++) await assert.rejects(f.identity.verifyLogin(challenge.challengeId, challenge.loginToken, wrong), invalid);
  await assert.rejects(f.identity.verifyLogin(challenge.challengeId, challenge.loginToken, challenge.delivery!.code), invalid);
  f.advance(60_000);
  const expired = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(expired.challengeId, 'sent');
  f.advance(5 * 60_000);
  await assert.rejects(f.identity.verifyLogin(expired.challengeId, expired.loginToken, expired.delivery!.code), invalid);
  const live = await f.login(a.phone);
  f.advance(30 * 24 * 60 * 60_000);
  await assert.rejects(f.identity.authenticate(live.session.token), invalidSession);
});

test('uncertain delivery is not usable, explicit resend replaces it and invalidates the older challenge', async () => {
  const f = fixture(), a = await f.verified();
  const first = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(first.challengeId, 'uncertain');
  await assert.rejects(f.identity.verifyLogin(first.challengeId, first.loginToken, first.delivery!.code), invalid);
  await assert.rejects(f.identity.markLoginDelivery(first.challengeId, 'sent'));
  f.advance(60_000);
  const second = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(second.challengeId, 'sent');
  f.advance(60_000);
  const third = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(third.challengeId, 'sent');
  await assert.rejects(f.identity.verifyLogin(second.challengeId, second.loginToken, second.delivery!.code), invalid);
  assert.equal((await f.identity.verifyLogin(third.challengeId, third.loginToken, third.delivery!.code)).userId, a.session.userId);
});

test('logout current preserves other devices; logout all invalidates sessions and pending login without changing ownership', async () => {
  const f = fixture(), a = await f.verified(), b = await f.verified('56922222222');
  const second = await f.login(a.phone);
  await f.identity.logout(second.principal);
  await assert.rejects(f.identity.authenticate(second.session.token), invalidSession);
  await f.identity.authenticate(a.session.token);
  f.advance(60_000);
  const pending = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(pending.challengeId, 'sent');
  await f.identity.logout(a.principal, true);
  await assert.rejects(f.identity.authenticate(a.session.token), invalidSession);
  await assert.rejects(f.identity.verifyLogin(pending.challengeId, pending.loginToken, pending.delivery!.code), invalid);
  assert.equal((await f.identity.resolveOwner(a.binding.ownerId))?.userId, a.session.userId);
  await f.identity.authenticate(b.session.token);
  f.advance(60_000);
  assert.equal((await f.login(a.phone)).session.userId, a.session.userId);
});

test('disconnect invalidates in-flight login even with the correct code', async () => {
  const f = fixture(), a = await f.verified();
  const challenge = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(challenge.challengeId, 'sent');
  await f.identity.disconnect(a.principal);
  await assert.rejects(f.identity.verifyLogin(challenge.challengeId, challenge.loginToken, challenge.delivery!.code), invalid);
  f.advance(60_000);
  assert.equal((await f.identity.prepareLogin(a.phone)).delivery, undefined);
});

test('storage failure does not consume login or create a partially usable session', async () => {
  const f = fixture(), a = await f.verified();
  const challenge = await f.identity.prepareLogin(a.phone);
  await f.identity.markLoginDelivery(challenge.challengeId, 'sent');
  const faulty = new IdentityService({ close: () => f.store.close(), transaction: run => f.store.transaction(tx => run({
    ...tx, async put(bucket, key, value) {
      if (bucket === 'identity_session_tokens') throw new Error('synthetic unavailable storage');
      await tx.put(bucket, key, value);
    },
  })) }, { secret, clock: f.clock });
  await assert.rejects(faulty.verifyLogin(challenge.challengeId, challenge.loginToken, challenge.delivery!.code), /storage/);
  assert.equal((await f.identity.verifyLogin(challenge.challengeId, challenge.loginToken, challenge.delivery!.code)).userId, a.session.userId);
});
