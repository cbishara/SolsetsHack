import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, keyOf, nextRepeat } from '../src/data/dates';
import { categories, nightAlerts } from '../src/data/fixtures';
import { groupTasks, nightAlertsFor } from '../src/data/select';
import type { CalendarEvent, Task } from '../src/data/types';

const monday = '2026-10-26';
const guard = (day: string): CalendarEvent => ({
  id: 'g', title: 'Guardia nocturna', calendarId: 'shifts', alert: 'none', source: 'calendar',
  start: new Date(`${day}T23:00:00`).toISOString(), end: new Date(`${addDays(day, 1)}T07:00:00`).toISOString(),
});

test('night alerts follow the calendar keyword, and say why', () => {
  const s = { nightAlerts, categories, events: [guard(monday)] };
  const on = nightAlertsFor(s, monday);
  assert.equal(on.on, true);
  assert.match(on.because, /Guardia nocturna/);
  assert.deepEqual(on.wakers.map((c) => c.id), ['c-incident', 'c-security']);
  assert.equal(nightAlertsFor(s, addDays(monday, 1)).on, false);
});

test('a one-night override wins, and quiet mode never wakes', () => {
  const s = { nightAlerts: { ...nightAlerts, override: { date: addDays(monday, 1), on: true } }, categories, events: [] };
  assert.equal(nightAlertsFor(s, addDays(monday, 1)).on, true);
  assert.equal(nightAlertsFor({ ...s, nightAlerts: { ...s.nightAlerts, mode: 'quiet' as const } }, addDays(monday, 1)).on, false);
});

test('tasks group like Reminders: overdue, today, tomorrow, no date', () => {
  const now = new Date('2026-10-24T10:00:00');
  const t = (id: string, date?: string, time?: string): Task => ({ id, title: id, source: 'you', sourceLabel: '', date, time, reminder: 'none', repeat: 'never', priority: 'none', flagged: false, done: false, createdAt: '' });
  const today = keyOf(now);
  const groups = groupTasks([t('late', today, '09:00'), t('today', today), t('tomorrow', addDays(today, 1)), t('someday')], now);
  assert.deepEqual(groups.map((g) => [g.id, g.tasks.map((x) => x.id)]), [['overdue', ['late']], ['today', ['today']], ['tomorrow', ['tomorrow']], ['someday', ['someday']]]);
});

test('repeating tasks move to their next date', () => {
  assert.equal(nextRepeat('2026-10-23', 'weekdays'), '2026-10-26'); // Friday → Monday
  assert.equal(nextRepeat('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(nextRepeat('2026-10-24', 'weekly'), '2026-10-31');
});
