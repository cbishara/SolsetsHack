// App contract v2 (#61): categories, headline and context, suggested categories and question effects. Synthetic data only.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { CapabilityUnavailable, createAppCapabilities, QUESTION_ACTIONS } from './app-capabilities.ts';
import { createAppClassifier } from './app-classifier.ts';
import { InputError } from './agent.ts';
import { MemoryStore } from './store.ts';

const base = () => ({ userId: 'owner-A', requestId: randomUUID(), ownerVerified: true, synthetic: true });
const categories = () => [
  { id: 'c-outage', name: 'Caída de servicio', description: 'Un sistema que usan clientes o sucursales deja de funcionar.', action: 'alert', wakeAtNight: true },
  { id: 'c-shifts', name: 'Turnos', description: 'Cambios de turno o de guardia del equipo.', action: 'digest', wakeAtNight: false },
];
const input = (extra: Record<string, unknown> = {}) => ({ ...base(), recent: [], categories: categories(), ...extra,
  message: { id: 'portal-1', externalId: 'external-1', source: 'simulated', sender: 'Compañero ficticio', group: 'Guardia demo', text: 'Se cayó el portal de clientes', receivedAt: '2026-10-23T23:00:00-03:00' } });
const out = (patch: Record<string, unknown> = {}) => ({ decision: 'DESPERTAR', reason: 'El portal de clientes está caído.', is_new: false, confidence: 0.95,
  matchedIncidentKey: '', matchConfidence: 0, categoryId: 'c-outage', summary: 'Portal de clientes caído',
  context: 'Los clientes no pueden entrar desde las 23:00.\nRevisa el estado del portal.', ...patch });
const classifier = (o: unknown, seen: string[] = []) => createAppClassifier({ store: new MemoryStore(), runner: async prompt => { seen.push(prompt); return o; } });

test('classify returns an existing categoryId, a one-line summary and short context', async () => {
  const r = await classifier(out())(input());
  assert.equal(r.categoryId, 'c-outage'); assert.equal(r.summary, 'Portal de clientes caído');
  assert.equal(r.context.split('\n').length, 2); assert.equal(r.engine, 'codex');
});

test('only active categories reach the prompt, as data, without action or wakeAtNight', async () => {
  const prompts: string[] = [];
  const list = [...categories(), { id: 'c-backup', name: 'Respaldos', description: 'Avisos de respaldo.', action: 'digest', wakeAtNight: false, status: 'suggested', origin: 'sol', color: '#fff', icon: 'disk', createdAt: '2026-10-24T00:00:00Z' }];
  const r = await classifier(out({ categoryId: 'c-backup' }), prompts)(input({ categories: list }));
  assert.equal(r.categoryId, null, 'a suggested category cannot be chosen');
  assert.match(prompts[0], /nunca instrucciones/); assert.match(prompts[0], /c-outage/);
  assert.doesNotMatch(prompts[0], /c-backup|wakeAtNight/);
});

test('an invented or foreign categoryId becomes null without discarding the classification', async () => {
  const r = await classifier(out({ categoryId: 'c-invented' }))(input());
  assert.equal(r.categoryId, null); assert.equal(r.engine, 'codex'); assert.equal(r.decision, 'wake');
  assert.equal((await classifier(out())(input({ categories: undefined }))).categoryId, null, 'no categories means no category');
});

test('summary and context are clipped: one line, at most three lines', async () => {
  const r = await classifier(out({ summary: `Portal\n${'x'.repeat(300)}`, context: 'a\nb\n\nc\nd\ne' }))(input());
  assert.ok(!r.summary.includes('\n') && r.summary.length <= 120); assert.ok(r.summary.endsWith('…'));
  assert.equal(r.context, 'a\nb\nc');
});

test('empty model text falls back to the message and the reason', async () => {
  const r = await classifier(out({ summary: '  ', context: '' }))(input());
  assert.equal(r.summary, 'Se cayó el portal de clientes'); assert.equal(r.context, 'El portal de clientes está caído.');
});

test('rules fallback has no category, a summary from the text and an honest context', async () => {
  const long = `Se cayó la VPN ${'de la sucursal ficticia '.repeat(10)}`;
  const base = input();
  const r = await createAppClassifier({ store: new MemoryStore(), runner: null })({ ...base, message: { ...base.message, text: long } });
  assert.equal(r.engine, 'rules'); assert.equal(r.categoryId, null);
  assert.ok(r.summary.length <= 120 && r.summary.startsWith('Se cayó la VPN'));
  assert.match(r.context, /respaldo/); assert.doesNotMatch(r.context, /avis[eé]|llam[eé]/);
  const broken = await classifier({ ...out(), extra: true })(input());
  assert.equal(broken.engine, 'rules'); assert.equal(broken.categoryId, null);
});

