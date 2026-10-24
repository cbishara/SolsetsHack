import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { CapabilityUnavailable, createAppCapabilities, dueFromText } from './app-capabilities.ts';
import { createAppClassifier } from './app-classifier.ts';
import { createAgent, InputError } from './agent.ts';
import { rulesEngine } from './engines/rules.ts';
import { createAgentServer } from './server.ts';
import { MemoryStore } from './store.ts';
import { decideForServer } from './integration/server-policy.ts';

const base = () => ({ userId: 'owner-A', requestId: randomUUID(), ownerVerified: true, synthetic: true });
const dumpInput = () => ({ ...base(), text: 'Mañana tengo que llamar al dentista, comprar pan y el viernes pagar la luz', source: 'you', now: '2026-10-23T20:00:00-03:00', timeZone: 'America/Santiago' });
const extracted = () => ({ tasks: [
  { title: 'Llamar al dentista', evidence: 'llamar al dentista', dueText: 'Mañana' },
  { title: 'Comprar pan', evidence: 'comprar pan', dueText: 'Mañana' },
  { title: 'Pagar la luz', evidence: 'pagar la luz', dueText: 'el viernes' },
] });
const history = () => [
  { id: 'printer', userId: 'owner-A', text: 'Mañana revisar la impresora', decision: 'wake', feedback: 'should_not_have_woken' },
  { id: 'vague', userId: 'owner-A', text: 'Hay un problema con eso', decision: 'wake' },
];
const trainingOut = () => ({ rules: [{ text: 'Dejar para la mañana las revisiones de impresora pedidas para mañana.', kind: 'wait', evidenceIds: ['printer'] }],
  questions: [{ text: '¿Qué problema debería despertarte?', context: 'El aviso no dice qué está fallando.', options: ['Caída del servicio', 'Revisión para mañana'],
    effects: ['Te despierto cuando se caiga un servicio.', 'Lo dejo para el resumen de la mañana.'], actions: ['alert', 'digest'], evidenceIds: ['vague'] }],
  categories: [] as Array<{ name: string; description: string; action: string; wakeAtNight: boolean; evidenceIds: string[] }> });

test('dump splits the Bishara example with inherited dates and next Friday, without claiming persistence', async () => {
  const result = await createAppCapabilities({ runner: async () => extracted() }).dump(dumpInput());
  assert.deepEqual(result.tasks.map(t => t.title), ['Llamar al dentista', 'Comprar pan', 'Pagar la luz']);
  assert.deepEqual(result.tasks.map(t => t.due.at), ['2026-10-24T15:00:00.000Z', '2026-10-24T15:00:00.000Z', '2026-10-30T15:00:00.000Z']);
  assert.deepEqual(result.tasks.map(t => t.due.label), ['Mañana', 'Mañana', 'Viernes']);
  assert.ok(result.tasks.every(t => !t.done && !t.important));
  assert.equal(result.engine, 'codex'); assert.match(result.reply, /Preparé/); assert.doesNotMatch(result.reply, /guard|anot/);
});

test('dates follow the user timezone, leap day and DST calendar day, never UTC midnight', async () => {
  const app = createAppCapabilities({ runner: async () => ({ tasks: [{ title: 'Comprar pan', evidence: 'Comprar pan', dueText: 'mañana' }] }) });
  const r = await app.dump({ ...dumpInput(), text: 'Comprar pan mañana', now: '2026-10-24T01:00:00Z' });
  assert.equal(r.tasks[0].due.at, '2026-10-24T15:00:00.000Z');
  assert.equal(dueFromText('mañana', '2028-02-28', 'America/Santiago')?.at, '2028-02-29T15:00:00.000Z');
  assert.equal(dueFromText('mañana', '2026-09-05', 'America/Santiago')?.at, '2026-09-06T15:00:00.000Z');
  assert.equal(dueFromText('2026-02-30', '2026-10-23', 'America/Santiago'), null);
});

test('undated voice tasks and unknown dates keep reviewable questions with no guessed date', async () => {
  const r = await createAppCapabilities({ runner: async () => ({ tasks: [{ title: 'Comprar pan y leche', evidence: 'Comprar pan y leche', dueText: 'cuando salga del turno' }] }) })
    .dump({ ...dumpInput(), source: 'voice', text: 'Comprar pan y leche cuando salga del turno' });
  assert.equal(r.tasks.length, 1); assert.equal(r.tasks[0].sourceLabel, 'Lo dictaste tú');
  assert.deepEqual(r.tasks[0].due, { kind: 'someday', label: 'Sin fecha' });
  assert.equal(r.questions.length, 1); assert.ok(!('answer' in r.questions[0]));
  assert.deepEqual(dueFromText('', '2026-10-23', 'America/Santiago'), { kind: 'someday', label: 'Sin fecha' });
});

