// Builds the summaries from the store, for the screens and for WhatsApp, so
// both always say the same thing.
import { addDays, dayLabel, dueLabel, keyOf, timeOf, todayKey } from '../../data/dates';
import { byCategory, dayDigest, dueToday, eventsOn, lastNightItems, nightAlertsFor, tonight, toReview } from '../../data/select';
import type { AppState } from '../../data/store';
import type { SleepNight } from '../../data/types';
import type { DayInput, MorningInput, TonightInput } from './whatsapp-copy';

export function sleepLine(sleep: SleepNight[]): string | undefined {
  const last = sleep[sleep.length - 1];
  if (!last) return undefined;
  const h = Math.floor(last.hours);
  const m = Math.round((last.hours - h) * 60);
  return `Dormiste cerca de ${h} h${m ? ` ${m} min` : ''}, de ${last.bed} a ${last.wake}.`;
}

export function morningInput(s: AppState, sleep: SleepNight[], now = new Date()): MorningInput {
  const night = lastNightItems(s, now);
  const alerted = night.filter((i) => i.outcome.kind === 'alerted');
  const waited = night.filter((i) => i.outcome.kind === 'task');
  const taskOf = (id: string) => s.tasks.find((t) => t.id === id);
  return {
    name: s.profile.name,
    at: s.summaries.morning.at,
    alerted: alerted.map((i) => ({ time: timeOf(i.receivedAt), text: i.summary, seenAt: i.outcome.kind === 'alerted' && i.outcome.seenAt ? timeOf(i.outcome.seenAt) : undefined })),
    waited: waited.map((i) => {
      const t = i.outcome.kind === 'task' ? taskOf(i.outcome.taskId) : undefined;
      return { text: t?.title ?? i.summary, due: t ? (dueLabel(t) ?? 'sin fecha').toLowerCase() : 'hoy' };
    }),
    silenced: night.filter((i) => i.outcome.kind === 'ignored').length,
    totalRead: night.length,
    sleep: sleepLine(sleep),
    today: dueToday(s, now).slice(0, 4).map((t) => t.title),
    events: eventsOn(s, keyOf(now)).filter((e) => !e.allDay && keyOf(new Date(e.start)) === keyOf(now)).slice(0, 4).map((e) => ({ time: timeOf(e.start), title: e.title })),
    review: toReview(s).length,
    shadow: s.profile.agentMode === 'shadow',
  };
}

export function dayInput(s: AppState, now = new Date()): DayInput {
  const d = dayDigest(s, todayKey(now), now);
  const t = nightAlertsFor(s, todayKey(now));
  const first = d.tomorrowEvents.find((e) => keyOf(new Date(e.start)) === addDays(todayKey(now), 1) && !e.allDay);
  return {
    name: s.profile.name,
    at: s.summaries.evening.at,
    arrived: d.arrived.length,
    byCategory: byCategory(s, d.meaningful).filter((g) => g.category).map((g) => ({ name: g.category!.name, count: g.items.length })),
    done: d.done.map((x) => x.title),
    tomorrow: d.tomorrow.map((x) => `${x.title}${x.time ? ` (${x.time})` : ''}`),
    firstTomorrow: first ? { time: timeOf(first.start), title: first.title } : undefined,
    tonight: { on: t.on, from: t.from, to: t.to, wakers: t.wakers.map((c) => c.name), morningAt: s.summaries.morning.at },
  };
}

export function tonightInput(s: AppState, now = new Date()): TonightInput {
  const t = tonight(s, now);
  return { at: s.nightAlerts.from.replace(/^(\d\d)/, (h) => String(Math.max(0, Number(h) - 1)).padStart(2, '0')), from: t.from, to: t.to, because: t.event ? `Tienes "${t.event.title}" en tu calendario` : undefined, wakers: t.wakers.map((c) => c.name) };
}

export const tomorrowLabel = (now = new Date()) => dayLabel(addDays(todayKey(now), 1), now);
