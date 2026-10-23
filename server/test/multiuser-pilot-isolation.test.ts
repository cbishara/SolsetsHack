import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { Router } from 'express';
import { createApp } from '../src/app.ts';
import { Guard } from '../src/guard.ts';
import { stubAgent } from '../src/agent.ts';
import { MemoryStore } from '../src/store/store.ts';

test('multiuser candidate exposes v1 and health, never global pilot data or writes', async () => {
  const store = new MemoryStore();
  const guard = new Guard(store, stubAgent);
  await guard.addWorry('Synthetic private pilot concern');
  const router = Router().get('/ready', (_req, res) => res.json({ ready: true }));
  const server = createApp(guard, { apiToken: 'pilot-token', twoChat: { webhookToken: 'hook-token' }, allowSimulate: true }, undefined, router).listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/v1/ready`)).status, 200);
    for (const path of ['/api/feed', '/api/report', '/api/settings']) {
      const response = await fetch(base + path, { headers: { Authorization: 'Bearer pilot-token' } });
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'legacy_api_disabled' });
    }
    for (const path of ['/api/messages', '/api/webhooks/2chat/hook-token', '/api/simulate/night']) {
      const response = await fetch(base + path, { method: 'POST', headers: { Authorization: 'Bearer pilot-token', 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 503);
    }
    assert.equal((await guard.feed()).length, 0);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
