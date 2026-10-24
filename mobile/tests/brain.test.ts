import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialAppState } from '../src/data/store';
import { think } from '../src/features/sol/brain';

const s = initialAppState(true);

test('unloading becomes dated tasks, with an action to add them', () => {
  const r = think(s, 'Mañana llamar al dentista a las 10 y el viernes pagar la luz', 'text');
  assert.equal(r.tasks?.length, 2);
  assert.equal(r.tasks?.[0].time, '10:00');
  assert.equal(r.actions?.[0].type, 'addTasks');
});

test('night alerts can be turned on and off by talking', () => {
  const on = think(s, 'Activa los avisos esta noche', 'voice');
  assert.equal(on.actions?.[0].type, 'setNightAlerts');
  assert.match(on.text, /activos/);
  const off = think(s, 'Esta noche no me despiertes', 'voice');
  assert.match(off.text, /no te interrumpo/);
});

test('agenda questions are answered from the calendar, not turned into tasks', () => {
  const r = think(s, '¿Qué tengo mañana?', 'text');
  assert.ok(!r.actions?.some((a) => a.type === 'addTasks'));
  assert.match(r.text, /^Mañana/);
});
