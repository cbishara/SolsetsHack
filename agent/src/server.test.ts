import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createAgent } from './agent.ts';
import { chatCodexOptions, createAgentServer } from './server.ts';
import { rulesEngine } from './engines/rules.ts';
import { MemoryStore } from './store.ts';
import { createChat } from './chat.ts';
import { randomUUID } from 'node:crypto';

async function start(opts: { token?: string; dev: boolean; chatPassword?: string }) {
  const store = new MemoryStore();
  const agent = createAgent({ store, engine: rulesEngine });
  const chat = createChat({ store, userId: 'rodrigo', runner: null });
  const server = createAgentServer({ store, agent, chat, devAgents: { rules: agent }, ...opts });
  await new Promise<void>(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => new Promise(resolve => server.close(resolve)) };
}

const message = { id: 's1', user_id: 'rodrigo', source: 'whatsapp', text: 'URGENTE: se cayó facturación', received_at: '2026-10-23T23:00:00-03:00' };

test('chat deployment selects its own model, effort and Fast settings', () => {
  const env = { CODEX_MODEL: 'classifier-model', CHAT_MODEL: 'gpt-6-luna', CHAT_REASONING_EFFORT: 'max', CHAT_FAST: 'true' };
  const options = chatCodexOptions(env);
  assert.equal(options.model, 'gpt-6-luna');
  assert.equal(options.reasoningEffort, 'max');
  assert.equal(options.fast, true);
  assert.equal(env.CODEX_MODEL, 'classifier-model');
  assert.equal(chatCodexOptions({ CODEX_MODEL: 'existing-model' }).model, 'existing-model');
  assert.equal(chatCodexOptions({}).reasoningEffort, 'low');
  assert.equal(chatCodexOptions({}).fast, false);
  assert.throws(() => chatCodexOptions({ CHAT_REASONING_EFFORT: 'ultra' }), /CHAT_REASONING_EFFORT/);
  assert.throws(() => chatCodexOptions({ CHAT_FAST: 'yes' }), /CHAT_FAST/);
});

test('the API asks for the token when there is one', async () => {
  const { base, close } = await start({ token: 'x'.repeat(32), dev: false });
  try {
    const denied = await fetch(`${base}/v1/classify`, { method: 'POST', body: JSON.stringify({ message }) });
    assert.equal(denied.status, 401);
    const ok = await fetch(`${base}/v1/classify`, { method: 'POST', headers: { authorization: `Bearer ${'x'.repeat(32)}` }, body: JSON.stringify({ message }) });
    assert.equal(ok.status, 200);
    const d = await ok.json();
    assert.equal(d.decision, 'DESPERTAR');
    assert.equal(d.shadow, true);
  } finally { await close(); }
});

test('mobile pilot supports CORS, Basic auth, the expected session and idempotent retries', async () => {
  const { base, close } = await start({ dev: true, chatPassword: 'test-only-password' });
  const headers = { authorization: `Basic ${Buffer.from('solsets:test-only-password').toString('base64')}`, 'content-type': 'application/json' };
  try {
    const preflight = await fetch(`${base}/api/disconnect/messages`, { method: 'OPTIONS', headers: { origin: 'http://localhost:8081', 'access-control-request-method': 'POST' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
    assert.equal((await fetch(`${base}/api/disconnect`)).status, 401);
    const loaded = await (await fetch(`${base}/api/disconnect`, { headers })).json();
    assert.equal(loaded.sessions[0].id, 'demo:web');
    const body = JSON.stringify({ text: 'Mañana revisar el turno', requestId: randomUUID() });
    const first = await (await fetch(`${base}/api/disconnect/messages`, { method: 'POST', headers, body })).json();
    const second = await (await fetch(`${base}/api/disconnect/messages`, { method: 'POST', headers, body })).json();
    assert.deepEqual(first, second);
    assert.equal(second.session.messages.length, 2);
    const restored = await (await fetch(`${base}/api/disconnect`, { headers })).json();
    assert.deepEqual(restored.sessions[0], second.session);
    const invalid = await fetch(`${base}/api/disconnect/messages`, { method: 'POST', headers, body: JSON.stringify({ text: 'x', requestId: 'bad' }) });
    assert.equal(invalid.status, 400);
  } finally { await close(); }
});

test('bad input is a 400 with a reason, unknown feedback a 404', async () => {
  const { base, close } = await start({ dev: false });
  try {
    const bad = await fetch(`${base}/v1/classify`, { method: 'POST', body: '{nope' });
    assert.equal(bad.status, 400);
    const missing = await fetch(`${base}/v1/feedback`, { method: 'POST', body: JSON.stringify({ user_id: 'rodrigo', message_id: 'nada', verdict: 'ok' }) });
    assert.equal(missing.status, 404);
  } finally { await close(); }
});

test('the console and dev routes exist only in dev mode', async () => {
  const prod = await start({ token: 'x'.repeat(32), dev: false });
  try {
    assert.equal((await fetch(`${prod.base}/`)).status, 404);
    assert.equal((await fetch(`${prod.base}/tools`)).status, 404);
    assert.equal((await fetch(`${prod.base}/dev/cases`)).status, 404);
  } finally { await prod.close(); }
  const dev = await start({ dev: true });
  try {
    const page = await fetch(`${dev.base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Soltra · Conversación/);
    const tools = await fetch(`${dev.base}/tools`);
    assert.equal(tools.status, 200);
    assert.match(await tools.text(), /Consola del agente/);
    const r = await fetch(`${dev.base}/dev/classify`, { method: 'POST', body: JSON.stringify({ engine: 'rules', message }) });
    const body = await r.json();
    assert.equal(body.decision.decision, 'DESPERTAR');
    assert.equal(typeof body.ms, 'number');
  } finally { await dev.close(); }
});

test('the morning report lists the decisions of a user with their message', async () => {
  const { base, close } = await start({ dev: false });
  try {
    await fetch(`${base}/v1/classify`, { method: 'POST', body: JSON.stringify({ message: { ...message, id: 'p1', text: 'mañana revisa la impresora' } }) });
    const list = await (await fetch(`${base}/v1/users/rodrigo/decisions`)).json();
    assert.equal(list.length, 1);
    assert.equal(list[0].decision.decision, 'PARTE');
    assert.equal(list[0].message.text, 'mañana revisa la impresora');
  } finally { await close(); }
});