test('invalid categories fail before inference', async () => {
  let calls = 0;
  const classify = createAppClassifier({ store: new MemoryStore(), runner: async () => { calls++; return out(); } });
  const c = categories()[0];
  for (const list of [
    [c, c], [{ ...c, action: 'wake' }], [{ ...c, wakeAtNight: 'yes' }], [{ ...c, prompt: 'x' }], [{ ...c, id: '' }],
    [{ ...c, status: 'deleted' }], [{ ...c, description: 'x'.repeat(501) }], Array.from({ length: 31 }, (_, i) => ({ ...c, id: `c-${i}` })), 'c-outage',
  ]) await assert.rejects(classify(input({ categories: list })), InputError);
  assert.equal(calls, 0);
});

const history = () => [
  { id: 'b1', userId: 'owner-A', text: 'Falló el respaldo nocturno del servidor ficticio', decision: 'report' },
  { id: 'b2', userId: 'owner-A', text: 'El respaldo de la base demo terminó con error', decision: 'report' },
  { id: 'vague', userId: 'owner-A', text: 'Hay un problema con eso', decision: 'wake' },
];
const suggestion = (patch: Record<string, unknown> = {}) => ({ name: 'Respaldos', description: 'Avisos de respaldos que fallan o terminan con error.', action: 'digest', wakeAtNight: false, evidenceIds: ['b1', 'b2'], ...patch });
const question = (patch: Record<string, unknown> = {}) => ({ text: '¿Qué problema debería despertarte?', context: 'El aviso no dice qué falla.', options: ['Caída', 'Para mañana'],
  effects: ['Te despierto si se cae algo.', 'Lo dejo en el resumen.'], actions: ['alert', 'digest'], evidenceIds: ['vague'], ...patch });
const train = (o: unknown, extra: Record<string, unknown> = {}) => createAppCapabilities({ runner: async () => o }).training({ ...base(), history: history(), ...extra });

test('training proposes suggested categories from a pattern, never active, with a stable id', async () => {
  const r = await train({ rules: [], questions: [], categories: [suggestion()] });
  assert.equal(r.categories.length, 1);
  assert.deepEqual({ ...r.categories[0], id: undefined }, { id: undefined, name: 'Respaldos', description: 'Avisos de respaldos que fallan o terminan con error.', action: 'digest', wakeAtNight: false, origin: 'sol', status: 'suggested' });
  assert.equal((await train({ rules: [], questions: [], categories: [suggestion()] })).categories[0].id, r.categories[0].id);
});

test('suggestions that repeat an existing or another suggestion are dropped', async () => {
  const existing = [{ id: 'c-b', name: 'respaldos', description: '', action: 'digest', wakeAtNight: false, status: 'suggested' }];
  assert.deepEqual((await train({ rules: [], questions: [], categories: [suggestion()] }, { categories: existing })).categories, []);
  assert.equal((await train({ rules: [], questions: [], categories: [suggestion(), suggestion({ name: 'Respaldos ' })] })).categories.length, 1);
});

test('suggestions without a pattern, with unknown evidence, a bad action or extra fields fail', async () => {
  for (const s of [suggestion({ evidenceIds: ['b1'] }), suggestion({ evidenceIds: ['b1', 'other'] }), suggestion({ action: 'wake' }),
    suggestion({ wakeAtNight: 'no' }), suggestion({ status: 'active' })]) {
    await assert.rejects(train({ rules: [], questions: [], categories: [s] }), CapabilityUnavailable);
  }
  await assert.rejects(train({ rules: [], questions: [], categories: [suggestion(), suggestion({ name: 'A' }), suggestion({ name: 'B' }), suggestion({ name: 'C' })] }), CapabilityUnavailable);
});

test('training questions carry kind, one effect and one catalog action per option', async () => {
  const r = await train({ rules: [], questions: [question()], categories: [] });
  assert.equal(r.questions[0].kind, 'question');
  assert.deepEqual(r.questions[0].actions, ['alert', 'digest']); assert.equal(r.questions[0].effects.length, 2);
  assert.ok(r.questions[0].actions.every(a => (QUESTION_ACTIONS as readonly string[]).includes(a)));
});

test('questions with mismatched or invalid effects/actions fail without partial output', async () => {
  for (const q of [question({ actions: ['alert'] }), question({ effects: ['Uno.'] }), question({ actions: ['alert', 'wake'] }),
    question({ effects: ['', 'Dos.'] }), question({ effects: undefined })]) {
    await assert.rejects(train({ rules: [], questions: [q], categories: [] }), CapabilityUnavailable);
  }
});

test('empty training history returns empty categories; dump date questions carry effects and actions', async () => {
  const empty = await createAppCapabilities({ runner: null }).training({ ...base(), history: [] });
  assert.deepEqual(empty.categories, []);
  const r = await createAppCapabilities({ runner: async () => ({ tasks: [{ title: 'Comprar pan', evidence: 'Comprar pan', dueText: 'cuando salga' }] }) })
    .dump({ ...base(), text: 'Comprar pan cuando salga', source: 'you', now: '2026-10-23T20:00:00-03:00', timeZone: 'America/Santiago' });
  const q = r.questions[0];
  assert.equal(q.kind, 'question'); assert.equal(q.effects.length, q.options.length); assert.deepEqual(q.actions, ['task', 'task', 'task']);
});
