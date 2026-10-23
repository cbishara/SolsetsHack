import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addConfirmedCase, loadCases } from './cases.ts';
import { createAgent } from './agent.ts';
import { rulesEngine } from './engines/rules.ts';
import { runWeek, summarize } from './evaluate.ts';
import { MemoryStore } from './store.ts';
import { DECISIONS } from './contract.ts';

test('the simulated week is well formed', async () => {
  const week = await loadCases();
  assert.ok(week.cases.length > 0, 'agent/cases/semana-simulada.json has no cases');
  const ids = new Set(week.cases.map(c => c.id));
  assert.equal(ids.size, week.cases.length, 'case ids must be unique');
  for (const c of week.cases) {
    assert.ok((DECISIONS as readonly string[]).includes(c.expected), `${c.id}: bad expected ${c.expected}`);
    assert.ok(!Number.isNaN(Date.parse(c.received_at)), `${c.id}: bad received_at`);
    assert.ok(['whatsapp', 'gmail'].includes(c.source), `${c.id}: bad source`);
  }
});

test('the fixed rules never miss a confirmed wake-up in the week', async () => {
  const week = await loadCases();
  const results = await runWeek(createAgent({ store: new MemoryStore(), engine: rulesEngine }), week, { runId: 'test' });
  const s = summarize(results);
  assert.equal(results.length, week.cases.length);
  assert.deepEqual(s.missed_wakes, []);
});

test('a verdict from the console confirms a proposed case without touching the week', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'solsets-cases-'));
  const weekFile = pathToFileURL(join(dir, 'week.json'));
  const verdictsFile = pathToFileURL(join(dir, 'verdicts.json'));
  await writeFile(weekFile, JSON.stringify({
    version: 1, user_id: 'rodrigo-demo', nights: [],
    cases: [{ id: 'c1', received_at: '2026-10-23T23:00:00-03:00', source: 'whatsapp', chat: null, sender: null, text: 'urgente: se acabó el café', incident_key: null, expected: 'DESPERTAR', why: 'dice urgente', status: 'propuesto', decided_by: 'propuesta del agente', edge: null }],
  }));
  await addConfirmedCase({ from_case: 'c1', text: 'urgente: se acabó el café', expected: 'RUIDO', why: 'el café no es una caída' }, verdictsFile);
  await addConfirmedCase({ from_case: 'c1', text: 'urgente: se acabó el café', expected: 'PARTE', why: 'cambié de opinión' }, verdictsFile);
  const loaded = await loadCases(weekFile, verdictsFile);
  assert.equal(loaded.cases[0].status, 'confirmado');
  assert.equal(loaded.cases[0].expected, 'PARTE');
  assert.equal(loaded.verdicts.length, 1, 're-judging a case replaces its verdict');
});
