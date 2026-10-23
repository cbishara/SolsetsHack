import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { CatalogService } from '../src/multiuser/catalog.ts';
import { IdentityService } from '../src/multiuser/identity.ts';
import { multiUserRouter, type LinkingProvider } from '../src/multiuser/routes.ts';
import { MemoryMultiUserStore } from '../src/multiuser/store.ts';
import { SyntheticAgentQueue, fixtureRouter } from '../src/multiuser/agent-queue.ts';

const origin = 'https://sol.example';
const web = { Origin: origin, 'X-Sol-CSRF': '1', 'Sec-Fetch-Site': 'same-origin' };
const cookieValue = (headers: Headers, name: string) => headers.getSetCookie().find(value => value.startsWith(`${name}=`))!.split(';')[0];

class Provider implements LinkingProvider {
  readonly botAccountId = 'synthetic-sol-bot';
  sent: { recipientId: string; code: string; purpose: string }[] = [];
  gate?: Promise<void>;
  failure = false;
  async link() { return 'https://account.unipile.com/synthetic'; }
  async owner() { throw new Error('Provider owner lookup is unused in these tests'); return { accountId: '', ownerId: '', recipientId: '' }; }
  async sendCode(recipientId: string, code: string, purpose = 'link') {
    this.sent.push({ recipientId, code, purpose });
    await this.gate;
    if (this.failure) throw new Error('Synthetic provider failure');
    return { chatId: 'synthetic-bot-dm', messageId: `synthetic-code-${this.sent.length}` };
  }
  async subscribe() {}
  async catalog() { return { items: [], cursor: null }; }
  async chat(accountId: string, id: string) { return { id, accountId, name: 'Synthetic chat', type: 1 }; }
  async messages() { return { items: [], cursor: null }; }
  async message() { return null; }
}

