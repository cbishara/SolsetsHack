import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CatalogService, type CatalogProvider, type ChatMetadata, type NormalizedMessage } from '../src/multiuser/catalog.ts';
import { IdentityService, type Principal } from '../src/multiuser/identity.ts';
import { MemoryMultiUserStore } from '../src/multiuser/store.ts';

const moment = Date.parse('2026-10-23T21:00:00Z');
const metadata = (accountId: string, id = 'shared'): ChatMetadata => ({ id, accountId, name: `Grupo ${accountId} ${id}`, type: 1 });
const message = (accountId: string, overrides: Partial<NormalizedMessage> = {}): NormalizedMessage => ({
  id: 'message-1', accountId, chatId: 'shared', senderId: 'external-person', text: `Dato sintético de ${accountId}`,
  direction: 'incoming', sentAt: new Date(moment).toISOString(), ...overrides,
});

class Provider implements CatalogProvider {
  calls = { catalog: 0, chat: 0, messages: 0 };
  chatHook?: () => Promise<void>;
  messagesHook?: () => Promise<void>;
  foreign = false;
  cyclic = false;
  async catalog(accountId: string, cursor?: string): Promise<{ items: ChatMetadata[]; cursor: string | null }> {
    this.calls.catalog++;
    const item = { ...metadata(accountId, cursor ? 'manual' : 'shared'), preview: 'This content must not pass through' };
    return { items: [item], cursor: cursor ? (this.cyclic ? cursor : null) : 'page2' };
  }
  async chat(accountId: string, chatId: string) {
    this.calls.chat++;
    await this.chatHook?.();
    return metadata(this.foreign ? 'foreign-account' : accountId, chatId);
  }
  async messages(accountId: string, chatId: string) {
    this.calls.messages++;
    await this.messagesHook?.();
    return { items: [message(accountId, { chatId })], cursor: null };
  }
}

async function fixture() {
  const store = new MemoryMultiUserStore();
  let now = moment;
  const identity = new IdentityService(store, { secret: 'synthetic-secret-for-catalog-tests-0000000000', clock: () => now });
  const provider = new Provider();
  const service = new CatalogService(store, identity, provider, () => now);
  async function user(accountId: string) {
    const session = await identity.createSession();
    const principal = await identity.authenticate(session.token);
    const connection = await identity.beginConnection(principal);
    await identity.attachAccount(connection.connectionId, connection.callbackToken, { accountId, ownerId: `owner-${accountId}`, recipientId: `recipient-${accountId}` });
    const challenge = await identity.prepareCode(principal, connection.connectionId);
    await identity.markCodeDelivery(challenge.challengeId, 'sent');
    await identity.verifyCode(principal, connection.connectionId, challenge.code);
    return principal;
  }
  const a = await user('account-a');
  const b = await user('account-b');
  return { store, identity, provider, service, a, b, advance: (ms: number) => { now += ms; } };
}

function gate() {
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((r) => { release = r; });
  const entered = new Promise<void>((r) => { started = r; });
  return { entered, release, hook: async () => { started(); await waiting; } };
}

test('catalog traverses all pages, exposes completeness, strips previews and never reads messages', async () => {
  const f = await fixture();
  const first = await f.service.catalog(f.a);
  assert.equal(first.complete, false);
  assert.equal(first.cursor, 'page2');
  assert.equal(first.items[0].selected, false);
  const partial = await f.service.snapshot(f.a);
  assert.equal(partial.complete, false);
  assert.deepEqual(partial.items, [{ id: 'shared', name: 'Grupo account-a shared', type: 1 }]);
  const last = await f.service.catalog(f.a, first.cursor!);
  assert.equal(last.complete, true);
  const snapshot = await f.service.snapshot(f.a);
  assert.equal(snapshot.complete, true);
  assert.equal(snapshot.cachedCount, 2);
  assert.deepEqual(snapshot.items.map((x) => x.id), ['manual', 'shared']);
  assert.equal(JSON.stringify(snapshot).includes('preview'), false);
  assert.equal(JSON.stringify(snapshot).includes('must not pass'), false);
  assert.equal(f.provider.calls.messages, 0);
  assert.equal(f.provider.calls.chat, 0);
  const calls = f.provider.calls.catalog;
  await f.service.catalog(f.a, first.cursor!); // Safe replay of a previously fetched cursor.
  assert.equal(f.provider.calls.catalog, calls);
  await assert.rejects(f.service.catalog(f.a, 'forged-cursor'), /invalid_catalog_cursor/);
  assert.equal((await f.service.snapshot(f.b)).cachedCount, 0);
});

