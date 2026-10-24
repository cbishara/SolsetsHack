import assert from 'node:assert/strict';
import { createServer, type IncomingMessage as Req } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createHttpAgent } from '../src/agent.ts';
import { createApp } from '../src/app.ts';
import { demoCategories } from '../src/fixtures.ts';
import { Guard } from '../src/guard.ts';
import { FileStore } from '../src/store/file.ts';
import { MemoryStore } from '../src/store/store.ts';
import { nightDate } from '../src/time.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Seen = { path: string; auth?: string; body: any };
type Reply = (body: any) => { status?: number; body?: unknown; delayMs?: number };

/** A fake `agent` service: records each request and answers like /v1/app/classify. */
async function fakeAgent(reply: Reply) {
  const seen: Seen[] = [];
  const server = createServer(async (req: Req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    seen.push({ path: req.url ?? '', auth: req.headers.authorization, body });
    const r = reply(body);
    if (r.delayMs) await new Promise((ok) => setTimeout(ok, r.delayMs));
    res.writeHead(r.status ?? 200, { 'Content-Type': 'application/json' }).end(JSON.stringify(r.body ?? {}));
  });
  server.listen(0);
  await new Promise((r) => server.once('listening', r));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen, close: () => server.close() };
}

const classified = (patch: Record<string, unknown> = {}) => ({
  decision: 'report', reason: 'Puede esperar.', isNew: false, confidence: 0.9, incidentKey: 'k-portal',
  messageId: 'x', engine: 'codex', model: 'm', fallbackReason: null, kind: 'classify',
  categoryId: null, summary: 'Portal de clientes caído', context: 'Clientes sin acceso.\nRevisa el balanceador.', ...patch,
});

async function start(reply: Reply, { timeoutMs = 2000 } = {}) {
  const agent = await fakeAgent(reply);
  const guard = new Guard(new MemoryStore(), createHttpAgent({ url: `${agent.url}/`, token: 'agent-secret', userId: 'rodrigo-demo', timeoutMs }));
  const server = createApp(guard, { apiToken: 'app-token', twoChat: {}, allowSimulate: true }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, init: RequestInit = {}, token: string | null = 'app-token') =>
    fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const json = async (path: string, init: RequestInit = {}) => (await call(path, init)).json();
  const send = (text: string, group = 'Guardia TI (demo)') =>
    json('/api/messages', { method: 'POST', body: JSON.stringify({ text, sender: 'Javier', group }) });
  return { guard, agent, call, json, send, close: () => { server.close(); agent.close(); } };
}

test('http agent: maps the message to /v1/app/classify and keeps category, summary and context in feed and report', async () => {
  const s = await start((body) => ({ body: classified({ categoryId: body.categories[0]?.id ?? null }) }));
  try {
    await s.json('/api/categories', { method: 'POST', body: JSON.stringify({ id: 'c-incident', name: 'Caída de servicio', description: 'Portal o VPN caídos.', action: 'alert', wakeAtNight: true }) });
    await s.json('/api/categories', { method: 'POST', body: JSON.stringify({ name: 'Sugerida', status: 'suggested', origin: 'sol' }) });
    await s.send('Se cayó el portal de clientes');
    await s.send('Confirmo, el portal no responde');

    assert.equal(s.agent.seen.length, 2);
    const [first, second] = s.agent.seen;
    assert.equal(first.path, '/v1/app/classify');
    assert.equal(first.auth, 'Bearer agent-secret');
    assert.equal(first.body.userId, 'rodrigo-demo');
    assert.match(first.body.requestId, UUID);
    assert.notEqual(first.body.requestId, second.body.requestId);
    assert.equal(first.body.ownerVerified, true);
    assert.equal(first.body.synthetic, true);
    assert.deepEqual(Object.keys(first.body.message).sort(), ['externalId', 'group', 'id', 'receivedAt', 'sender', 'source', 'text']);
    assert.equal(first.body.message.source, 'simulated');
    assert.equal(first.body.message.text, 'Se cayó el portal de clientes');
    assert.deepEqual(first.body.recent, []);
    // Only active categories reach the agent.
    assert.deepEqual(first.body.categories.map((c: { id: string }) => c.id), ['c-incident']);
    assert.equal(first.body.categories[0].wakeAtNight, true);
    // The second message carries the first incident, in the documented shape.
    assert.equal(second.body.recent.length, 1);
    assert.deepEqual(Object.keys(second.body.recent[0]).sort(), ['group', 'incidentKey', 'receivedAt', 'text', 'userId']);
    assert.equal(second.body.recent[0].incidentKey, 'k-portal');
    assert.equal(second.body.recent[0].userId, 'rodrigo-demo');

    const feed = await s.json('/api/feed');
    assert.equal(feed.length, 2);
    for (const item of feed) {
      assert.equal(item.categoryId, 'c-incident');
      assert.equal(item.summary, 'Portal de clientes caído');
      assert.equal(item.context, 'Clientes sin acceso.\nRevisa el balanceador.');
    }
    const report = await s.json(`/api/report?date=${nightDate()}`);
    assert.equal(report.woke[0].summary, 'Portal de clientes caído');
  } finally {
    s.close();
  }
});

