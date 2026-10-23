import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createApp } from '../src/app.ts';
import { Guard } from '../src/guard.ts';
import { stubAgent } from '../src/agent.ts';
import { MemoryStore } from '../src/store/store.ts';
import { FileStore } from '../src/store/file.ts';
import { UnipileClient, unipileOrigin } from '../src/unipile/client.ts';
import { WhatsAppService } from '../src/unipile/service.ts';

const accountId = 'demo-account';
const chatId = 'demo-group';
const event = (overrides = {}) => ({
  event: 'message_received', account_id: accountId, account_type: 'WHATSAPP', chat_id: chatId,
  message_id: 'message-1', message: 'Mensaje inventado: el portal de prueba no carga.', timestamp: '2026-10-23T21:00:00.000Z',
  sender: { attendee_provider_id: 'tester' }, account_info: { user_id: 'owner' }, ...overrides,
});
const historyMessage = (overrides = {}) => ({
  id: 'message-1', account_id: accountId, chat_id: chatId, text: 'Mensaje inventado: el portal de prueba no carga.',
  timestamp: '2026-10-23T21:00:00.000Z', sender_id: 'tester', is_sender: 0, ...overrides,
});
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
function fixture(store = new MemoryStore(), fetcher?: typeof fetch) {
  const client = new UnipileClient('https://api-demo.unipile.com:18969', 'test-key', accountId, fetcher ?? (async (url) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith('/messages')) return json({ items: [historyMessage()], cursor: 'older-page' });
    if (path.includes('/accounts/')) return json({ id: accountId, type: 'WHATSAPP', sources: [{ status: 'OK' }] });
    if (path.endsWith('/chats')) return json({ items: [{ id: chatId, account_id: accountId, name: 'SOL Demo', type: 1 }, { id: 'other', account_id: 'other-account' }], cursor: null });
    return json({ id: decodeURIComponent(path.split('/').at(-1)!), account_id: path.endsWith('/foreign') ? 'other-account' : accountId });
  }) as typeof fetch);
  return { store, client, service: new WhatsAppService(store, client) };
}

test('client preserves DSN port, encodes identifiers and cursors, forbids redirect/key exfiltration', async () => {
  assert.equal(unipileOrigin('https://api-demo.unipile.com:18969/api/v1/accounts'), 'https://api-demo.unipile.com:18969');
  for (const url of ['http://api.unipile.com', 'https://unipile.com.evil.test', 'https://api.unipile.com@evil.test', 'https://api.unipile.com/?key=x']) assert.throws(() => unipileOrigin(url));
  let called = false;
  const client = new UnipileClient('https://api-demo.unipile.com:18969', 'secret', accountId, (async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.port, '18969'); assert.equal(url.pathname, '/api/v1/chats/a%2Fb/messages');
    assert.equal(url.searchParams.get('cursor'), 'c+&?='); assert.equal(init?.redirect, 'error');
    assert.equal((init?.headers as Record<string, string>)['X-API-KEY'], 'secret');
    assert.ok(init?.signal); called = true;
    return json({ items: [], cursor: null });
  }) as typeof fetch);
  await client.messages('a/b', 'c+&?='); assert.ok(called);
  const failing = new UnipileClient('https://api-demo.unipile.com', 'secret', accountId, (async () => new Response('private secret', { status: 401 })) as typeof fetch);
  await assert.rejects(failing.account(), (e: Error) => e.message.includes('401') && !e.message.includes('private secret'));
});

test('unselected chats and wrong accounts never persist; selection verifies ownership', async () => {
  const f = fixture();
  assert.deepEqual(await f.service.receive(event()), { ignored: 'chat_not_selected' });
  await assert.rejects(f.service.select('foreign', true), /no pertenece/);
  await f.service.select(chatId, true);
  assert.deepEqual(await f.service.receive(event({ account_id: 'other' })), { ignored: 'account' });
  assert.equal((await f.store.list('whatsapp_messages')).length, 0);
  assert.equal((await f.store.list('raw_events')).length, 0);
  const chats = await f.service.chats(); assert.equal(chats.items.length, 1); assert.equal(chats.items[0].selected, true);
});