test('suggestions cannot select, invent or cross users; unsuggested chat can be manually selected', async () => {
  const f = await fixture();
  await f.service.catalog(f.a);
  await f.service.catalog(f.a, 'page2');
  const snapshot = await f.service.snapshot(f.a);
  await f.service.applyRecommendations(f.a, snapshot.id, [{ chatId: 'shared', relevance: 0.8, reason: 'El nombre coincide con una necesidad declarada.' }]);
  assert.equal(await f.service.mayReceive('account-a', 'shared'), false);
  await assert.rejects(f.service.applyRecommendations(f.b, snapshot.id, []), /snapshot_not_found/);
  await assert.rejects(f.service.applyRecommendations(f.a, snapshot.id, [{ chatId: 'unknown', relevance: 1, reason: 'No existe.' }]), /invalid_recommendations/);
  await assert.rejects(f.service.applyRecommendations(f.a, snapshot.id, [
    { chatId: 'shared', relevance: 1, reason: 'Una vez.' }, { chatId: 'shared', relevance: 1, reason: 'Dos veces.' },
  ]), /invalid_recommendations/);
  await f.service.select(f.a, 'manual', true);
  assert.equal(await f.service.mayReceive('account-a', 'manual'), true);
  assert.equal(await f.service.mayReceive('account-b', 'manual'), false);
  await f.service.select(f.a, 'shared', false);
  await f.service.applyRecommendations(f.a, snapshot.id, [{ chatId: 'shared', relevance: 1, reason: 'Sugerencia posterior.' }]);
  assert.equal(await f.service.mayReceive('account-a', 'shared'), false);
  f.advance(10 * 60_000);
  await assert.rejects(f.service.applyRecommendations(f.a, snapshot.id, []), /snapshot_expired/);
});

test('unselected content is neither fetched nor stored, foreign ownership fails closed', async () => {
  const f = await fixture();
  await assert.rejects(f.service.importHistory(f.a, 'shared'), /chat_not_selected/);
  assert.deepEqual(await f.service.ingest(message('account-a')), { ignored: 'not_authorized' });
  assert.equal(f.provider.calls.messages, 0);
  assert.equal(f.provider.calls.chat, 0);
  await assert.rejects(f.service.messages(f.a, 'shared'), /chat_not_selected/);
  f.provider.foreign = true;
  await assert.rejects(f.service.select(f.a, 'shared', true), /chat_not_owned/);
  assert.equal(await f.service.mayReceive('account-a', 'shared'), false);
  await assert.rejects(f.service.catalog(f.a).then(async () => {
    // A deliberately mixed-account provider page cannot be persisted.
    f.provider.catalog = async () => ({ items: [metadata('account-b')], cursor: null });
    await f.service.catalog(f.a);
  }), /chat_not_owned/);
});

test('history/webhook dedup and content are isolated even with the same chat/message IDs', async () => {
  const f = await fixture();
  await f.service.select(f.a, 'shared', true);
  await f.service.select(f.b, 'shared', true);
  assert.deepEqual(await f.service.importHistory(f.a, 'shared'), { imported: 1, skipped: 0, cursor: null, notifications: 0 });
  const duplicate = await f.service.ingest(message('account-a'));
  assert.ok('accepted' in duplicate && duplicate.duplicate && !duplicate.eligibleForAgent);
  await f.service.ingest(message('account-b'));
  const a = (await f.service.messages(f.a, 'shared')).items;
  const b = (await f.service.messages(f.b, 'shared')).items;
  assert.equal(a.length, 1); assert.equal(b.length, 1);
  assert.equal(a[0].text, 'Dato sintético de account-a');
  assert.equal(b[0].text, 'Dato sintético de account-b');
  assert.equal(a[0].origin, 'history'); assert.equal(b[0].origin, 'webhook');
  const own = await f.service.ingest(message('account-a', { id: 'own', direction: 'outgoing' }));
  const unknown = await f.service.ingest(message('account-a', { id: 'unknown', direction: 'unknown' }));
  assert.ok('accepted' in own && !own.eligibleForAgent);
  assert.ok('accepted' in unknown && !unknown.eligibleForAgent);
  await f.service.select(f.a, 'shared', false);
  await assert.rejects(f.service.messages(f.a, 'shared'), /chat_not_selected/);
  assert.equal((await f.service.messages(f.b, 'shared')).items.length, 1);
});

test('revocation during selection cannot be overwritten by a late provider response', async () => {
  const f = await fixture();
  const wait = gate();
  f.provider.chatHook = wait.hook;
  const selecting = f.service.select(f.a, 'shared', true);
  await wait.entered;
  await f.service.select(f.a, 'shared', false);
  wait.release();
  await assert.rejects(selecting, /selection_changed/);
  assert.equal(await f.service.mayReceive('account-a', 'shared'), false);
});

