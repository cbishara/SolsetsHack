import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createChat, parseChatAnswer } from './chat.ts';
import { FileStore, MemoryStore } from './store.ts';
import { createAgent } from './agent.ts';

const answer = (overrides: Record<string, unknown> = {}) => ({
  reply: 'Lo dejamos anotado para mañana.', concern: 'Revisar impresora',
  has_plan: true, plan_title: 'Primer paso', plan_next_step: 'Revisar la conexión.', plan_minutes: 2,
  memory_updates: [], forget_keys: [], ...overrides,
});
const turn = (text: string) => ({ text, requestId: randomUUID() });

test('chat memory survives restart and reaches classification only for its user', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sol-chat-'));
  try {
    const path = join(dir, 'state.json');
    const text = 'Las alertas de impresora pueden esperar hasta mañana';
    const chat = createChat({ store: new FileStore(path), userId: 'rodrigo', runner: async () => answer({
      memory_updates: [{ key: 'printer', value: text, evidence: text, kind: 'rule' }],
    }) });
    await chat.send('demo:web', turn(text));
    const store = new FileStore(path);
    const restored = createChat({ store, userId: 'rodrigo', runner: null }).view('demo:web');
    assert.equal(restored.messages.length, 2);
    assert.equal(restored.memory[0].evidence, text);
    assert.equal(restored.plan?.minutes, 2);
    const prompts: string[] = [];
    const agent = createAgent({ store, engine: { name: 'codex', classify: async prompt => {
      prompts.push(prompt);
      return { decision: 'PARTE', reason: 'Para mañana.', is_new: false, confidence: 0.9 };
    } } });
    for (const user_id of ['rodrigo', 'other']) await agent.classify({
      id: randomUUID(), user_id, source: 'simulated', text: 'Revisar impresora', received_at: new Date().toISOString(),
    });
    assert.ok(prompts[0].includes(text));
    assert.ok(!prompts[1].includes(text));
    assert.throws(() => createChat({ store, userId: 'other', runner: null }).view('demo:web'), /otro usuario/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('concurrent retries with the same UUID invoke the model once and keep one turn', async () => {
  let calls = 0;
  const chat = createChat({ store: new MemoryStore(), userId: 'r', runner: async () => { calls++; return answer(); } });
  const input = turn('Mañana revisar la impresora');
  const [a, b] = await Promise.all([chat.send('demo:web', input), chat.send('demo:web', input)]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
  assert.equal(a.messages.length, 2);
});

test('an unavailable model preserves context and allows retry with the original UUID', async () => {
  let fail = false;
  const chat = createChat({ store: new MemoryStore(), userId: 'r', runner: async () => {
    if (fail) throw new Error('Motor sin conexión');
    return answer();
  } });
  await chat.send('demo:web', turn('Revisar la impresora'));
  fail = true;
  const input = turn('Necesito un paso más pequeño');
  const failed = await chat.send('demo:web', input);
  assert.equal(failed.concern, 'Revisar impresora');
  assert.equal(failed.messages.at(-1)?.inference?.engine, 'unavailable');
  assert.equal(failed.messages.at(-1)?.inference?.error, 'Motor sin conexión');
  fail = false;
  const retried = await chat.send('demo:web', input);
  assert.equal(retried.messages.length, 4);
  assert.equal(retried.messages.at(-1)?.inference?.engine, 'codex');
});

test('corrections replace a memory key, new keeps memory, and borrar clears only chat learning', async () => {
  const store = new MemoryStore();
  store.addMemory({ id: 'onboard', user_id: 'r', source: 'onboarding', status: 'active', kind: 'rule', text: 'Facturación despierta', created_at: new Date().toISOString() });
  store.addMemory({ id: 'other', user_id: 'other', source: 'chat', status: 'active', kind: 'fact', text: 'Otro usuario', created_at: new Date().toISOString() });
  const chat = createChat({ store, userId: 'r', runner: async prompt => answer({ memory_updates: [
    { key: 'step-length', value: prompt.includes('Ahora tres minutos') ? 'Tres minutos' : 'Dos minutos', evidence: prompt.includes('Ahora tres minutos') ? 'Ahora tres minutos' : 'Dos minutos', kind: 'fact' },
  ] }) });
  await chat.send('demo:web', turn('Dos minutos'));
  await chat.send('demo:web', turn('Ahora tres minutos'));
  assert.equal(store.listMemory('r').filter(m => m.key === 'step-length').length, 1);
  assert.equal(store.listMemory('r').find(m => m.key === 'step-length')?.text, 'Tres minutos');
  const fresh = await chat.send('demo:web', turn('NUEVO'));
  assert.equal(fresh.concern, '');
  assert.equal(fresh.plan, null);
  assert.equal(fresh.memory.length, 2);
  const cleared = await chat.send('demo:web', turn('BORRAR'));
  assert.equal(cleared.messages.length, 1);
  assert.equal(cleared.memory.length, 1);
  assert.equal(store.listMemory('other').length, 1);
});

test('memory evidence must be a literal quote from the current user message', () => {
  const parsed = parseChatAnswer(answer({ memory_updates: [
    { key: 'ok', value: 'Dos minutos', evidence: 'dos minutos', kind: 'fact' },
    { key: 'invented', value: 'Nunca despertar', evidence: 'nunca despertar', kind: 'rule' },
    { key: 'not-literal', value: 'Dos minutos', evidence: 'DOS MINUTOS', kind: 'fact' },
  ] }), 'Prefiero dos minutos');
  assert.deepEqual(parsed.updates.map(m => m.key), ['ok']);
});

test('GET sees the completed session while a new turn is in flight', async () => {
  let release!: () => void;
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const chat = createChat({ store: new MemoryStore(), userId: 'r', runner: async () => {
    if (++calls === 2) { started(); await wait; }
    return answer();
  } });
  await chat.send('demo:web', turn('Primero'));
  const pending = chat.send('demo:web', turn('Segundo'));
  await entered;
  assert.equal(chat.view('demo:web').messages.length, 2);
  release();
  assert.equal((await pending).messages.length, 4);
});

test('model can clear an old concern and plan, and prompt includes the new message once', async () => {
  let calls = 0;
  const chat = createChat({ store: new MemoryStore(), userId: 'r', runner: async prompt => {
    if (++calls === 1) return answer();
    assert.equal(prompt.split('Listo por hoy').length - 1, 1);
    return answer({ concern: '', has_plan: false });
  } });
  await chat.send('demo:web', turn('Un pendiente'));
  const done = await chat.send('demo:web', turn('Listo por hoy'));
  assert.equal(done.concern, '');
  assert.equal(done.plan, null);
});

test('local mode works without keys and input validation rejects malformed turns', async () => {
  const chat = createChat({ store: new MemoryStore(), userId: 'r', runner: null });
  const local = await chat.send('demo:web', turn('Revisar el turno'));
  assert.equal(local.messages.at(-1)?.inference?.engine, 'rules');
  assert.throws(() => chat.send('demo:web', { text: 'hola', requestId: 'invalid' }), /UUID/);
  assert.throws(() => chat.send('demo:web', turn('')), /Falta text/);
  assert.throws(() => chat.send('demo:web', turn('x'.repeat(2001))), /2000/);
});
