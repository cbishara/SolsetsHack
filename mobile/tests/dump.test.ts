import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayLabel } from '../src/data/dates';
import { dumpToTasks, parseWhen, stripWhen } from '../src/data/dump';

const friday = new Date('2026-10-23T20:00:00-03:00');

test('splits a spoken dump into separate dated tasks', () => {
  const { tasks } = dumpToTasks('Mañana tengo que llamar al dentista, comprar pan y el viernes pagar la luz', 'you', friday);
  assert.deepEqual(tasks.map((t) => t.title), ['Llamar al dentista', 'Comprar pan', 'Pagar la luz']);
  assert.deepEqual(tasks.map((t) => t.date && dayLabel(t.date, friday)), ['Mañana', 'Mañana', 'Vie 30 oct']);
});

test('keeps "y" inside one task when no new action follows', () => {
  const { tasks } = dumpToTasks('Comprar pan y leche', 'you', friday);
  assert.deepEqual(tasks.map((t) => t.title), ['Comprar pan y leche']);
  assert.equal(tasks[0].date, undefined);
});

test('voice dumps are labeled as dictated', () => {
  const { tasks, reply } = dumpToTasks('el lunes mandar el informe de tickets', 'voice', friday);
  assert.equal(tasks[0].title, 'Mandar el informe de tickets');
  assert.equal(dayLabel(tasks[0].date!, friday), 'Lunes');
  assert.equal(tasks[0].sourceLabel, 'Nota de voz');
  assert.match(reply, /Anotado/);
});

test('reads a time and keeps it out of the title', () => {
  const when = parseWhen('Llamar al dentista mañana a las 10', friday);
  assert.equal(dayLabel(when.date!, friday), 'Mañana');
  assert.equal(when.time, '10:00');
  assert.equal(stripWhen('Llamar al dentista mañana a las 10', when), 'Llamar al dentista');
  assert.equal(parseWhen('pagar la luz a las 4', friday).time, '16:00');
});
