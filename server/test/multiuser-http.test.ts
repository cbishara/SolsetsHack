import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import express from 'express';
import { CatalogService, type ChatMetadata, type NormalizedMessage } from '../src/multiuser/catalog.ts';
import { IdentityService } from '../src/multiuser/identity.ts';
import { multiUserRouter, type LinkingProvider } from '../src/multiuser/routes.ts';
import { MemoryMultiUserStore } from '../src/multiuser/store.ts';
import { UnsupportedPairingCheckpoint } from '../src/multiuser/provider.ts';

const webhookSecret = 'synthetic-webhook-secret-only-for-tests-000000';
const rateSecret = 'synthetic-rate-secret-different-for-tests-0000';
const time = Date.parse('2026-10-23T22:00:00.000Z');
const incoming = (accountId: string, chatId: string, id: string, overrides: Partial<NormalizedMessage> = {}): NormalizedMessage => ({
  id, accountId, chatId, senderId: 'synthetic-canonical-sender', text: `Mensaje inventado ${id}`,
  direction: 'incoming', sentAt: new Date(time + 1000).toISOString(), ...overrides,
});
const event = (accountId: string, chatId: string, messageId: string) => ({
  event: 'message_received', account_type: 'WHATSAPP', account_id: accountId, chat_id: chatId, message_id: messageId,
});

class FakeProvider implements LinkingProvider {
  readonly botAccountId = 'sol-shared-bot';
  links = new Map<string, string>();
  sent: { recipientId: string; code: string; chatId: string }[] = [];
  subscriptions: string[] = [];
  lookedUpOwners: string[] = [];
  messageCalls: string[] = [];
  historyCalls: string[] = [];
  storedMessages = new Map<string, NormalizedMessage | null>();
  private recipients = new Map<string, string>();
  messageGate?: () => Promise<void>;
  subscriptionFailure = false;
  pairingCalls: string[] = [];
  pairingChecks = 0;
  pairingConnected = false;
  pairingUnsupported = false;
  pairingGate?: Promise<void>;

  async pairing(phone: string) {
    this.pairingCalls.push(phone);
    if (this.pairingUnsupported) throw new UnsupportedPairingCheckpoint();
    return { accountId: 'personal-a', pairingCode: 'A1B2-C3D4' };
  }
  async pairingOwner(accountId: string) {
    this.pairingChecks++;
    await this.pairingGate;
    return this.pairingConnected ? this.owner(accountId) : null;
  }

  async link(connectionId: string, callbackUrl: string, _expiresAt: string) {
    this.links.set(connectionId, callbackUrl);
    return `https://account.unipile.com/${connectionId}`;
  }
  async owner(accountId: string) {
    this.lookedUpOwners.push(accountId);
    if (!['personal-a', 'personal-b'].includes(accountId)) throw new Error('Unrecognized synthetic account');
    const phone = accountId === 'personal-a' ? '56911111111' : '56922222222';
    return { accountId, ownerId: `whatsapp:${phone}`, recipientId: `${phone}@s.whatsapp.net` };
  }
  async sendCode(recipientId: string, code: string) {
    const chatId = this.recipients.get(recipientId) ?? `bot-dm-${this.recipients.size + 1}`;
    this.recipients.set(recipientId, chatId);
    this.sent.push({ recipientId, code, chatId });
    return { chatId, messageId: `verification-${this.sent.length}` };
  }
  async subscribe(accountId: string, _publicUrl: string, _secret: string) {
    if (this.subscriptionFailure) throw new Error('Synthetic subscription failure');
    this.subscriptions.push(accountId);
  }
  async catalog(accountId: string, cursor?: string) {
    const id = cursor ? 'manual-chat' : 'suggested-chat';
    return { items: [{ id, accountId, name: `${accountId}: ${id}`, type: 1 }], cursor: cursor ? null : 'second-page' };
  }
  async chat(accountId: string, chatId: string): Promise<ChatMetadata> {
    return { id: chatId, accountId, name: `Chat ${chatId}`, type: accountId === this.botAccountId && chatId.startsWith('bot-dm-') ? 0 : 1 };
  }
  async messages(accountId: string, chatId: string) {
    this.historyCalls.push(`${accountId}/${chatId}`);
    return { items: [incoming(accountId, chatId, 'historical-context')], cursor: null };
  }
  async message(accountId: string, messageId: string) {
    this.messageCalls.push(`${accountId}/${messageId}`);
    await this.messageGate?.();
    return this.storedMessages.get(`${accountId}/${messageId}`) ?? null;
  }
  put(message: NormalizedMessage) {
    this.storedMessages.set(`${message.accountId}/${message.id}`, message);
    return event(message.accountId, message.chatId, message.id);
  }
}

