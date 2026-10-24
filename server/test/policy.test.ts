// Same cases as agent/src/integration/server-policy.test.ts: server/src/policy.ts
// is a replica of decideForServer and must not drift from it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Classification } from '../src/contract.ts';
import { decideForServer, type PolicyContext } from '../src/policy.ts';

const at = '2026-10-23T23:00:00-03:00';
const c = (patch: Partial<Classification> = {}): Classification =>
  ({ messageId: 'm2', decision: 'report', reason: 'Puede esperar.', isNew: false, confidence: 0.9, incidentKey: 'k1', ...patch });
const ctx = (patch: Partial<PolicyContext> = {}): PolicyContext =>
  ({ night: { onCall: true }, settings: { mode: 'active' }, recent: [], ...patch });
const wakes = { wakeAtNight: true, action: 'alert' } as const;
const quiet = { wakeAtNight: false, action: 'ignore' } as const;

test('a category with wakeAtNight wakes a confident report when night alerts are on', () => {
  const v = decideForServer(c(), ctx({ category: wakes }), at);
  assert.equal(v.decision, 'wake'); assert.equal(v.wouldWake, true); assert.equal(v.why, 'category');
  assert.equal(decideForServer(c({ decision: 'noise' }), ctx({ category: wakes }), at).wouldWake, true);
});

test('with night alerts off the category does not wake; unanswered night keeps "ante la duda"', () => {
  const off = decideForServer(c(), ctx({ category: wakes, night: { onCall: false } }), at);
  assert.equal(off.wouldWake, false); assert.equal(off.why, 'off_duty');
  assert.equal(decideForServer(c(), ctx({ category: wakes, night: { onCall: null } }), at).wouldWake, true);
});

test('a quiet or ignore category cannot turn off the official wakes', () => {
  for (const patch of [{ isNew: true }, { confidence: 0.69 }, { decision: 'wake' as const }]) {
    const v = decideForServer(c(patch), ctx({ category: quiet }), at);
    assert.equal(v.wouldWake, true, JSON.stringify(patch)); assert.equal(v.decision, 'wake');
  }
  assert.equal(decideForServer(c({ isNew: true }), ctx({ category: quiet }), at).why, 'new');
  assert.equal(decideForServer(c({ decision: 'wake' }), ctx({ category: { wakeAtNight: false, action: 'digest' } }), at).why, 'urgent');
});

test('a category wake is still a duplicate within 30 minutes of the same incident', () => {
  const recent = [{ messageId: 'm1', incidentKey: 'k1', wouldWake: true, message: { receivedAt: '2026-10-23T22:40:00-03:00' } }];
  const v = decideForServer(c(), ctx({ category: wakes, recent }), at);
  assert.equal(v.wouldWake, false); assert.equal(v.why, 'duplicate');
});

test('shadow mode simulates the same category wake, and no category keeps today\'s behavior', () => {
  assert.deepEqual(decideForServer(c(), ctx({ category: wakes, settings: { mode: 'shadow' } }), at), decideForServer(c(), ctx({ category: wakes }), at));
  for (const category of [undefined, null]) {
    const v = decideForServer(c(), ctx({ category }), at);
    assert.equal(v.wouldWake, false); assert.equal(v.why, 'not_urgent');
  }
});

test('a malformed category is rejected', () => {
  for (const category of [{ wakeAtNight: 'yes', action: 'alert' }, { wakeAtNight: true, action: 'wake' }]) {
    assert.throws(() => decideForServer(c(), ctx({ category: category as never }), at), /invalid_job/);
  }
});

// Server-only extra: the 30-minute window is measured from the last real wake.
test('a duplicate after 30 minutes wakes again', () => {
  const recent = [{ messageId: 'm1', incidentKey: 'k1', wouldWake: true, message: { receivedAt: '2026-10-23T22:29:00-03:00' } }];
  const v = decideForServer(c({ decision: 'wake' }), ctx({ recent }), at);
  assert.equal(v.wouldWake, true); assert.equal(v.why, 'urgent');
});
