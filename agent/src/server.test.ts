import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createAgent } from './agent.ts';
import { chatCodexOptions, createAgentServer } from './server.ts';
import { rulesEngine } from './engines/rules.ts';
import { MemoryStore } from './store.ts';
import { createChat } from './chat.ts';
import { randomUUID } from 'node:crypto';
import { createElevenLabsVoice, SOL_VOICE_ID } from './voice/elevenlabs.ts';

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

async function startWithVoice(voice?: ReturnType<typeof createElevenLabsVoice>) {
  const store = new MemoryStore();
  const server = createAgentServer({ store, agent: createAgent({ store, engine: rulesEngine }), token: 't'.repeat(32), dev: false, voice });
  await new Promise<void>(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => new Promise(resolve => server.close(resolve)) };
}

test('voice routes transcribe raw audio and speak a given reply behind the agent token', async () => {
  const sent: Array<{ url: string; body: unknown }> = [];
  const voice = createElevenLabsVoice({ apiKey: 'test-key', voiceId: SOL_VOICE_ID, fetcher: async (url, init) => {
    sent.push({ url: String(url), body: init?.body });
    if (String(url).endsWith('/v1/speech-to-text')) return Response.json({ text: 'Mañana llamo al taller.' });
    return new Response(new Uint8Array([73, 68, 51, 4]), { headers: { 'content-type': 'audio/mpeg' } });
  } });
  const { base, close } = await startWithVoice(voice);
  const auth = { authorization: `Bearer ${'t'.repeat(32)}` };
  try {
    assert.equal((await fetch(`${base}/v1/voice/speak`, { method: 'POST', body: '{"text":"Hola"}' })).status, 401);
    const heard = await fetch(`${base}/v1/voice/transcribe`, { method: 'POST', headers: { ...auth, 'content-type': 'audio/m4a' }, body: new Uint8Array([1, 2, 3]) });
    assert.equal(heard.status, 200);
    assert.deepEqual(await heard.json(), { text: 'Mañana llamo al taller.' });
    const form = sent[0].body as FormData;
    assert.equal((form.get('file') as File).size, 3);
    const spoken = await fetch(`${base}/v1/voice/speak`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Lo dejo para mañana.' }) });
    assert.equal(spoken.status, 200);
    assert.equal(spoken.headers.get('content-type'), 'audio/mpeg');
    assert.deepEqual(new Uint8Array(await spoken.arrayBuffer()), new Uint8Array([73, 68, 51, 4]));
    assert.equal(new URL(sent[1].url).pathname, `/v1/text-to-speech/${SOL_VOICE_ID}`);
    assert.deepEqual(JSON.parse(sent[1].body as string).text, 'Lo dejo para mañana.');
  } finally { await close(); }
});

test('voice routes fail with controlled statuses and never call the provider for bad input', async () => {
  let calls = 0;
  const voice = createElevenLabsVoice({ apiKey: 'test-key', voiceId: SOL_VOICE_ID, fetcher: async () => { calls++; return new Response('secret detail', { status: 429 }); } });
  const auth = { authorization: `Bearer ${'t'.repeat(32)}` };
  const unconfigured = await startWithVoice();
  try {
    const off = await fetch(`${unconfigured.base}/v1/voice/speak`, { method: 'POST', headers: auth, body: '{"text":"Hola"}' });
    assert.equal(off.status, 503);
    assert.equal((await off.json()).error, 'not-configured');
  } finally { await unconfigured.close(); }
  const { base, close } = await startWithVoice(voice);
  try {
    assert.equal((await fetch(`${base}/v1/voice/transcribe`, { method: 'POST', headers: { ...auth, 'content-type': 'text/plain' }, body: 'hola' })).status, 400);
    assert.equal((await fetch(`${base}/v1/voice/transcribe`, { method: 'POST', headers: { ...auth, 'content-type': 'audio/m4a' }, body: new Uint8Array(5 * 1024 * 1024 + 1) })).status, 400);
    assert.equal((await fetch(`${base}/v1/voice/speak`, { method: 'POST', headers: auth, body: '{}' })).status, 400);
    assert.equal((await fetch(`${base}/v1/voice/other`, { method: 'POST', headers: auth, body: '{}' })).status, 404);
    assert.equal(calls, 0);
    const quota = await fetch(`${base}/v1/voice/speak`, { method: 'POST', headers: auth, body: '{"text":"Hola"}' });
    assert.equal(quota.status, 503);
    const body = await quota.text();
    assert.equal(body.includes('secret detail') || body.includes('test-key'), false);
  } finally { await close(); }
});