test('same request has stable task IDs, users and independent requests have distinct IDs', async () => {
  const app = createAppCapabilities({ runner: async () => extracted() }), input = dumpInput();
  const first = await app.dump(input);
  assert.deepEqual(await app.dump(input), first);
  assert.notEqual((await app.dump({ ...input, userId: 'owner-B' })).tasks[0].id, first.tasks[0].id);
  assert.notEqual((await app.dump({ ...input, requestId: randomUUID() })).tasks[0].id, first.tasks[0].id);
});

test('invalid input, timezone, owner, provenance and audio blobs fail before inference', async () => {
  let calls = 0;
  const app = createAppCapabilities({ runner: async () => { calls++; return extracted(); } });
  for (const patch of [{ timeZone: 'wrong' }, { now: '2026-10-23' }, { source: 'whatsapp' }, { text: '' }, { ownerVerified: false }, { synthetic: false }, { requestId: 'bad' }, { audio: 'blob' }]) {
    await assert.rejects(app.dump({ ...dumpInput(), ...patch }), InputError);
  }
  assert.equal(calls, 0);
});

test('invented quotes, dates, repeated tasks and extra model effects fail without partial output', async () => {
  for (const tasks of [
    [{ title: 'Inventada', evidence: 'no existe', dueText: '' }],
    [{ title: 'Comprar pan', evidence: 'comprar pan', dueText: 'hoy' }],
    [extracted().tasks[0], extracted().tasks[0]],
    [{ ...extracted().tasks[0], done: true }],
  ]) await assert.rejects(createAppCapabilities({ runner: async () => ({ tasks }) }).dump(dumpInput()), CapabilityUnavailable);
});

test('no action can produce an empty result; unavailable engines never fabricate success or leak errors', async () => {
  const empty = await createAppCapabilities({ runner: async () => ({ tasks: [] }) }).dump({ ...dumpInput(), text: 'Estoy cansado' });
  assert.deepEqual(empty.tasks, []);
  for (const runner of [null, async () => { throw new Error('PRIVATE TOKEN'); }]) {
    await assert.rejects(createAppCapabilities({ runner }).dump(dumpInput()), (e: Error) => e.message === 'engine_unavailable');
  }
});

test('training produces UI rules requiring confirmation and unanswered contextual questions', async () => {
  const input = { ...base(), history: history() }, before = structuredClone(input);
  const result = await createAppCapabilities({ runner: async () => trainingOut() }).training(input);
  assert.equal(result.rules[0].confirmed, false); assert.equal(result.rules[0].origin, 'feedback');
  assert.equal(result.rules[0].examples, 1); assert.equal(result.rules[0].kind, 'wait');
  assert.equal(result.questions[0].options.length, 2); assert.ok(!('answer' in result.questions[0]));
  assert.deepEqual(input, before);
});

test('rules cannot cite unreviewed/unknown messages, or smuggle activation and answers into output', async () => {
  for (const edit of [
    (o: ReturnType<typeof trainingOut>) => { o.rules[0].evidenceIds = ['vague']; },
    (o: ReturnType<typeof trainingOut>) => { o.questions[0].evidenceIds = ['other-user']; },
    (o: ReturnType<typeof trainingOut>) => { Object.assign(o.rules[0], { confirmed: true }); },
    (o: ReturnType<typeof trainingOut>) => { Object.assign(o.questions[0], { answer: 'Sí' }); },
    (o: ReturnType<typeof trainingOut>) => { o.rules[0].kind = 'ignore'; },
  ]) {
    const out = trainingOut(); edit(out);
    await assert.rejects(createAppCapabilities({ runner: async () => out }).training({ ...base(), history: history() }), CapabilityUnavailable);
  }
});

test('contradictory feedback supports a question, never a rule that hides one correction', async () => {
  const items = [history()[0], { ...history()[0], id: 'printer-urgent', feedback: 'should_have_woken' }];
  const out = trainingOut(); out.rules[0].evidenceIds = ['printer', 'printer-urgent']; out.questions = [];
  await assert.rejects(createAppCapabilities({ runner: async () => out }).training({ ...base(), history: items }), CapabilityUnavailable);
});

test('training rejects cross-user and duplicate history before inference; empty history needs no model', async () => {
  let calls = 0; const app = createAppCapabilities({ runner: async () => { calls++; return trainingOut(); } });
  await assert.rejects(app.training({ ...base(), history: [{ ...history()[0], userId: 'owner-B' }] }), InputError);
  await assert.rejects(app.training({ ...base(), history: [history()[0], history()[0]] }), InputError);
  const empty = await app.training({ ...base(), history: [] });
  assert.deepEqual(empty.rules, []); assert.equal(empty.engine, 'rules'); assert.equal(calls, 0);
});

const classifyInput = () => ({ ...base(), message: { id: 'portal-1', externalId: 'external-1', source: 'simulated', sender: 'Compañero ficticio', group: 'Guardia demo', text: 'Se cayó el portal de clientes', receivedAt: '2026-10-23T23:00:00-03:00' }, recent: [] as Array<{ userId: string; incidentKey: string; text: string; group: string; receivedAt: string }> });
const classificationOut = () => ({ decision: 'DESPERTAR', reason: 'El portal de clientes está caído.', is_new: false, confidence: 0.95, matchedIncidentKey: '', matchConfidence: 0,
  categoryId: '', summary: 'Portal de clientes caído', context: 'Los clientes no pueden entrar desde las 23:00.\nRevisa el estado del portal.' });