test('historical imports, webhook replay and concurrent deliveries deduplicate without waking or replying', async () => {
  const f = fixture(); await f.service.select(chatId, true);
  const imported = await f.service.importHistory(chatId);
  assert.equal(imported.imported, 1); assert.equal(imported.cursor, 'older-page'); assert.equal(imported.notifications, 0);
  const replay = await f.service.receive(event()); assert.equal('duplicate' in replay && replay.duplicate, true);
  const results = await Promise.all(Array.from({ length: 8 }, () => f.service.receive(event({ message_id: 'new' }))));
  assert.equal(results.filter((r) => 'duplicate' in r && !r.duplicate).length, 1);
  const messages = await f.service.messages(chatId);
  assert.equal(messages.items.length, 2); assert.equal(messages.items[0].origin, 'history');
  assert.equal((await f.store.list('alerts')).length, 0); assert.equal((await f.store.list('messages')).length, 0);
  assert.equal((await f.service.status()).autoReply, false);
});

test('outbound/unknown direction cannot masquerade as incoming; invalid/non-message events are ignored', async () => {
  const f = fixture(); await f.service.select(chatId, true);
  await f.service.receive(event({ sender: { attendee_provider_id: 'owner' } }));
  await f.service.receive(event({ message_id: 'unknown', account_info: undefined }));
  const messages = (await f.service.messages(chatId)).items;
  assert.deepEqual(messages.map((m) => m.direction).sort(), ['outgoing', 'unknown']);
  for (const extra of [{ event: 'message_read' }, { timestamp: 'bad' }, { message_id: '' }, { message: '', attachments: [{ id: 'media' }] }]) await f.service.receive(event(extra));
  assert.equal((await f.service.messages(chatId)).items.length, 2);
});

test('history skips foreign, hidden, deleted, event and malformed messages; deselection stops access', async () => {
  const f = fixture(new MemoryStore(), (async (url) => String(url).includes('/messages') ? json({ items: [
    historyMessage({ id: 'ok' }), historyMessage({ id: 'foreign', account_id: 'other' }), historyMessage({ id: 'deleted', deleted: 1 }),
    historyMessage({ id: 'event', is_event: 1 }), historyMessage({ id: 'hidden', hidden: 1 }), historyMessage({ id: 'bad', timestamp: 'invalid' }),
  ], cursor: null }) : json({ id: chatId, account_id: accountId })) as typeof fetch);
  await f.service.select(chatId, true);
  assert.equal((await f.service.importHistory(chatId)).imported, 1);
  await f.service.select(chatId, false);
  await assert.rejects(f.service.messages(chatId), /Selecciona/);
  await assert.rejects(f.service.importHistory(chatId), /Selecciona/);
  assert.deepEqual(await f.service.receive(event()), { ignored: 'chat_not_selected' });
});

test('store scopes before applying a limit, including IDs containing delimiters', async () => {
  const store = new MemoryStore();
  for (let i = 0; i < 205; i++) await store.put('whatsapp_messages', `other:${i}`, { wrong: true });
  await store.put('whatsapp_messages', 'wanted:1', { correct: true });
  for (let i = 205; i < 410; i++) await store.put('whatsapp_messages', `other:${i}`, { wrong: true });
  assert.deepEqual(await store.list('whatsapp_messages', 1, 'wanted:'), [{ correct: true }]);
  const f = fixture(store); await f.service.select('demo:group', true); await f.service.select('demo', true);
  await f.service.receive(event({ chat_id: 'demo:group' }));
  assert.equal((await f.service.messages('demo')).items.length, 0);
});

