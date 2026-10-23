import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarEvent } from './integrations.mjs';
test('calendar reminder uses explicit Santiago timezone and a valid duration', () => { const event = calendarEvent('Prueba', 'Sintético', new Date('2026-10-24T03:00:00Z')); assert.equal(event.start.timeZone, 'America/Santiago'); assert.equal(Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime), 600000); assert.deepEqual(event.reminders, { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] }); });