test('server policy wakes for an outage then suppresses a paraphrase of the same confirmed incident', async () => {
  const store = new MemoryStore(); let out = classificationOut();
  const classify = createAppClassifier({ store, runner: async () => out });
  const input = classifyInput(), original = structuredClone(input), first = await classify(input);
  const policy = { night: { onCall: true }, settings: { mode: 'shadow' as const }, recent: [] };
  assert.equal(first.decision, 'wake'); assert.equal(decideForServer(first, policy, input.message.receivedAt).wouldWake, true);
  out = { ...out, matchedIncidentKey: first.incidentKey, matchConfidence: 0.98 };
  const secondInput = { ...input, message: { ...input.message, id: 'portal-2', text: 'Confirmo, el portal de clientes no responde', receivedAt: '2026-10-23T23:10:00-03:00' },
    recent: [{ userId: input.userId, incidentKey: first.incidentKey, text: input.message.text, group: input.message.group, receivedAt: input.message.receivedAt }] };
  const second = await classify(secondInput);
  assert.equal(second.incidentKey, first.incidentKey);
  const verdict = decideForServer(second, { ...policy, recent: [{ messageId: first.messageId, incidentKey: first.incidentKey, wouldWake: true, message: { receivedAt: input.message.receivedAt } }] }, secondInput.message.receivedAt);
  assert.equal(verdict.wouldWake, false); assert.equal(verdict.why, 'duplicate');
  assert.deepEqual(input, original); assert.deepEqual(store.listDecisions(input.userId), []);
});

test('uncertain, stale, future, other-chat and forged incident matches cannot suppress a new wake', async () => {
  const input = classifyInput(); input.recent = [{ userId: input.userId, incidentKey: 'previous', text: 'Se cayó la VPN de Temuco', group: input.message.group, receivedAt: '2026-10-23T22:50:00-03:00' }];
  const run = (key: string, confidence: number) => createAppClassifier({ store: new MemoryStore(), runner: async () => ({ ...classificationOut(), matchedIncidentKey: key, matchConfidence: confidence }) });
  assert.notEqual((await run('previous', 0.5)(input)).incidentKey, 'previous');
  assert.equal((await run('invented', 1)(input)).engine, 'rules');
  for (const patch of [{ group: 'Otro chat' }, { receivedAt: '2026-10-23T22:00:00-03:00' }, { receivedAt: '2026-10-24T00:00:00-03:00' }]) {
    const r = await run('previous', 1)({ ...input, recent: [{ ...input.recent[0], ...patch }] });
    assert.equal(r.engine, 'rules'); assert.notEqual(r.incidentKey, 'previous');
  }
  let calls = 0;
  await assert.rejects(createAppClassifier({ store: new MemoryStore(), runner: async () => { calls++; return classificationOut(); } })({ ...input, recent: [{ ...input.recent[0], userId: 'owner-B' }] }), InputError);
  assert.equal(calls, 0);
});

test('classifier fallback is conservative and only exact repeats reuse an incident', async () => {
  const input = classifyInput(); input.recent = [{ userId: input.userId, incidentKey: 'same', text: input.message.text, group: input.message.group, receivedAt: '2026-10-23T22:50:00-03:00' }];
  const classify = createAppClassifier({ store: new MemoryStore(), runner: null });
  assert.equal((await classify(input)).incidentKey, 'same');
  const different = await classify({ ...input, message: { ...input.message, text: 'No sé qué está pasando' } });
  assert.equal(different.isNew, true); assert.equal(different.decision, 'wake'); assert.notEqual(different.incidentKey, 'same');
});

test('HTTP candidate routes require the internal Bearer and expose only bounded engine failures', async () => {
  const store = new MemoryStore(), token = 'internal-test-token'; let calls = 0;
  const server = createAgentServer({ store, agent: createAgent({ store, engine: rulesEngine }), token, dev: false,
    appClassifier: createAppClassifier({ store, runner: null }),
    appCapabilities: createAppCapabilities({ runner: async () => { calls++; throw new Error('PRIVATE'); } }),
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (path: string, body: unknown, authorized = true) => fetch(`${baseUrl}/v1/app/${path}`, { method: 'POST', headers: authorized ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });
  try {
    assert.equal((await post('dump', dumpInput(), false)).status, 401); assert.equal(calls, 0);
    assert.equal((await post('dump', { ...dumpInput(), source: 'blob' })).status, 400); assert.equal(calls, 0);
    const failed = await post('dump', dumpInput()); assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { error: 'engine_unavailable' });
    assert.equal((await post('classify', classifyInput())).status, 200);
    assert.equal((await post('training', { ...base(), history: [] })).status, 200);
    assert.equal((await post('unknown', {})).status, 404);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