test('local persistence survives restart with consent and deduplication, and rejects a second writer', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sol-whatsapp-'));
  const path = join(dir, 'demo.jsonl');
  try {
    const store = await FileStore.connect(path);
    const f = fixture(); const service = new WhatsAppService(store, f.client);
    await service.select(chatId, true); await service.receive(event());
    await assert.rejects(FileStore.connect(path), /otro servidor/);
    await store.close();
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    const reopened = await FileStore.connect(path);
    try {
      const restarted = new WhatsAppService(reopened, f.client);
      assert.equal((await restarted.messages(chatId)).items.length, 1);
      const r = await restarted.receive(event()); assert.equal('duplicate' in r && r.duplicate, true);
    } finally { await reopened.close(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('importing older messages does not hide recent context at the 200-message limit', async () => {
  const f = fixture(); await f.service.select(chatId, true);
  await f.service.receive(event({ message_id: 'newest', timestamp: '2026-10-24T00:00:00.000Z' }));
  for (let i = 0; i < 205; i++) await f.service.receive(event({ message_id: `old-${i}` }));
  const messages = await f.service.messages(chatId);
  assert.equal(messages.items.length, 200); assert.equal(messages.items.at(-1)?.id, 'newest');
});

test('HTTP authentication, scoped messages, status events and honest agent readiness', async () => {
  const f = fixture(); const token = 'owner-token'; const secret = 'webhook-secret';
  const config = { apiToken: token, twoChat: {}, allowSimulate: false, unipile: { dsn: 'https://api-demo.unipile.com', apiKey: 'secret', accountId, webhookSecret: secret } };
  const server = createApp(new Guard(f.store, stubAgent), config, f.service).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, body?: unknown, headers = {}, method = body === undefined ? 'GET' : 'POST') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    assert.equal((await call('/api/whatsapp/chats')).status, 401);
    assert.equal((await call('/api/webhooks/unipile', event())).status, 401);
    const owner = { Authorization: `Bearer ${token}` }; const webhook = { 'X-Sol-Webhook-Secret': secret };
    assert.equal((await call(`/api/whatsapp/chats/${chatId}/selection`, { selected: true }, owner, 'PUT')).status, 200);
    assert.equal((await call('/api/webhooks/unipile', event(), webhook)).status, 200);
    const messages = await (await call(`/api/whatsapp/chats/${chatId}/messages`, undefined, owner)).json(); assert.equal(messages.items.length, 1);
    await call('/api/webhooks/unipile', { AccountStatus: { account_id: accountId, account_type: 'WHATSAPP', message: 'CREDENTIALS' } }, webhook);
    const status = await (await call('/api/whatsapp/status', undefined, owner)).json();
    assert.equal(status.lastEvent.status, 'CREDENTIALS'); assert.equal(status.providerStatus, 'OK');
    assert.ok(!JSON.stringify(status).includes('secret'));
    assert.equal((await call('/api/chat', { text: 'hola' }, owner)).status, 503);
  } finally { await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
});

test('webhook does not acknowledge persistence failure', async () => {
  const f = fixture(); await f.service.select(chatId, true);
  f.store.insertIfAbsent = async () => { throw new Error('disk unavailable'); };
  await assert.rejects(f.service.receive(event()), /disk unavailable/);
});

test('subscription paginates existing hooks and sends JSON, secret header and account filter', async () => {
  const created: Record<string, unknown>[] = []; let lists = 0;
  const client = new UnipileClient('https://api-demo.unipile.com', 'secret', accountId, (async (_url, init) => {
    if (init?.method === 'POST') { created.push(JSON.parse(String(init.body))); return json({ id: 'new-hook' }); }
    lists++; return json({ items: lists === 2 ? [{ name: `sol-messaging-${accountId}`, request_url: 'https://sol.example/api/webhooks/unipile' }] : [], cursor: lists === 1 ? 'page2' : null });
  }) as typeof fetch);
  await client.subscribe('https://sol.example', 'hook-secret');
  assert.equal(lists, 2); assert.equal(created.length, 1); assert.equal(created[0].source, 'account_status');
  assert.deepEqual(created[0].account_ids, [accountId]);
  assert.deepEqual(created[0].headers, [{ key: 'Content-Type', value: 'application/json' }, { key: 'X-Sol-Webhook-Secret', value: 'hook-secret' }]);
});