async function fixture(options: { pairingEnabled?: boolean; botQueueEnabled?: boolean } = {}) {
  let now = time;
  const store = new MemoryMultiUserStore();
  const identity = new IdentityService(store, { secret: 'synthetic-identity-secret-never-used-live-0000', clock: () => now });
  const provider = new FakeProvider();
  const catalog = new CatalogService(store, identity, provider, () => time);
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use('/api/v1', multiUserRouter({ store, identity, catalog, provider, publicUrl: 'https://sol.example', webhookSecret, rateSecret, ...options }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function request(path: string, body?: unknown, options: { token?: string; method?: string; headers?: Record<string, string> } = {}) {
    const response = await fetch(base + path, {
      method: options.method ?? (body === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...options.headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  async function start() {
    const session = await request('/api/v1/sessions', {});
    assert.equal(session.status, 201);
    const connection = await request('/api/v1/whatsapp/connections', {}, { token: session.body.token });
    assert.equal(connection.status, 201);
    const callback = new URL(provider.links.get(connection.body.connectionId)!);
    assert.equal(callback.origin, 'https://sol.example');
    assert.equal(connection.body.callbackToken, undefined);
    assert.equal(connection.body.code, undefined);
    return { token: session.body.token as string, userId: session.body.userId as string, connectionId: connection.body.connectionId as string, callbackPath: callback.pathname };
  }
  async function connect(accountId: string) {
    const user = await start();
    const callback = await request(user.callbackPath, { status: 'CREATION_SUCCESS', account_id: accountId, name: user.connectionId });
    assert.equal(callback.status, 200);
    assert.deepEqual(callback.body, { ok: true });
    const sent = provider.sent.at(-1)!;
    const verify = await request(`/api/v1/whatsapp/connections/${user.connectionId}/verify`, { code: sent.code }, { token: user.token });
    assert.equal(verify.status, 200);
    assert.equal(verify.body.status, 'verified');
    return { ...user, ...sent, accountId };
  }
  const webhook = (body: unknown) => request('/api/v1/webhooks/unipile', body, { headers: { 'X-Sol-Webhook-Secret': webhookSecret } });
  const close = async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await store.close();
  };
  return { store, identity, catalog, provider, request, start, connect, webhook, close, advance(ms: number) { now += ms; } };
}

test('verified bot inbox and pending index persist together without duplicating turns', async () => {
  const f = await fixture({ botQueueEnabled: true });
  try {
    const a = await f.connect('personal-a');
    const event = f.provider.put(incoming(f.provider.botAccountId, a.chatId, 'durable-owner-turn'));
    assert.equal((await f.webhook(event)).body.accepted, true);
    assert.equal((await f.webhook(event)).body.accepted, false);
    const rows = await f.store.transaction(async tx => {
      const pending = await tx.list<{ inboxKey: string; userId: string; messageId: string }>('bot_pending', '');
      return { pending, inbox: await tx.get('bot_inbox', pending[0]!.inboxKey) };
    });
    assert.equal(rows.pending.length, 1);
    assert.equal(rows.pending[0]!.userId, a.userId);
    assert.equal(rows.pending[0]!.messageId, 'durable-owner-turn');
    assert.ok(rows.inbox);
  } finally { await f.close(); }
});

test('disabled v1 stores the bot inbox without scheduling replies on later activation', async () => {
  const f = await fixture();
  try {
    const a = await f.connect('personal-a');
    await f.webhook(f.provider.put(incoming(f.provider.botAccountId, a.chatId, 'before-v1')));
    assert.equal((await f.store.transaction(tx => tx.list('bot_pending', ''))).length, 0);
    assert.equal((await f.store.transaction(tx => tx.list('bot_inbox', ''))).length, 1);
  } finally { await f.close(); }
});

test('pairing is disabled by default and makes no account creation or code delivery', async () => {
  const f = await fixture();
  try {
    const session = await f.request('/api/v1/sessions', {});
    const reply = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56911111111' }, { token: session.body.token });
    assert.equal(reply.status, 503);
    assert.deepEqual(reply.body, { error: 'pairing_not_enabled', fallback: 'hosted_auth' });
    assert.equal(f.provider.pairingCalls.length, 0);
    assert.equal(f.provider.sent.length, 0);
  } finally { await f.close(); }
});

test('pairing waits for canonical provider confirmation then sends one SOL OTP despite concurrent polls', async () => {
  const f = await fixture({ pairingEnabled: true });
  let release: (() => void) | undefined;
  try {
    const session = await f.request('/api/v1/sessions', {}), token = session.body.token;
    const started = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '+56911111111' }, { token });
    assert.equal(started.status, 201);
    assert.equal(started.body.pairingCode, 'A1B2-C3D4');
    assert.equal(started.body.accountId, undefined);
    assert.equal(started.body.callbackToken, undefined);
    assert.equal(started.body.status, 'connecting');
    assert.deepEqual(f.provider.pairingCalls, ['56911111111']);
    const base = `/api/v1/whatsapp/connections/${started.body.connectionId}`;
    assert.equal((await f.request(`${base}/check`, {}, { token })).body.status, 'connecting');
    assert.equal(f.provider.sent.length, 0);
    assert.equal((await f.request(`${base}/verify`, { code: '000000' }, { token })).status, 400);
    f.advance(2000);
    f.provider.pairingConnected = true;
    f.provider.pairingGate = new Promise<void>(resolve => { release = resolve; });
    const first = f.request(`${base}/check`, {}, { token });
    while (f.provider.pairingChecks < 2) await new Promise<void>(resolve => setImmediate(resolve));
    f.advance(2000);
    const second = f.request(`${base}/check`, {}, { token });
    while (f.provider.pairingChecks < 3) await new Promise<void>(resolve => setImmediate(resolve));
    release!();
    const results = await Promise.all([first, second]);
    assert.ok(results.every(result => result.status === 200));
    assert.equal(f.provider.sent.length, 1);
    assert.equal(f.provider.sent[0].recipientId, '56911111111@s.whatsapp.net');
    const state = await f.request(base, undefined, { token });
    assert.equal(state.body.status, 'awaiting_code');
    assert.equal(state.body.codeStatus, 'sent');
    assert.equal(state.body.pairingCode, undefined);
    assert.equal((await f.request(`${base}/verify`, { code: f.provider.sent[0].code }, { token })).body.monitoringReady, true);
    assert.equal((await f.request('/api/v1/me', undefined, { token })).body.whatsapp, 'verified');
  } finally { release?.(); await f.close(); }
});

test('pairing rejects another user, requested/canonical identity mismatch and client-injected provider IDs', async () => {
  const f = await fixture({ pairingEnabled: true });
  try {
    const a = (await f.request('/api/v1/sessions', {})).body, b = (await f.request('/api/v1/sessions', {})).body;
    const injected = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56911111111', accountId: 'forged' }, { token: a.token });
    assert.equal(injected.status, 400);
    assert.equal(f.provider.pairingCalls.length, 0);
    const started = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56922222222' }, { token: a.token });
    const base = `/api/v1/whatsapp/connections/${started.body.connectionId}`;
    assert.equal((await f.request(`${base}/check`, {}, { token: b.token })).status, 404);
    assert.equal((await f.request(base, {}, { token: b.token, method: 'DELETE' })).status, 404);
    assert.equal(f.provider.pairingChecks, 0);
    f.provider.pairingConnected = true;
    const checked = await f.request(`${base}/check`, {}, { token: a.token });
    assert.equal(checked.status, 409);
    assert.equal(checked.body.error, 'pairing_identity_mismatch');
    assert.equal(f.provider.sent.length, 0);
  } finally { await f.close(); }
});

test('cancelled, expired and revoked pairing cannot be promoted by a late provider response', async () => {
  const f = await fixture({ pairingEnabled: true });
  let release: (() => void) | undefined;
  try {
    const a = (await f.request('/api/v1/sessions', {})).body;
    const started = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56911111111' }, { token: a.token });
    const base = `/api/v1/whatsapp/connections/${started.body.connectionId}`;
    f.provider.pairingConnected = true;
    f.provider.pairingGate = new Promise<void>(resolve => { release = resolve; });
    const inFlight = f.request(`${base}/check`, {}, { token: a.token });
    while (!f.provider.pairingChecks) await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal((await f.request(base, {}, { token: a.token, method: 'DELETE' })).status, 200);
    release!();
    assert.equal((await inFlight).status, 409);
    assert.equal(f.provider.sent.length, 0);
    const next = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56911111111' }, { token: a.token });
    f.advance(10 * 60_000);
    assert.equal((await f.request(`/api/v1/whatsapp/connections/${next.body.connectionId}/check`, {}, { token: a.token })).status, 410);
    assert.equal(f.provider.pairingChecks, 1);
    const third = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56911111111' }, { token: a.token });
    await f.identity.logout(await f.identity.authenticate(a.token), true);
    assert.equal((await f.request(`/api/v1/whatsapp/connections/${third.body.connectionId}/check`, {}, { token: a.token })).status, 401);
    assert.equal(f.provider.sent.length, 0);
  } finally { release?.(); await f.close(); }
});

test('unsupported checkpoint has an actionable hosted fallback and reconnection never creates a different account', async () => {
  const f = await fixture({ pairingEnabled: true });
  try {
    const a = (await f.request('/api/v1/sessions', {})).body;
    f.provider.pairingUnsupported = true;
    const unsupported = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56911111111' }, { token: a.token });
    assert.equal(unsupported.status, 502);
    assert.deepEqual(unsupported.body, { error: 'unsupported_checkpoint', fallback: 'hosted_auth' });
    assert.equal((await f.request('/api/v1/whatsapp/connections', {}, { token: a.token })).status, 201);
    f.provider.pairingUnsupported = false;
    const verified = await f.connect('personal-b');
    const before = f.provider.pairingCalls.length;
    const reconnect = await f.request('/api/v1/whatsapp/connections/pairing', { phone: '56911111111' }, { token: verified.token });
    assert.equal(reconnect.status, 409);
    assert.equal(reconnect.body.error, 'pairing_reconnect_requires_hosted');
    assert.equal(f.provider.pairingCalls.length, before);
  } finally { await f.close(); }
});

test('HTTP links two users with canonical recipients, private callbacks and session-bound verification', async () => {
  const f = await fixture();
  try {
    const a = await f.start(), b = await f.start();
    assert.notEqual(a.userId, b.userId);
    assert.notEqual(a.token, b.token);
    assert.equal((await f.request('/api/v1/me', undefined, { token: 'legacy-owner-bearer' })).status, 401);
    assert.equal((await f.request('/api/v1/me')).status, 401);
    assert.equal((await f.request('/api/v1/sessions', { userId: a.userId })).status, 400);
    assert.equal((await f.request('/api/v1/whatsapp/connections', { accountId: 'personal-a', phone: 'attacker' }, { token: b.token })).status, 400);
    assert.equal((await f.request(`${a.callbackPath}x`, { status: 'CREATION_SUCCESS', account_id: 'personal-a', name: a.connectionId })).status, 401);
    assert.equal(f.provider.lookedUpOwners.length, 0);

    const callbackA = await f.request(a.callbackPath, { status: 'CREATION_SUCCESS', account_id: 'personal-a', name: a.connectionId, phone: 'attacker-controlled' });
    assert.equal(callbackA.status, 200);
    assert.deepEqual(callbackA.body, { ok: true });
    assert.equal(callbackA.headers.get('cache-control'), 'no-store');
    const codeA = f.provider.sent[0];
    assert.equal(codeA.recipientId, '56911111111@s.whatsapp.net');
    assert.equal((await f.request(a.callbackPath, { status: 'CREATION_SUCCESS', account_id: 'personal-a', name: a.connectionId })).status, 200);
    assert.equal(f.provider.sent.length, 1);
    assert.equal((await f.request(`/api/v1/whatsapp/connections/${a.connectionId}`, undefined, { token: b.token })).status, 404);
    assert.equal((await f.request(`/api/v1/whatsapp/connections/${a.connectionId}/verify`, { code: codeA.code }, { token: b.token })).status, 404);

    await f.request(b.callbackPath, { status: 'CREATION_SUCCESS', account_id: 'personal-b', name: b.connectionId });
    const codeB = f.provider.sent[1];
    assert.equal(codeB.recipientId, '56922222222@s.whatsapp.net');
    if (codeA.code !== codeB.code) assert.equal((await f.request(`/api/v1/whatsapp/connections/${b.connectionId}/verify`, { code: codeA.code }, { token: b.token })).status, 400);
    assert.equal((await f.request('/api/v1/whatsapp/chats', undefined, { token: a.token })).status, 409);
    const state = await f.request(`/api/v1/whatsapp/connections/${a.connectionId}`, undefined, { token: a.token });
    assert.equal(state.body.code, undefined);
    assert.equal(state.body.callbackToken, undefined);
    assert.equal(state.body.recipientId, undefined);
    for (const [user, code] of [[a, codeA], [b, codeB]] as const) {
      const verified = await f.request(`/api/v1/whatsapp/connections/${user.connectionId}/verify`, { code: code.code }, { token: user.token });
      assert.equal(verified.status, 200);
      assert.equal(verified.body.monitoringReady, true);
      assert.equal(verified.body.autoReply, false);
      assert.equal((await f.request(`/api/v1/whatsapp/connections/${user.connectionId}/activate`, {}, { token: user.token })).status, 200);
      assert.equal((await f.request('/api/v1/me', undefined, { token: user.token })).body.userId, user.userId);
      assert.equal((await f.request(`/api/v1/whatsapp/connections/${user.connectionId}/verify`, { code: code.code }, { token: user.token })).status, 400);
    }
    assert.equal(f.provider.sent.length, 2);
    assert.ok(f.provider.subscriptions.includes('personal-a'));
    assert.ok(f.provider.subscriptions.includes('personal-b'));
    assert.ok(f.provider.subscriptions.includes(f.provider.botAccountId));
  } finally { await f.close(); }
});

test('HTTP catalog suggestions use no messages and manual selection grants only that user access', async () => {
  const f = await fixture();
  try {
    const a = await f.connect('personal-a'), b = await f.connect('personal-b');
    const first = await f.request('/api/v1/whatsapp/chats', undefined, { token: a.token });
    assert.equal(first.status, 200); assert.equal(first.body.complete, false);
    const second = await f.request(`/api/v1/whatsapp/chats?cursor=${encodeURIComponent(first.body.cursor)}`, undefined, { token: a.token });
    assert.equal(second.status, 200); assert.equal(second.body.complete, true);
    const snapshot = await f.request('/api/v1/whatsapp/catalog-snapshot', undefined, { token: a.token });
    assert.equal(snapshot.body.cachedCount, 2);
    assert.deepEqual(snapshot.body.items.map((x: { id: string }) => x.id), ['manual-chat', 'suggested-chat']);
    assert.equal((await f.request('/api/v1/whatsapp/recommendations', {}, { token: a.token })).status, 503);
    assert.equal((await f.request('/api/v1/chat', { text: 'Hola' }, { token: a.token })).status, 503);
    assert.equal(f.provider.historyCalls.length, 0); assert.equal(f.provider.messageCalls.length, 0);
    assert.equal((await f.request('/api/v1/whatsapp/chats/manual-chat/import', {}, { token: a.token })).status, 403);
    assert.equal(f.provider.historyCalls.length, 0);
    assert.equal((await f.webhook(f.provider.put(incoming('personal-a', 'manual-chat', 'before-selection')))).body.ignored, 'not_selected');
    assert.equal(f.provider.messageCalls.length, 0);
    assert.equal((await f.request('/api/v1/whatsapp/chats/manual-chat/selection', { selected: true }, { token: a.token, method: 'PUT' })).status, 200);
    assert.equal((await f.request('/api/v1/whatsapp/chats/manual-chat/import', {}, { token: a.token })).body.imported, 1);
    assert.equal((await f.request('/api/v1/whatsapp/chats/manual-chat/messages', undefined, { token: b.token })).status, 403);
    const newEvent = f.provider.put(incoming('personal-a', 'manual-chat', 'after-selection'));
    assert.equal((await f.webhook(newEvent)).body.accepted, true);
    assert.equal((await f.webhook(newEvent)).body.duplicate, true);
    assert.equal((await f.request('/api/v1/whatsapp/chats/manual-chat/messages', undefined, { token: a.token })).body.items.length, 2);
    await f.request('/api/v1/whatsapp/chats/manual-chat/selection', { selected: false }, { token: a.token, method: 'PUT' });
    assert.equal((await f.request('/api/v1/whatsapp/chats/manual-chat/messages', undefined, { token: a.token })).status, 403);
    const lookupCount = f.provider.messageCalls.length;
    assert.equal((await f.webhook(f.provider.put(incoming('personal-a', 'manual-chat', 'after-revocation')))).body.ignored, 'not_selected');
    assert.equal(f.provider.messageCalls.length, lookupCount);
  } finally { await f.close(); }
});

test('one bot routes verified direct chats to separate inboxes and rejects unknown, own and historical messages', async () => {
  const f = await fixture();
  try {
    const a = await f.connect('personal-a'), b = await f.connect('personal-b');
    const aEvent = f.provider.put(incoming(f.provider.botAccountId, a.chatId, 'same-provider-message-id', { text: 'Solo para A.' }));
    const bEvent = f.provider.put(incoming(f.provider.botAccountId, b.chatId, 'different-provider-id', { text: 'Solo para B.' }));
    assert.equal((await f.request('/api/v1/webhooks/unipile', aEvent)).status, 401);
    assert.equal((await f.webhook(aEvent)).body.accepted, true);
    assert.equal((await f.webhook(aEvent)).body.accepted, false);
    assert.equal((await f.webhook(bEvent)).body.accepted, true);
    const aInbox = await f.request('/api/v1/whatsapp/bot/messages', undefined, { token: a.token });
    const bInbox = await f.request('/api/v1/whatsapp/bot/messages', undefined, { token: b.token });
    assert.deepEqual(aInbox.body.items.map((x: { text: string }) => x.text), ['Solo para A.']);
    assert.deepEqual(bInbox.body.items.map((x: { text: string }) => x.text), ['Solo para B.']);
    assert.ok(aInbox.body.items.every((x: { userId: string }) => x.userId === a.userId));
    assert.ok(bInbox.body.items.every((x: { userId: string }) => x.userId === b.userId));
    const calls = f.provider.messageCalls.length;
    assert.equal((await f.webhook(f.provider.put(incoming(f.provider.botAccountId, 'unknown-chat', 'unknown')))).body.ignored, 'unverified_sender');
    assert.equal(f.provider.messageCalls.length, calls);
    assert.equal((await f.webhook(f.provider.put(incoming(f.provider.botAccountId, a.chatId, 'own', { direction: 'outgoing' })))).body.ignored, 'not_incoming_text');
    const historical = await f.webhook(f.provider.put(incoming(f.provider.botAccountId, a.chatId, 'old', { sentAt: new Date(time - 86_400_000).toISOString() })));
    assert.ok(historical.body.ignored, 'Messages predating verification must not be accepted as new bot requests');
    assert.equal((await f.request('/api/v1/whatsapp/bot/messages', undefined, { token: a.token })).body.items.length, 1);
    await f.request('/api/v1/whatsapp/connection', undefined, { token: a.token, method: 'DELETE' });
    assert.equal((await f.webhook(f.provider.put(incoming(f.provider.botAccountId, a.chatId, 'after-disconnect')))).body.ignored, 'unverified_sender');
    assert.equal((await f.request('/api/v1/whatsapp/bot/messages', undefined, { token: a.token })).status, 409);
    assert.equal((await f.request('/api/v1/whatsapp/bot/messages', undefined, { token: b.token })).body.items.length, 1);
  } finally { await f.close(); }
});

test('HTTP webhook cannot persist a REST lookup after permission was revoked and selected again', async () => {
  const f = await fixture();
  try {
    const a = await f.connect('personal-a');
    await f.request('/api/v1/whatsapp/chats/manual-chat/selection', { selected: true }, { token: a.token, method: 'PUT' });
    let release!: () => void, started!: () => void;
    const waiting = new Promise<void>(r => { release = r; });
    const entered = new Promise<void>(r => { started = r; });
    f.provider.messageGate = async () => { started(); await waiting; };
    const response = f.webhook(f.provider.put(incoming('personal-a', 'manual-chat', 'in-flight')));
    await entered;
    await f.request('/api/v1/whatsapp/chats/manual-chat/selection', { selected: false }, { token: a.token, method: 'PUT' });
    await f.request('/api/v1/whatsapp/chats/manual-chat/selection', { selected: true }, { token: a.token, method: 'PUT' });
    release();
    assert.equal((await response).body.ignored, 'not_authorized');
    assert.equal((await f.request('/api/v1/whatsapp/chats/manual-chat/messages', undefined, { token: a.token })).body.items.length, 0);
  } finally { await f.close(); }
});

test('verification survives subscription setup failure and activation retries without sending another code', async () => {
  const f = await fixture();
  try {
    const a = await f.start();
    await f.request(a.callbackPath, { status: 'CREATION_SUCCESS', account_id: 'personal-a', name: a.connectionId });
    f.provider.subscriptionFailure = true;
    const failed = await f.request(`/api/v1/whatsapp/connections/${a.connectionId}/verify`, { code: f.provider.sent[0].code }, { token: a.token });
    assert.equal(failed.status, 500);
    assert.equal((await f.request(`/api/v1/whatsapp/connections/${a.connectionId}`, undefined, { token: a.token })).body.status, 'verified');
    f.provider.subscriptionFailure = false;
    assert.equal((await f.request(`/api/v1/whatsapp/connections/${a.connectionId}/activate`, {}, { token: a.token })).status, 200);
    assert.equal(f.provider.sent.length, 1);
  } finally { await f.close(); }
});