test('revoke then reselect invalidates an in-flight history import', async () => {
  const f = await fixture();
  await f.service.select(f.a, 'shared', true);
  const wait = gate();
  f.provider.messagesHook = wait.hook;
  const importing = f.service.importHistory(f.a, 'shared');
  await wait.entered;
  await f.service.select(f.a, 'shared', false);
  await f.service.select(f.a, 'shared', true);
  wait.release();
  await assert.rejects(importing, /selection_changed/);
  assert.equal((await f.service.messages(f.a, 'shared')).items.length, 0);
});

test('revocation during canonical ownership lookup drops an incoming webhook', async () => {
  const f = await fixture();
  await f.service.select(f.a, 'shared', true);
  const wait = gate();
  f.provider.chatHook = wait.hook;
  const incoming = f.service.ingest(message('account-a'));
  await wait.entered;
  await f.service.select(f.a, 'shared', false);
  wait.release();
  assert.deepEqual(await incoming, { ignored: 'not_authorized' });
  f.provider.chatHook = undefined;
  await f.service.select(f.a, 'shared', true);
  assert.equal((await f.service.messages(f.a, 'shared')).items.length, 0);
});

test('a permission captured before REST cannot survive revoke/reselect or disconnect', async () => {
  const f = await fixture();
  await f.service.select(f.a, 'shared', true);
  const permission = await f.service.receivePermission('account-a', 'shared');
  assert.ok(permission);
  await f.service.select(f.a, 'shared', false);
  await f.service.select(f.a, 'shared', true);
  assert.deepEqual(await f.service.ingest(message('account-a'), permission), { ignored: 'not_authorized' });
  assert.equal((await f.service.messages(f.a, 'shared')).items.length, 0);
  await f.identity.disconnect(f.a);
  assert.equal(await f.service.mayReceive('account-a', 'shared'), false);
  assert.deepEqual(await f.service.ingest(message('account-a')), { ignored: 'not_authorized' });
  await assert.rejects(f.service.messages(f.a, 'shared'), /whatsapp_not_verified/);
});

test('old recommendation snapshots cannot be applied after catalog refresh', async () => {
  const f = await fixture();
  await f.service.catalog(f.a);
  const snapshot = await f.service.snapshot(f.a);
  await f.service.catalog(f.a);
  await assert.rejects(f.service.applyRecommendations(f.a, snapshot.id, []), /catalog_changed/);
});

test('latest 200 messages are selected after user/account/chat scoping, ordered by sentAt', async () => {
  const f = await fixture();
  await f.service.select(f.a, 'shared', true);
  await f.service.select(f.b, 'shared', true);
  await f.service.select(f.a, 'another:chat', true);
  await f.service.ingest(message('account-a', { id: 'newest', sentAt: new Date(moment + 100_000).toISOString() }));
  for (let i = 0; i < 205; i++) {
    await f.service.ingest(message('account-b', { id: String(i), sentAt: new Date(moment + 1_000_000 + i).toISOString() }));
    await f.service.ingest(message('account-a', { id: String(i), sentAt: new Date(moment + i).toISOString() }));
  }
  await f.service.ingest(message('account-a', { id: 'foreign-chat', chatId: 'another:chat' }));
  const items = (await f.service.messages(f.a, 'shared')).items;
  assert.equal(items.length, 200);
  assert.equal(items.at(-1)?.id, 'newest');
  assert.equal(items[0].id, '6');
  assert.ok(items.every((x) => x.accountId === 'account-a' && x.chatId === 'shared'));
});

test('invalid directions/timestamps and unknown accounts fail closed; cyclic pagination is explicit', async () => {
  const f = await fixture();
  assert.equal(await f.service.mayReceive('not-bound', 'shared'), false);
  await f.service.select(f.a, 'shared', true);
  assert.deepEqual(await f.service.ingest(message('account-a', { sentAt: 'bad' })), { ignored: 'invalid_message' });
  assert.deepEqual(await f.service.ingest(message('account-a', { direction: 'anything' as NormalizedMessage['direction'] })), { ignored: 'invalid_message' });
  await f.service.catalog(f.a);
  f.provider.cyclic = true;
  await assert.rejects(f.service.catalog(f.a, 'page2'), /provider_cursor_cycle/);
  assert.equal((await f.service.snapshot(f.a)).complete, false);
});

test('catalog and stored context require a current verified identity, never a client userId', async () => {
  const f = await fixture();
  await f.service.select(f.a, 'shared', true);
  const forged: Principal = { ...f.a, userId: f.b.userId };
  await assert.rejects(f.service.catalog(forged), /invalid_session/);
  await assert.rejects(f.service.messages(forged, 'shared'), /invalid_session/);
  const session = await f.identity.createSession();
  const unverified = await f.identity.authenticate(session.token);
  await assert.rejects(f.service.catalog(unverified), /whatsapp_not_verified/);
});
