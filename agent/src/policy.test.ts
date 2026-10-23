import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPolicy } from './policy.ts';
import type { Classification } from './contract.ts';

const base: Classification = { decision: 'PARTE', reason: 'Puede esperar.', is_new: false, confidence: 0.9 };
const run = (c: Partial<Classification>, lastWake: { message_id: string; at: number } | null = null, now = 1_000_000_000) =>
  applyPolicy({ classification: { ...base, ...c }, context: { shadow: true }, lastWake, now });

test('a new situation wakes, even if the engine said PARTE', () => {
  const r = run({ is_new: true });
  assert.equal(r.decision, 'DESPERTAR');
  assert.equal(r.wake, true);
  assert.match(r.policy[0], /nueva/);
});

test('confidence under 0.7 wakes', () => {
  assert.equal(run({ decision: 'RUIDO', confidence: 0.69 }).decision, 'DESPERTAR');
  assert.equal(run({ decision: 'RUIDO', confidence: 0.7 }).decision, 'RUIDO');
});

test('PARTE and RUIDO with enough confidence do not wake', () => {
  assert.equal(run({}).wake, false);
  assert.equal(run({ decision: 'RUIDO' }).wake, false);
});

test('the same incident inside 30 minutes does not wake again', () => {
  const now = 1_000_000_000;
  const r = run({ decision: 'DESPERTAR' }, { message_id: 'm1', at: now - 29 * 60_000 }, now);
  assert.equal(r.decision, 'DESPERTAR');
  assert.equal(r.wake, false);
  assert.equal(r.duplicate_of, 'm1');
});

test('after 30 minutes the same incident wakes again', () => {
  const now = 1_000_000_000;
  assert.equal(run({ decision: 'DESPERTAR' }, { message_id: 'm1', at: now - 31 * 60_000 }, now).wake, true);
});

test('shadow mode never silences: it does not change the decision or the wake', () => {
  const shadow = applyPolicy({ classification: { ...base, decision: 'DESPERTAR' }, context: { shadow: true }, lastWake: null, now: 0 });
  const real = applyPolicy({ classification: { ...base, decision: 'DESPERTAR' }, context: { shadow: false }, lastWake: null, now: 0 });
  assert.deepEqual(shadow, real);
});
