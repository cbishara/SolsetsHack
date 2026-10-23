import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnipileMultiUserProvider, UnsupportedPairingCheckpoint } from '../src/multiuser/provider.ts';
import { loadMultiUserConfig } from '../src/multiuser/config.ts';

const json = (body: unknown) => new Response(JSON.stringify(body));
const account = { id: 'personal', type: 'WHATSAPP', sources: [{ status: 'OK' }], connection_params: { im: { phone_number: '+56900000001' } } };
const message = { id: 'message', account_id: 'personal', chat_id: 'group', sender_id: 'someone', text: 'Mensaje inventado', timestamp: '2026-10-23T20:00:00Z', is_sender: false };

test('pairing adapter uses documented request, accepts only a short documented checkpoint and rejects guessed variants', async () => {
  let result: unknown = { object: 'Checkpoint', account_id: 'personal', checkpoint: { type: 'QRCODE', qrcode: 'A1B2-C3D4' } };
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async (input, init) => {
    assert.ok(String(input).endsWith('/api/v1/accounts'));
    assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), { provider: 'WHATSAPP', pairing_phone_number: '56900000001' });
    return json(result);
  }) as typeof fetch);
  assert.deepEqual(await provider.pairing('56900000001'), { accountId: 'personal', pairingCode: 'A1B2-C3D4' });
  for (const bad of [
    { object: 'Checkpoint', account_id: 'personal', checkpoint: { type: 'PAIRING_CODE', code: 'A1B2C3D4' } },
    { object: 'Checkpoint', account_id: 'personal', checkpoint: { type: 'QRCODE', qrcode: '1@long-qr-payload,public-key,secret-key' } },
    { object: 'Checkpoint', account_id: 'bot', checkpoint: { type: 'QRCODE', qrcode: 'A1B2C3D4' } },
    { object: 'AccountCreated', account_id: 'personal' },
  ]) { result = bad; await assert.rejects(provider.pairing('56900000001'), error => error instanceof UnsupportedPairingCheckpoint); }
});

test('pairing status uses only the stored account ID and requires connected canonical owner details', async () => {
  let result: unknown = null;
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async input => {
    assert.ok(String(input).endsWith('/accounts/personal'));
    return result === null ? new Response('', { status: 404 }) : json(result);
  }) as typeof fetch);
  assert.equal(await provider.pairingOwner('personal'), null);
  result = { id: 'personal', type: 'WHATSAPP', sources: [{ status: 'CONNECTING' }] };
  assert.equal(await provider.pairingOwner('personal'), null);
  result = account;
  assert.deepEqual(await provider.pairingOwner('personal'), { accountId: 'personal', ownerId: 'whatsapp:56900000001', recipientId: '56900000001@s.whatsapp.net' });
  result = { ...account, id: 'different' };
  await assert.rejects(provider.pairingOwner('personal'));
  await assert.rejects(provider.pairingOwner('bot'));
});

test('owner identity comes only from canonical connected WhatsApp account; bot cannot be personal', async () => {
  let result: unknown = account;
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async () => json(result)) as typeof fetch);
  assert.deepEqual(await provider.owner('personal'), { accountId: 'personal', ownerId: 'whatsapp:56900000001', recipientId: '56900000001@s.whatsapp.net' });
  await assert.rejects(provider.owner('bot'));
  for (const bad of [{ ...account, id: 'other' }, { ...account, sources: [{ status: 'CREDENTIALS' }] }, { ...account, type: 'TELEGRAM' }, { ...account, connection_params: { im: { phone_number: 'fake@lid' } } }]) {
    result = bad; await assert.rejects(provider.owner('personal'));
  }
});

test('catalog strips previews and sensitive extras; foreign account fails closed', async () => {
  let foreign = false;
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async input => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/api/v1/chats');
    assert.equal(url.searchParams.get('account_id'), 'personal');
    assert.equal(url.searchParams.get('cursor'), 'next+&');
    return json({ items: [{ id: 'chat', account_id: foreign ? 'other' : 'personal', name: 'Trabajo', type: 1, preview: 'No debe ir al agente', last_message: message }], cursor: 'last' });
  }) as typeof fetch);
  assert.deepEqual(await provider.catalog('personal', 'next+&'), { items: [{ id: 'chat', accountId: 'personal', name: 'Trabajo', type: 1 }], cursor: 'last' });
  foreign = true; await assert.rejects(provider.catalog('personal', 'next+&'));
});