test('http agent: a wakeAtNight category wakes a report once, and the same incident within 30 min does not wake again', async () => {
  const s = await start(() => ({ body: classified({ categoryId: 'c-incident' }) }));
  try {
    await s.json('/api/categories', { method: 'POST', body: JSON.stringify({ id: 'c-incident', name: 'Caída', action: 'alert', wakeAtNight: true }) });
    await s.json('/api/night/today', { method: 'PUT', body: JSON.stringify({ onCall: true }) });
    const a = await s.send('Se cayó el portal');
    assert.equal(a.item.wouldWake, true);
    assert.equal(a.item.why, 'category');
    const b = await s.send('El portal sigue caído');
    assert.equal(b.item.wouldWake, false);
    assert.equal(b.item.why, 'duplicate');
  } finally {
    s.close();
  }
});

test('http agent: a quiet category never removes a wake, and an unknown category id is dropped', async () => {
  const s = await start(() => ({ body: classified({ decision: 'wake', categoryId: 'c-made-up', incidentKey: 'k-vpn' }) }));
  try {
    await s.json('/api/categories', { method: 'POST', body: JSON.stringify({ id: 'c-quiet', name: 'Ruido', action: 'ignore', wakeAtNight: false }) });
    const r = await s.send('VPN caída en Temuco');
    assert.equal(r.item.categoryId, null);
    assert.equal(r.item.wouldWake, true);
    assert.equal(r.item.why, 'urgent');
  } finally {
    s.close();
  }
});

test('http agent: an error or a timeout wakes Rodrigo with the fallback', async () => {
  const broken = await start(() => ({ status: 503, body: { error: 'engine_unavailable' } }));
  try {
    const r = await broken.send('algo raro');
    assert.equal(r.item.wouldWake, true);
    assert.equal(r.item.decision, 'wake');
    assert.equal(r.item.confidence, 0);
  } finally {
    broken.close();
  }
  const slow = await start(() => ({ delayMs: 400, body: classified() }), { timeoutMs: 50 });
  try {
    const r = await slow.send('algo lento');
    assert.equal(r.item.wouldWake, true);
    assert.equal(r.item.confidence, 0);
  } finally {
    slow.close();
  }
  const malformed = await start(() => ({ body: { decision: 'maybe' } }));
  try {
    assert.equal((await malformed.send('respuesta rota')).item.wouldWake, true);
  } finally {
    malformed.close();
  }
});

