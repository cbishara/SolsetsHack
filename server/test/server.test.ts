import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { stubAgent, type Agent } from '../src/agent.ts';
import { createApp } from '../src/app.ts';
import { Guard } from '../src/guard.ts';
import { parseTwoChat } from '../src/sources/twochat.ts';
import { MemoryStore } from '../src/store/store.ts';

const config = { apiToken: 'app-token', twoChat: { webhookToken: 'hook-secret' }, allowSimulate: true };

async function start(agent: Agent = stubAgent) {
  const guard = new Guard(new MemoryStore(), agent);
  const server = createApp(guard, config).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (path: string, init: RequestInit = {}, token: string | null = 'app-token') =>
    fetch(base + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  return { guard, call, close: () => server.close() };
}

test('2chat: parses a person-to-person message with the documented shape', () => {
  const e = parseTwoChat({
    uuid: 'MSG1', created_at: '2026-10-24T04:50:00Z', sent_by: 'user', remote_phone_number: '+56911111111',
    message: { text: 'el portal no carga' }, contact: { first_name: 'Javier' },
  });
  assert.equal(e.kind, 'message');
  if (e.kind !== 'message') return;
  assert.equal(e.message.text, 'el portal no carga');
  assert.equal(e.message.sender, 'Javier');
  assert.equal(e.message.group, undefined);
});

test('2chat: marks group messages and ignores our own', () => {
  const g = parseTwoChat({ id: 'G1', message: { text: 'hola' }, group: { wa_group_name: 'Guardia TI' } }, 'whatsapp.group.message.received');
  assert.equal(g.kind === 'message' && g.message.group, 'Guardia TI');
  assert.equal(parseTwoChat({ sent_by: 'api', message: { text: 'x' } }).kind, 'ignored');
});

test('2chat: a disconnected status marks the source as disconnected', () => {
  const e = parseTwoChat({ type: 'disconnected', reason: 'logout' }, 'whatsapp.number.status');
  assert.deepEqual(e, { kind: 'status', status: 'disconnected', detail: 'disconnected: logout' });
});

test('webhook rejects a wrong token and keeps the raw event otherwise', async () => {
  const s = await start();
  try {
    const bad = await s.call('/api/webhooks/2chat/nope', { method: 'POST', body: '{}' }, null);
    assert.equal(bad.status, 401);
    const ok = await s.call('/api/webhooks/2chat/hook-secret?event=whatsapp.message.received', {
      method: 'POST', body: JSON.stringify({ uuid: 'W1', sent_by: 'user', message: { text: 'Respaldo nocturno falló' } }),
    }, null);
    assert.equal(ok.status, 200);
    await new Promise((r) => setTimeout(r, 50));
    const feed = await (await s.call('/api/feed')).json();
    assert.equal(feed.length, 1);
    assert.equal(feed[0].message.source, 'whatsapp');
    const sources = await (await s.call('/api/sources')).json();
    assert.equal(sources[0].status, 'connected');
  } finally {
    s.close();
  }
});

test('the same provider message is processed only once', async () => {
  const guard = new Guard(new MemoryStore(), stubAgent);
  const m = { externalId: 'X1', source: 'whatsapp' as const, sender: 'a', text: 'hola', receivedAt: new Date().toISOString() };
  assert.equal((await guard.ingest(m)).status, 'processed');
  assert.equal((await guard.ingest(m)).status, 'duplicate');
});

test('if the agent fails, the message still wakes Rodrigo', async () => {
  const broken: Agent = { classify: async () => { throw new Error('down'); }, decide: stubAgent.decide };
  const guard = new Guard(new MemoryStore(), broken);
  const r = await guard.ingest({ externalId: 'E1', source: 'email', sender: 'x', text: 'algo', receivedAt: new Date().toISOString() });
  assert.equal(r.status === 'processed' && r.item.wouldWake, true);
});

test('shadow mode never sends alerts; active mode does', async () => {
  const guard = new Guard(new MemoryStore(), stubAgent);
  const msg = (id: string) => ({ externalId: id, source: 'whatsapp' as const, sender: 's', text: 'producción caída', receivedAt: new Date().toISOString() });
  const shadow = await guard.ingest(msg('A'));
  assert.equal(shadow.status === 'processed' && shadow.alert, undefined);
  await guard.setSettings({ mode: 'active' });
  const active = await guard.ingest(msg('B'));
  assert.ok(active.status === 'processed' && active.alert);
});

test('app API needs the token and runs the synthetic night end to end', async () => {
  const s = await start();
  try {
    assert.equal((await s.call('/api/feed', {}, null)).status, 401);
    const sim = await (await s.call('/api/simulate/night', { method: 'POST' })).json();
    assert.equal(sim.count, 9);
    const feed = await (await s.call('/api/feed')).json();
    const id = feed[0].messageId;
    assert.equal((await s.call(`/api/messages/${encodeURIComponent(id)}/feedback`, { method: 'POST', body: JSON.stringify({ value: 'right' }) })).status, 200);
    assert.equal((await s.call('/api/messages/nope/feedback', { method: 'POST', body: JSON.stringify({ value: 'right' }) })).status, 404);
    assert.equal((await s.call('/api/settings', { method: 'PUT', body: JSON.stringify({ mode: 'bad' }) })).status, 400);
    const night = await (await s.call('/api/night/today', { method: 'PUT', body: JSON.stringify({ onCall: true }) })).json();
    assert.equal(night.onCall, true);
    const metrics = await (await s.call('/api/metrics')).json();
    assert.equal(metrics.rated, 1);
  } finally {
    s.close();
  }
});
