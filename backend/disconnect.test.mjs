import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceConversation } from './disconnect-flow.mjs';
import { createDisconnectProcessor, conversationId } from './disconnect.mjs';
import { sendWhatsApp } from './integrations.mjs';

const timestamp = '2026-10-23T18:00:00.000Z';
const message = (text, externalId, extra = {}) => ({ text, externalId, recipient: '56900000001', synthetic: false, receivedAt: timestamp, ...extra });
function harness(overrides = {}, transport) {
  let state = { settings: { paused: false, shadow: false, permissions: { reply: 'auto' }, ...overrides } };
  const calls = [];
  const dependencies = {
    getState: () => structuredClone(state),
    mutate: async fn => { const next = structuredClone(state); fn(next); state = next; },
    now: () => timestamp,
    sendWhatsApp: transport || (async (to, body) => { calls.push({ to, body }); return { messages: [{ id: 'wamid.out.' + calls.length }] }; }),
  };
  return { dependencies, calls, process: createDisconnectProcessor(dependencies), state: () => state };
}

test('an explicit correction changes the next concern, and deletion removes derived context', () => {
  let session;
  const say = text => { const result = advanceConversation(session, text, timestamp); session = result.session; return result; };
  say('Terminé mi turno y falta el informe.');
  assert.equal(session.blocker, null);
  say('3');
  assert.equal(session.plan.minutes, 5);
  assert.match(session.plan.prepared, /no bloquea apps/);
  say('MÁS PEQUEÑO');
  assert.equal(session.preference.minutes, 2);
  say('ME AYUDÓ');
  assert.equal(session.feedback.length, 1);
  assert.equal(session.plan.status, 'prepared');
  say('NUEVO');
  say('Tengo pendiente preparar la clase de mañana.');
  say('1');
  assert.equal(session.plan.minutes, 2);
  assert.doesNotMatch(session.plan.prepared, /informe/);
  say('CAMBIAR');
  assert.equal(session.plan, null);
  say('toString');
  assert.equal(session.blocker, 'clarity');
  assert.equal(session.plan, null);
  say('2');
  assert.equal(session.blocker, 'overload');
  assert.equal(say('BORRAR').erased, true);
  assert.equal(session.concern, '');
  assert.equal(session.preference, null);
  assert.equal(session.plan, null);
  assert.doesNotMatch(say('RESUMEN').reply, /clase de mañana/);
});

test('duplicate webhooks and restart do not repeat a response; phone contexts are isolated', async () => {
  const h = harness();
  await Promise.all([h.process(message('Necesito preparar el informe.', 'one')), h.process(message('Necesito preparar el informe.', 'one'))]);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].to, '56900000001');
  const restarted = createDisconnectProcessor(h.dependencies);
  assert.equal((await restarted(message('Necesito preparar el informe.', 'one'))).duplicate, true);
  await restarted(message('Tengo pendiente una compra.', 'two', { recipient: '56900000002' }));
  assert.equal(Object.keys(h.state().disconnectSessions).length, 2);
  assert.equal(h.calls.length, 2);
  await restarted(message('BORRAR', 'three'));
  const session = h.state().disconnectSessions[conversationId(message('', ''))];
  assert.equal(session.messages.length, 1);
  assert.equal(session.concern, '');
  await restarted(message('Necesito preparar el informe.', 'one'));
  assert.equal(h.calls.length, 3, 'erasing text retains replay protection');
});

test('web simulation, permissions, pause and old or missing timestamps prevent sending', async () => {
  for (const [overrides, input, expected] of [
    [{}, { synthetic: true }, 'simulated'],
    [{ paused: true }, {}, 'paused'],
    [{ shadow: true }, {}, 'shadow'],
    [{ permissions: { reply: 'never' } }, {}, 'not-authorized'],
    [{ permissions: { reply: 'ask' } }, {}, 'not-authorized'],
    [{}, { receivedAt: '2026-10-22T18:00:00.000Z' }, 'expired'],
    [{}, { receivedAt: null }, 'expired'],
  ]) {
    const h = harness(overrides);
    const result = await h.process(message('Hola SOL', 'policy', input));
    assert.equal(h.calls.length, 0);
    assert.equal(result.session.messages.at(-1).delivery, expected);
  }
});

test('uncertain sends stay visible and are not retried automatically', async () => {
  let calls = 0;
  const h = harness({}, async () => { calls++; throw new Error('timeout after provider might have accepted'); });
  const input = message('Hola SOL', 'ambiguous');
  const result = await h.process(input);
  assert.equal(result.session.messages.at(-1).delivery, 'unknown');
  const restarted = createDisconnectProcessor(h.dependencies);
  await restarted(input);
  assert.equal(calls, 1);
});

test('crash recovery marks a prepared response uncertain, and a pause during persistence prevents sending', async () => {
  const h = harness();
  const input = message('Hola SOL', 'crash');
  await h.process(input);
  h.state().disconnectSessions[conversationId(input)].messages.at(-1).delivery = 'pending';
  const result = await createDisconnectProcessor(h.dependencies)(input);
  assert.equal(result.session.messages.at(-1).delivery, 'unknown');
  assert.equal(h.calls.length, 1);
  const paused = harness();
  const save = paused.dependencies.mutate;
  let writes = 0;
  paused.dependencies.mutate = async fn => {
    await save(fn);
    if (++writes === 2) paused.state().settings.paused = true;
  };
  const stopped = await createDisconnectProcessor(paused.dependencies)(message('Hola SOL', 'pause-during-save'));
  assert.equal(stopped.session.messages.at(-1).delivery, 'not-authorized');
  assert.equal(paused.calls.length, 0);
});

test('the real Kapso SDK sends the generated response to the sender through mocked HTTP', async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.KAPSO_API_KEY, oldPhone = process.env.KAPSO_PHONE_NUMBER_ID;
  process.env.KAPSO_API_KEY = 'fixture-only';
  process.env.KAPSO_PHONE_NUMBER_ID = 'fixture-phone';
  const requests = [];
  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).startsWith('https://api.kapso.ai/meta/whatsapp/'));
    const body = JSON.parse(init.body);
    requests.push(body);
    return new Response(JSON.stringify({ messaging_product: 'whatsapp', contacts: [{ input: body.to, wa_id: body.to }], messages: [{ id: 'wamid.mocked.' + requests.length }] }), { headers: { 'content-type': 'application/json' } });
  };
  try {
    const h = harness({}, sendWhatsApp);
    for (const [index, text] of ['Necesito dejar el informe encaminado.', '1', 'MÁS PEQUEÑO', 'ME AYUDÓ'].entries()) {
      const result = await h.process(message(text, 'sdk-' + index));
      assert.equal(result.session.messages.at(-1).delivery, 'accepted');
    }
    assert.equal(requests.length, 4);
    assert.ok(requests.every(r => r.to === '56900000001' && r.type === 'text'));
    assert.match(requests[2].text.body, /2 minutos/);
    assert.match(requests[3].text.body, /no confirma/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.KAPSO_API_KEY; else process.env.KAPSO_API_KEY = oldKey;
    if (oldPhone === undefined) delete process.env.KAPSO_PHONE_NUMBER_ID; else process.env.KAPSO_PHONE_NUMBER_ID = oldPhone;
  }
});