test('http agent: real sources (whatsapp, email) never reach the agent', async () => {
  const s = await start(() => ({ body: classified() }));
  try {
    const now = new Date().toISOString();
    const w = await s.guard.ingest({ externalId: 'W1', source: 'whatsapp', sender: 'a', group: 'g', text: 'producción caída', receivedAt: now });
    const e = await s.guard.ingest({ externalId: 'E1', source: 'email', sender: 'b', text: 'Ticket #1: reseteo de clave', receivedAt: now });
    assert.equal(s.agent.seen.length, 0);
    assert.equal(w.status === 'processed' && w.item.wouldWake, true);
    assert.equal(e.status === 'processed' && e.item.decision, 'report');
    // A later simulated message does not carry the real ones in `recent`.
    await s.send('Se cayó el portal');
    assert.deepEqual(s.agent.seen[0].body.recent, []);
  } finally {
    s.close();
  }
});

test('categories: CRUD with validation and the app token', async () => {
  const s = await start(() => ({ body: classified() }));
  try {
    assert.equal((await s.call('/api/categories', {}, null)).status, 401);
    assert.deepEqual(await s.json('/api/categories'), []);

    const created = await s.call('/api/categories', { method: 'POST', body: JSON.stringify({ name: 'Turnos', description: 'Cambios de turno.', action: 'task', color: 'green', icon: 'repeat' }) });
    assert.equal(created.status, 201);
    const cat = await created.json();
    assert.match(cat.id, /^c-/);
    assert.equal(cat.origin, 'you');
    assert.equal(cat.status, 'active');
    assert.equal(cat.wakeAtNight, false);
    assert.ok(cat.createdAt);

    const bad = [{ name: '' }, { name: 'x', action: 'wake' }, { name: 'x', wakeAtNight: 'yes' }, { name: 'x'.repeat(81) }, { id: '__proto__', name: 'x' }];
    for (const body of bad) assert.equal((await s.call('/api/categories', { method: 'POST', body: JSON.stringify(body) })).status, 400, JSON.stringify(body));
    await s.json('/api/categories', { method: 'POST', body: JSON.stringify({ id: 'c-fixed', name: 'Fija' }) });
    assert.equal((await s.call('/api/categories', { method: 'POST', body: JSON.stringify({ id: 'c-fixed', name: 'Otra' }) })).status, 409);

    const patched = await s.json(`/api/categories/${cat.id}`, { method: 'PATCH', body: JSON.stringify({ wakeAtNight: true, status: 'active', origin: 'sol', id: 'hack' }) });
    assert.equal(patched.wakeAtNight, true);
    assert.equal(patched.id, cat.id);
    assert.equal(patched.origin, 'you');
    assert.equal((await s.call(`/api/categories/${cat.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'nope' }) })).status, 400);
    assert.equal((await s.call('/api/categories/nope', { method: 'PATCH', body: '{}' })).status, 404);

    assert.equal((await s.call(`/api/categories/${cat.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await s.call(`/api/categories/${cat.id}`, { method: 'DELETE' })).status, 404);
    assert.deepEqual((await s.json('/api/categories')).map((c: { id: string }) => c.id), ['c-fixed']);
  } finally {
    s.close();
  }
});

test('categories: demo seed runs once and a deletion survives a file store restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'solsets-cat-'));
  const path = join(dir, 'data.jsonl');
  try {
    let store = await FileStore.connect(path);
    let guard = new Guard(store, createHttpAgent({ url: 'http://127.0.0.1:9', userId: 'u' }));
    assert.equal(await guard.seedCategories(demoCategories), true);
    assert.deepEqual((await guard.categories()).map((c) => c.id).sort(), ['c-incident', 'c-request', 'c-security']);
    assert.equal(await guard.deleteCategory('c-request'), true);
    await store.close();

    store = await FileStore.connect(path);
    guard = new Guard(store, createHttpAgent({ url: 'http://127.0.0.1:9', userId: 'u' }));
    assert.equal(await guard.seedCategories(demoCategories), false);
    assert.deepEqual((await guard.categories()).map((c) => c.id).sort(), ['c-incident', 'c-security']);
    await store.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