test('history filters hidden/deleted/events and validates account/chat/message identities', async () => {
  let result: unknown = { items: [message, { ...message, id: 'hidden', hidden: 1 }, { ...message, id: 'deleted', deleted: 1 }, { ...message, id: 'event', is_event: true }], cursor: null };
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async () => json(result)) as typeof fetch);
  assert.equal((await provider.messages('personal', 'group')).items.length, 1);
  result = { ...message, account_id: 'other' }; await assert.rejects(provider.message('personal', 'message'));
  result = { ...message, id: 'other' }; await assert.rejects(provider.message('personal', 'message'));
  result = { items: [{ ...message, chat_id: 'other' }] }; await assert.rejects(provider.messages('personal', 'group'));
});

test('OTP sends from bot account to canonical recipient, validates returned private chat and never retries', async () => {
  let sends = 0, badChat = false;
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async (input, init) => {
    assert.equal(init?.redirect, 'error'); assert.ok(init?.signal);
    if (init?.method === 'POST') {
      sends++;
      const body = init.body as FormData;
      assert.equal(body.get('account_id'), 'bot'); assert.equal(body.get('attendees_ids'), '56900000001@s.whatsapp.net');
      assert.match(String(body.get('text')), /123456/);
      return json({ chat_id: 'bot-chat', message_id: 'otp-message' });
    }
    assert.ok(String(input).endsWith('/chats/bot-chat'));
    return json({ id: 'bot-chat', account_id: 'bot', type: badChat ? 1 : 0 });
  }) as typeof fetch);
  assert.deepEqual(await provider.sendCode('56900000001@s.whatsapp.net', '123456'), { chatId: 'bot-chat', messageId: 'otp-message' });
  assert.equal(sends, 1);
  badChat = true; await assert.rejects(provider.sendCode('56900000001@s.whatsapp.net', '123456')); assert.equal(sends, 2);
});

test('hosted auth callback correlation and reconnect account are generated server-side', async () => {
  const bodies: any[] = [];
  let redirect = 'https://account.unipile.com/synthetic';
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body))); return json({ url: redirect });
  }) as typeof fetch);
  await provider.link('connection', 'https://sol.example/callback', '2026-10-24T00:00:00Z');
  assert.equal(bodies[0].name, 'connection'); assert.deepEqual(bodies[0].providers, ['WHATSAPP']);
  await provider.link('reconnection', 'https://sol.example/callback', '2026-10-24T00:00:00Z', 'existing-account');
  assert.equal(bodies[1].type, 'reconnect'); assert.equal(bodies[1].reconnect_account, 'existing-account');
  assert.equal(bodies[1].providers, undefined);
  redirect = 'https://unipile.com.attacker.test/'; await assert.rejects(provider.link('c', 'https://sol.example/callback', '2026-10-24T00:00:00Z'));
});

test('an existing hook must match account, event, active status and current secret', async () => {
  let hook: Record<string, unknown> = { name: 'sol-v1-personal', request_url: 'https://sol.example/api/v1/webhooks/unipile', enabled: true, source: 'messaging', account_ids: ['personal'], events: ['message_received'], headers: [{ key: 'X-Sol-Webhook-Secret', value: 'hook-secret' }] };
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'secret', 'bot', (async (_input, init) => {
    assert.equal(init?.method, 'GET'); return json({ items: [hook], cursor: null });
  }) as typeof fetch);
  await provider.subscribe('personal', 'https://sol.example', 'hook-secret');
  for (const patch of [{ enabled: false }, { account_ids: ['other'] }, { events: [] }, { headers: [] }]) {
    const original = hook; hook = { ...hook, ...patch }; await assert.rejects(provider.subscribe('personal', 'https://sol.example', 'hook-secret')); hook = original;
  }
});

test('multiuser is opt-in and requires persistent storage plus distinct secrets', () => {
  assert.equal(loadMultiUserConfig({}), undefined);
  const env = { SOL_MULTIUSER_ENABLED: 'true', DATABASE_URL: 'postgres://localhost/test', UNIPILE_DSN: 'https://api-test.unipile.com', UNIPILE_API_KEY: 'provider-key', UNIPILE_BOT_ACCOUNT_ID: 'bot', PUBLIC_URL: 'https://sol.example', SOL_IDENTITY_SECRET: 'i'.repeat(40), SOL_MULTIUSER_WEBHOOK_SECRET: 'w'.repeat(40) };
  assert.equal(loadMultiUserConfig(env)?.botAccountId, 'bot');
  assert.throws(() => loadMultiUserConfig({ ...env, DATABASE_URL: '' }));
  assert.throws(() => loadMultiUserConfig({ ...env, API_TOKEN: env.SOL_IDENTITY_SECRET }));
  assert.throws(() => loadMultiUserConfig({ ...env, PUBLIC_URL: 'http://sol.example' }));
});
