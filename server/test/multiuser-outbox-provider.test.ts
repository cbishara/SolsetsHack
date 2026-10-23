import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnipileMultiUserProvider } from '../src/multiuser/provider.ts';
import { loadMultiUserConfig } from '../src/multiuser/config.ts';

test('reply validates a canonical bot DM and rechecks permission after lookup before its sole send', async () => {
  let permitted = true, type = 0, account = 'bot', sends = 0, lookups = 0, revokeDuringLookup = false;
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'fixture-secret', 'bot', (async (_url, init) => {
    if (init?.method === 'GET') {
      lookups++;
      if (revokeDuringLookup) permitted = false;
      return Response.json({ id: 'dm', account_id: account, type });
    }
    sends++;
    assert.equal(permitted, true);
    assert.equal((init?.body as FormData).get('text'), 'Fixture reply');
    return Response.json({ message_id: 'sent-fixture' });
  }) as typeof fetch);
  const send = () => provider.sendReply({ botAccountId: 'bot', chatId: 'dm', text: 'Fixture reply', authorize: async () => permitted });
  assert.deepEqual(await send(), { messageId: 'sent-fixture' });
  revokeDuringLookup = true;
  await assert.rejects(send());
  assert.equal(sends, 1);
  permitted = true; revokeDuringLookup = false; type = 1;
  await assert.rejects(send());
  type = 0; account = 'other-user';
  await assert.rejects(send());
  assert.equal(sends, 1);
  const previous = lookups;
  await assert.rejects(provider.sendReply({ botAccountId: 'other-bot', chatId: 'dm', text: 'x', authorize: async () => true }));
  assert.equal(lookups, previous);
});

test('an ambiguous reply response is never retried by the provider', async () => {
  let sends = 0;
  const provider = new UnipileMultiUserProvider('https://api-test.unipile.com', 'fixture-secret', 'bot', (async (_url, init) => {
    if (init?.method === 'GET') return Response.json({ id: 'dm', account_id: 'bot', type: 0 });
    sends++; throw new Error('synthetic lost response after provider acceptance');
  }) as typeof fetch);
  await assert.rejects(provider.sendReply({ botAccountId: 'bot', chatId: 'dm', text: 'Fixture', authorize: async () => true }));
  assert.equal(sends, 1);
});

test('real v1 and phone pairing stay opt-in independently of the synthetic bridge', () => {
  const env = { SOL_MULTIUSER_ENABLED: 'true', DATABASE_URL: 'postgres://localhost/test', UNIPILE_DSN: 'https://api-test.unipile.com', UNIPILE_API_KEY: 'provider-key', UNIPILE_BOT_ACCOUNT_ID: 'bot', PUBLIC_URL: 'https://sol.example', SOL_IDENTITY_SECRET: 'i'.repeat(40), SOL_MULTIUSER_WEBHOOK_SECRET: 'w'.repeat(40) };
  assert.equal(loadMultiUserConfig(env)?.realDataEnabled, false);
  assert.equal(loadMultiUserConfig(env)?.pairingEnabled, false);
  assert.throws(() => loadMultiUserConfig({ ...env, SOL_AGENT_V1_ENABLED: 'true' }));
  const config = loadMultiUserConfig({ ...env, SOL_AGENT_V1_ENABLED: 'true', SOL_AGENT_WORKER_TOKEN: 't'.repeat(40) });
  assert.equal(config?.realDataEnabled, true);
  assert.equal(config?.demoEnabled, false);
  assert.equal(config?.pairingEnabled, false);
});
