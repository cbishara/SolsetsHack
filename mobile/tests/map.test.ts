import assert from 'node:assert/strict';
import { test } from 'node:test';
import { headline, itemsFrom, mergeSources, serverMessageId, tasksFromItems, toItem } from '../src/api/map';
import type { ServerVerdict } from '../src/api/server';
import { categories } from '../src/data/fixtures';
import type { Connection } from '../src/data/types';

const verdict = (id: string, text: string, decision: ServerVerdict['decision'], hoursAgo = 2, group?: string): ServerVerdict => ({
  messageId: id, decision, reason: 'motivo', isNew: false, confidence: 0.9, incidentKey: id, wouldWake: decision === 'wake', why: 'urgent',
  message: { id, source: 'simulated', sender: 'Javier', group, text, receivedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString() },
});

test('server verdicts become inbox items with the original text, demo emails are recognized', () => {
  const email = toItem(verdict('m1', '[SOLSETS-DEMO] Respaldo falló', 'wake'), categories);
  assert.equal(email.source, 'email');
  assert.equal(email.body, 'Respaldo falló');
  assert.equal(email.outcome.kind, 'alerted');
  assert.equal(email.categoryId, 'c-incident');
  const wa = toItem(verdict('m2', 'Se cayó el portal', 'wake', 1, 'Guardia TI'), categories);
  assert.equal(wa.source, 'whatsapp');
  assert.equal(wa.channel, 'Guardia TI');
  assert.equal(serverMessageId(wa.id), 'm2');
});

test('the feed keeps the last 30 hours, newest first', () => {
  const items = itemsFrom([verdict('old', 'viejo', 'noise', 40), verdict('a', 'a', 'noise', 5), verdict('b', 'b', 'report', 1)], categories);
  assert.deepEqual(items.map((i) => i.id), ['srv-b', 'srv-a']);
});

test('what waits for the morning becomes a task once, linked to its item', () => {
  const items = [toItem(verdict('r1', 'Necesito resetear mi clave', 'report', 1, 'Guardia TI'), categories), toItem(verdict('n1', 'jaja', 'noise'), categories)];
  const first = tasksFromItems(items, []);
  assert.equal(first.length, 1);
  assert.equal(first[0].itemId, 'srv-r1');
  assert.equal(first[0].sourceLabel, 'Javier · WhatsApp');
  assert.equal(tasksFromItems(items, first).length, 0);
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

test('raw messages get a clean headline until the agent sends one', () => {
  assert.equal(headline('Rodrigo, cuando despiertes revisa lo del portal porfa'), 'Cuando despiertes revisa lo del portal');
  assert.equal(headline('URGENTE: la impresora del tercer piso se quedó sin tóner'), 'La impresora del tercer piso se quedó sin tóner');
});
