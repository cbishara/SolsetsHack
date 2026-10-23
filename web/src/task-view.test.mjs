import test from 'node:test';
import assert from 'node:assert/strict';
import { taskView } from './task-view.mjs';

test('a saved draft does not become a resolved obligation', () => {
  assert.equal(taskView({ status: 'draft' }).group, 'prepared');
  assert.equal(taskView({ status: 'prepared', local: true }).group, 'prepared');
});
test('legacy completed effects are described as activity, never resolved incidents', () => {
  assert.equal(taskView({ status: 'resolved', synthetic: true }).label, 'Acción simulada');
  assert.equal(taskView({ status: 'resolved', synthetic: false }).label, 'Acción registrada');
  assert.equal(taskView({ status: 'resolved' }).group, 'activity');
});
test('failures and approvals stay visible as decisions', () => {
  for (const status of ['failed', 'blocked', 'escalated', 'approval']) assert.equal(taskView({ status }).group, 'decision');
});
