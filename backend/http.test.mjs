import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { createHmac } from 'node:crypto';

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
  const payload = { phone_number_id: 'fixture-number', message: { id: 'wamid.fixture', from: '56900000000', type: 'text', text: { body: 'P1 servicio caído (ficticio)' }, kapso: { direction: 'inbound' } }, conversation: { phone_number: '56900000000' } };
  const headers = { 'x-webhook-event': 'whatsapp.message.received', 'x-webhook-signature': createHmac('sha256', 'fixture-secret').update(JSON.stringify(payload)).digest('hex') };
  assert.equal((await request('/api/webhooks/kapso', payload, 'POST', { ...headers, 'x-webhook-signature': 'bad' })).status, 401);
  assert.equal((await request('/api/webhooks/kapso', payload, 'POST', headers)).status, 200);
  assert.equal((await request('/api/webhooks/kapso', payload, 'POST', headers)).status, 200);
  for (let i = 0; i < 40; i++) { const s = await (await fetch(base + '/api/state')).json(); if (s.tasks.some(t => t.externalId === 'wamid.fixture')) break; await new Promise(r => setTimeout(r, 100)); }
  const stored = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
  const incoming = stored.tasks.filter(t => t.externalId === 'wamid.fixture'); assert.equal(incoming.length, 1); assert.equal(incoming[0].wake, false); assert.deepEqual(incoming[0].effects, []);
 } finally { const exited = new Promise(r => child.once('exit', r)); child.kill(); await exited; await rm(dir, { recursive: true, force: true }); }
});
