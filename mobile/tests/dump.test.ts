import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dumpToTasks } from '../src/data/dump';

const friday = new Date('2026-10-23T20:00:00-03:00');

test('splits a spoken dump into separate dated tasks', () => {
  const { tasks } = dumpToTasks('Mañana tengo que llamar al dentista, comprar pan y el viernes pagar la luz', 'you', friday);
  assert.deepEqual(tasks.map((t) => t.title), ['Llamar al dentista', 'Comprar pan', 'Pagar la luz']);
  assert.deepEqual(tasks.map((t) => t.due.label), ['Mañana', 'Mañana', 'Viernes']);
});

test('keeps "y" inside one task when no new action follows', () => {
  const { tasks } = dumpToTasks('Comprar pan y leche', 'you', friday);
  assert.deepEqual(tasks.map((t) => t.title), ['Comprar pan y leche']);
  assert.equal(tasks[0].due.kind, 'someday');
});

test('voice dumps are labeled as dictated', () => {
  const { tasks, reply } = dumpToTasks('el lunes mandar el informe de tickets', 'voice', friday);
  assert.equal(tasks[0].title, 'Mandar el informe de tickets');
  assert.equal(tasks[0].due.label, 'Lunes');
  assert.equal(tasks[0].sourceLabel, 'Lo dictaste tú');
  assert.match(reply, /Anotado/);
});