async function fixture() {
  let now = Date.parse('2026-10-23T22:00:00Z');
  const store = new MemoryMultiUserStore();
  const identity = new IdentityService(store, { secret: 'synthetic-test-identity-secret-for-login-http', clock: () => now });
  const provider = new Provider();
  const app = express();
  app.use(express.json());
  app.use('/api/v1/demo', fixtureRouter(new SyntheticAgentQueue(store, identity), identity, origin));
  app.use('/api/v1', multiUserRouter({ store, identity, provider, catalog: new CatalogService(store, identity, provider),
    publicUrl: origin, webhookSecret: 'synthetic-test-whatsapp-webhook-secret-000', rateSecret: 'synthetic-test-rate-limit-secret-different' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(base + '/api/v1' + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }, signal: AbortSignal.timeout(2500),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  async function seed(phone = '56911111111') {
    const session = await identity.createSession(), principal = await identity.authenticate(session.token);
    const connection = await identity.beginConnection(principal);
    await identity.attachAccount(connection.connectionId, connection.callbackToken,
      { accountId: `synthetic-${phone}`, ownerId: `whatsapp:${phone}`, recipientId: `${phone}@s.whatsapp.net` });
    const code = await identity.prepareCode(principal, connection.connectionId);
    await identity.markCodeDelivery(code.challengeId, 'sent');
    await identity.verifyCode(principal, connection.connectionId, code.code);
    now += 60_000;
    return { ...session, phone, principal };
  }
  async function close() { await new Promise<void>(resolve => server.close(() => resolve())); await store.close(); }
  return { store, identity, provider, seed, request, close, advance(ms: number) { now += ms; } };
}

test('native login keeps the same account and exposes only a fresh individual bearer', async () => {
  const f = await fixture();
  try {
    const a = await f.seed(), b = await f.seed('56922222222');
    const requested = await f.request('/auth/whatsapp/request', { phone: `+${a.phone}`, transport: 'native' });
    assert.equal(requested.status, 202);
    assert.equal(requested.body.status, 'accepted');
    assert.equal(requested.body.userId, undefined);
    assert.equal(requested.body.code, undefined);
    assert.equal(requested.body.recipientId, undefined);
    assert.deepEqual(f.provider.sent.map(({ recipientId, purpose }) => ({ recipientId, purpose })), [{ recipientId: `${a.phone}@s.whatsapp.net`, purpose: 'login' }]);
    const verified = await f.request('/auth/whatsapp/verify', {
      challengeId: requested.body.challengeId, loginToken: requested.body.loginToken, code: f.provider.sent[0].code,
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.userId, a.userId);
    assert.notEqual(verified.body.token, a.token);
    assert.equal(verified.headers.get('set-cookie'), null);
    const me = await f.request('/me', undefined, { Authorization: `Bearer ${verified.body.token}` });
    assert.equal(me.body.whatsapp, 'verified');
    assert.equal((await f.request('/me', undefined, { Authorization: `Bearer ${b.token}` })).body.userId, b.userId);
    const replay = await f.request('/auth/whatsapp/verify', { challengeId: requested.body.challengeId, loginToken: requested.body.loginToken, code: f.provider.sent[0].code });
    assert.equal(replay.status, 400);
  } finally { await f.close(); }
});

test('web login uses HttpOnly cookies and shares identity and chat state with the native device', async () => {
  const f = await fixture();
  try {
    const a = await f.seed();
    const requested = await f.request('/auth/whatsapp/request', { phone: a.phone, transport: 'web' }, web);
    assert.equal(requested.status, 202);
    assert.equal(requested.body.loginToken, undefined);
    const loginCookie = cookieValue(requested.headers, '__Host-sol_login');
    assert.match(requested.headers.get('set-cookie')!, /HttpOnly/);
    assert.match(requested.headers.get('set-cookie')!, /Secure/);
    assert.match(requested.headers.get('set-cookie')!, /SameSite=Strict/);
    const verified = await f.request('/auth/whatsapp/verify', { challengeId: requested.body.challengeId, code: f.provider.sent[0].code, transport: 'web' }, { ...web, Cookie: loginCookie });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.token, undefined);
    assert.equal(verified.body.userId, a.userId);
    const sessionCookie = cookieValue(verified.headers, '__Host-sol_session');
    assert.match(verified.headers.getSetCookie().find(value => value.startsWith('__Host-sol_session='))!, /Max-Age=2592000/);
    assert.equal((await f.request('/me', undefined, { Cookie: sessionCookie })).body.userId, a.userId);
    const nativeState = await f.request('/demo/chat', undefined, { Authorization: `Bearer ${a.token}` });
    const browserState = await f.request('/demo/chat', undefined, { Cookie: sessionCookie });
    assert.equal(browserState.status, 200);
    assert.deepEqual(browserState.body, nativeState.body);
    const missingCsrf = await f.request('/auth/logout', {}, { Cookie: sessionCookie, Origin: origin });
    assert.equal(missingCsrf.status, 403);
    assert.equal((await f.request('/auth/logout', { allDevices: false }, { ...web, Cookie: sessionCookie })).status, 200);
    assert.equal((await f.request('/me', undefined, { Cookie: sessionCookie })).status, 401);
    assert.equal((await f.request('/me', undefined, { Authorization: `Bearer ${a.token}` })).status, 200);
  } finally { await f.close(); }
});

test('browser public endpoints enforce origin and CSRF even when caller requests native transport', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request('/sessions', {}, { Origin: 'https://attacker.example', 'X-Sol-CSRF': '1' })).status, 403);
    assert.equal((await f.request('/sessions', {}, { Origin: origin })).status, 403);
    assert.equal((await f.request('/sessions', { transport: 'native' }, web)).status, 403);
    assert.equal((await f.request('/sessions', { transport: 'web' })).status, 403);
    assert.equal((await f.request('/sessions', {}, { ...web, 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await f.request('/auth/whatsapp/request', { phone: '56911111111', transport: 'native' }, web)).status, 403);
    const browser = await f.request('/sessions', {}, web);
    assert.equal(browser.status, 201);
    assert.equal(browser.body.token, undefined);
    const browserCookie = cookieValue(browser.headers, '__Host-sol_session');
    assert.equal((await f.request('/auth/logout', {}, { Cookie: browserCookie })).status, 403);
    assert.equal((await f.request('/demo/chat', { requestId: '00000000-0000-4000-8000-000000000000', scenario: 'two_minute_steps' }, { Cookie: browserCookie })).status, 403);
    assert.equal((await f.request('/me', undefined, { Cookie: browserCookie, Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await f.request('/me', undefined, { Cookie: `${browserCookie}; ${browserCookie}` })).status, 401);
  } finally { await f.close(); }
});

test('known, unknown and throttled identities have the same envelope; slow or failed delivery never leaks in response', async () => {
  const f = await fixture();
  let release!: () => void;
  try {
    const a = await f.seed();
    f.provider.gate = new Promise<void>(resolve => { release = resolve; });
    f.provider.failure = true;
    const known = await f.request('/auth/whatsapp/request', { phone: a.phone });
    // This returns while the provider is still pending; no provider-latency enumeration.
    assert.equal(known.status, 202);
    const unknown = await f.request('/auth/whatsapp/request', { phone: '56933333333' });
    const cooldown = await f.request('/auth/whatsapp/request', { phone: a.phone });
    for (const response of [unknown, cooldown]) {
      assert.equal(response.status, known.status);
      assert.deepEqual(Object.keys(response.body).sort(), Object.keys(known.body).sort());
      assert.equal(response.body.status, known.body.status);
    }
    assert.equal(f.provider.sent.length, 1);
    const attempt = { challengeId: known.body.challengeId, loginToken: known.body.loginToken, code: f.provider.sent[0].code };
    assert.equal((await f.request('/auth/whatsapp/verify', attempt)).status, 400);
    release();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal((await f.request('/auth/whatsapp/verify', attempt)).status, 400);
    assert.equal(f.provider.sent.length, 1);
  } finally { release?.(); await f.close(); }
});

test('login requires the initiating browser cookie and all-device logout revokes native and web together', async () => {
  const f = await fixture();
  try {
    const a = await f.seed();
    const requested = await f.request('/auth/whatsapp/request', { phone: a.phone }, web);
    const body = { challengeId: requested.body.challengeId, code: f.provider.sent[0].code };
    assert.equal((await f.request('/auth/whatsapp/verify', body, web)).status, 400);
    const verified = await f.request('/auth/whatsapp/verify', body, { ...web, Cookie: cookieValue(requested.headers, '__Host-sol_login') });
    assert.equal(verified.status, 200);
    const sessionCookie = cookieValue(verified.headers, '__Host-sol_session');
    assert.equal((await f.request('/auth/logout', { allDevices: true }, { ...web, Cookie: sessionCookie })).status, 200);
    assert.equal((await f.request('/me', undefined, { Cookie: sessionCookie })).status, 401);
    assert.equal((await f.request('/me', undefined, { Authorization: `Bearer ${a.token}` })).status, 401);
  } finally { await f.close(); }
});
