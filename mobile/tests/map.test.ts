import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastNightFrom, mergeSources, tasksFromNight, toHandled } from '../src/api/map';
import type { ServerVerdict } from '../src/api/server';
import type { Connection } from '../src/data/types';

const verdict = (id: string, text: string, decision: ServerVerdict['decision'], hoursAgo = 2, group?: string): ServerVerdict => ({
  messageId: id, decision, reason: 'motivo', isNew: false, confidence: 0.9, incidentKey: id, wouldWake: decision === 'wake', why: 'urgent',
  message: { id, source: 'simulated', sender: 'Javier', group, text, receivedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString() },
});

test('server verdicts become handled items, demo emails are recognized', () => {
  const h = toHandled(verdict('m1', '[SOLSETS-DEMO] Respaldo falló', 'wake'));
  assert.equal(h.source, 'email');
  assert.equal(h.text, 'Respaldo falló');
  assert.equal(h.wouldWake, true);
  assert.equal(toHandled(verdict('m2', 'Se cayó el portal', 'wake', 1, 'Guardia TI')).source, 'whatsapp');
});

test('last night keeps the last 30 hours, newest first', () => {
  const items = lastNightFrom([verdict('old', 'viejo', 'noise', 40), verdict('a', 'a', 'noise', 5), verdict('b', 'b', 'report', 1)]);
  assert.deepEqual(items.map((i) => i.id), ['b', 'a']);
});

test('what waits for the morning becomes a task once', () => {
  const items = [toHandled(verdict('r1', 'Necesito resetear mi clave', 'report', 1, 'Guardia TI')), toHandled(verdict('n1', 'jaja', 'noise'))];
  const first = tasksFromNight(items, []);
  assert.equal(first.length, 1);
  assert.equal(first[0].id, 'srv-r1');
  assert.equal(first[0].sourceLabel, 'Guardia TI, Javier');
  assert.equal(tasksFromNight(items, first).length, 0);
});

test('live sources update connections, calendar stays local', () => {
  const local: Connection[] = [
    { id: 'whatsapp', name: 'WhatsApp', status: 'connected', detail: 'demo' },
    { id: 'calendar', name: 'Calendario', status: 'connected', detail: 'Turnos' },
  ];
  const merged = mergeSources(local, [{ id: 'whatsapp', kind: 'whatsapp', status: 'disconnected', detail: 'logout', updatedAt: '2026-10-23T23:00:00Z' }]);
  assert.equal(merged[0].status, 'needs_attention');
  assert.equal(merged[1].status, 'connected');
});
