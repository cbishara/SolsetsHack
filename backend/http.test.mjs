import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { createHmac, randomUUID } from 'node:crypto';

test('HTTP demo persists decisions and verifies Kapso v2 signature, identity and deduplication', { timeout: 15000 }, async () => {
 const dir = await mkdtemp(join(tmpdir(), 'solsets-test-'));
 const reservation = createServer(); await new Promise(r => reservation.listen(0, '127.0.0.1', r)); const port = reservation.address().port; await new Promise(r => reservation.close(r));
 const child = spawn(process.execPath, ['backend/server.mjs'], { env: { PATH: process.env.PATH, PORT: String(port), DATA_DIR: dir, DOTENV_CONFIG_PATH: join(dir, 'absent.env'), KAPSO_WEBHOOK_SECRET: 'fixture-secret', KAPSO_PHONE_NUMBER_ID: 'fixture-number', RODRIGO_WHATSAPP_NUMBER: '56900000000' }, stdio: 'ignore' });
 const base = `http://127.0.0.1:${port}`;
 const request = (path, body, method = 'POST', headers = {}) => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
 try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const state = await (await fetch(base + '/api/state')).json();
  const routine = await (await request('/api/demo/run', { scenario: 'vpn' })).json(); assert.equal(routine.status, 'shadow'); assert.equal(routine.wake, false);
  const critical = await (await request('/api/demo/run', { scenario: 'critical' })).json(); assert.equal(critical.wake, true); assert.equal(critical.effects.some(e => e.channel === 'calendar'), false);
  const repeat = await (await request('/api/demo/run', { scenario: 'critical' })).json(); assert.equal(repeat.wake, false); assert.equal(repeat.duplicate, true);
  await request('/api/settings', { ...state.settings, paused: true }, 'PATCH');
  const payload = { phone_number_id: 'fixture-number', message: { id: 'wamid.fixture', timestamp: String(Math.floor(Date.now() / 1000)), from: '56900000000', type: 'text', text: { body: 'Necesito preparar el cierre de turno (ficticio).' }, kapso: { direction: 'inbound' } }, conversation: { phone_number: '56900000000' } };
  const headers = { 'x-webhook-event': 'whatsapp.message.received', 'x-webhook-signature': createHmac('sha256', 'fixture-secret').update(JSON.stringify(payload)).digest('hex') };
  assert.equal((await request('/api/webhooks/kapso', payload, 'POST', { ...headers, 'x-webhook-signature': 'bad' })).status, 401);
  assert.equal((await request('/api/webhooks/kapso', payload, 'POST', headers)).status, 200);
  assert.equal((await request('/api/webhooks/kapso', payload, 'POST', headers)).status, 200);
  let stored = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
  assert.equal(stored.inbox.length, 1, 'paused inbox is durable and deduplicated');
  await request('/api/settings', { ...state.settings, paused: false, shadow: true }, 'PATCH');
  for (let i = 0; i < 40; i++) { const s = await (await fetch(base + '/api/disconnect')).json(); if (s.sessions.length) break; await new Promise(r => setTimeout(r, 100)); }
  stored = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
  const incoming = Object.values(stored.disconnectSessions); assert.equal(incoming.length, 1);
  assert.equal(incoming[0].messages.at(-1).delivery, 'shadow');
  assert.match(incoming[0].concern, /cierre de turno/);
  assert.equal((await request('/api/webhooks/kapso', payload, 'POST', headers)).status, 200);
  assert.equal((await (await fetch(base + '/api/state')).json()).inbox.length, 0);
  const webMessage = { text: 'Quiero preparar la clase de mañana.', requestId: randomUUID() };
  const first = await (await request('/api/disconnect/messages', webMessage)).json();
  assert.equal(first.session.id, 'demo:web');
  assert.equal(first.session.messages.at(-1).delivery, 'simulated');
  assert.equal((await (await request('/api/disconnect/messages', webMessage)).json()).duplicate, true);
  assert.equal((await request('/api/disconnect/messages', { ...webMessage, recipient: '56900000000' })).status, 400);
  assert.equal((await (await fetch(base + '/api/disconnect')).json()).sessions.length, 2);
 } finally { const exited = new Promise(r => child.once('exit', r)); child.kill(); await exited; await rm(dir, { recursive: true, force: true }); }
});

test('production landing assets are public while workspace, API and OAuth remain authenticated', { timeout: 15000 }, async () => {
 const dir = await mkdtemp(join(tmpdir(), 'solsets-public-test-'));
 await mkdir(join(dir, 'dist/assets'), { recursive: true });
 await writeFile(join(dir, 'dist/index.html'), '<!doctype html><title>SOL landing fixture</title>');
 await writeFile(join(dir, 'dist/assets/landing.js'), '/* public compiled asset */');
 await writeFile(join(dir, 'dist/favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
 await writeFile(join(dir, 'private-fixture.txt'), 'must-not-be-public');
 const reservation = createServer(); await new Promise(r => reservation.listen(0, '127.0.0.1', r)); const port = reservation.address().port; await new Promise(r => reservation.close(r));
 const child = spawn(process.execPath, [resolve('backend/server.mjs')], { cwd: dir, env: { PATH: process.env.PATH, PORT: String(port), DATA_DIR: join(dir, 'data'), DOTENV_CONFIG_PATH: join(dir, 'absent.env'), DASHBOARD_PASSWORD: 'fixture-password' }, stdio: 'ignore' });
 const base = `http://127.0.0.1:${port}`;
 try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/api/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const landing = await fetch(base + '/'); assert.equal(landing.status, 200); assert.match(await landing.text(), /SOL landing fixture/);
  const demo = await fetch(base + '/demo?caso=profesor'); assert.equal(demo.status, 200); assert.match(await demo.text(), /SOL landing fixture/);
  const asset = await fetch(base + '/assets/landing.js'); assert.equal(asset.status, 200); assert.match(await asset.text(), /public compiled asset/);
  assert.equal((await fetch(base + '/favicon.svg')).status, 200);
  for (const path of ['/app', '/app/tasks', '/desconectar', '/api/disconnect', '/api/state', '/auth/google', '/.env', '/SETUP.md', '/private-fixture.txt']) {
   const response = await fetch(base + path, { redirect: 'manual' });
   assert.equal(response.status, 401, path); assert.match(response.headers.get('www-authenticate'), /Basic/);
  }
  const update = await fetch(base + '/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(update.status, 401);
  const traversal = await fetch(base + '/assets/..%2f..%2fprivate-fixture.txt'); assert.notEqual(traversal.status, 200); assert.doesNotMatch(await traversal.text(), /must-not-be-public/);
  const headers = { Authorization: 'Basic ' + Buffer.from('solsets:fixture-password').toString('base64') };
  assert.equal((await fetch(base + '/app', { headers })).status, 200);
  const state = await fetch(base + '/api/state', { headers }); assert.equal(state.status, 200); assert.ok(Array.isArray((await state.json()).tasks));
 } finally { const exited = new Promise(r => child.once('exit', r)); child.kill(); await exited; await rm(dir, { recursive: true, force: true }); }
});
