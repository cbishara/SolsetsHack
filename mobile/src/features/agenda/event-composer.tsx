import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { Chip, Field, List, ListRow, Sheet, T, tap } from '../../components/ui';
import { cap, dayLabel, fromKey, keyOf, minutesOf, REMINDERS, timeOf, todayKey } from '../../data/dates';
import { newId, useStore } from '../../data/store';
import type { CalendarEvent, ReminderOption } from '../../data/types';
import { shiftTime } from '../settings/format';
import { DateCalendar, TimeWheel } from '../tasks/pickers';
import { useTheme } from '../../theme/theme';
import { categoryColors, space } from '../../theme/tokens';

const iso = (key: string, hhmm: string) => {
  const d = fromKey(key);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m);
  return d.toISOString();
};

/** New or edited event: title, day, hours, calendar, place and alert. */
export function EventComposer({ visible, onClose, initial, day, onSaved }: {
  visible: boolean; onClose: () => void; initial?: CalendarEvent; day?: string; onSaved?: (e: CalendarEvent) => void;
}) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey());
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [calendarId, setCalendarId] = useState('work');
  const [place, setPlace] = useState('');
  const [notes, setNotes] = useState('');
  const [alert, setAlert] = useState<ReminderOption>('15m');
  const [open, setOpen] = useState<'date' | 'start' | 'end' | null>(null);

  useEffect(() => {
    if (!visible) return;
    const next = new Date(); next.setMinutes(0); next.setHours(next.getHours() + 1);
    setTitle(initial?.title ?? '');
    setDate(initial ? keyOf(new Date(initial.start)) : day ?? todayKey());
    setAllDay(!!initial?.allDay);
    setStart(initial ? timeOf(initial.start) : timeOf(next.toISOString()));
    setEnd(initial ? timeOf(initial.end) : timeOf(new Date(next.getTime() + 3_600_000).toISOString()));
    setCalendarId(initial?.calendarId ?? state.calendars[0]?.id ?? 'work');
    setPlace(initial?.place ?? ''); setNotes(initial?.notes ?? ''); setAlert(initial?.alert ?? '15m'); setOpen(null);
  }, [visible, initial, day, state.calendars]);

  const save = () => {
    if (!title.trim()) return;
    const crosses = !allDay && minutesOf(end) <= minutesOf(start);
    const endKey = crosses ? keyOf(new Date(fromKey(date).getTime() + 86_400_000)) : date;
    const event: CalendarEvent = {
      id: initial?.id ?? newId('e'), title: title.trim(), calendarId, place: place.trim() || undefined, notes: notes.trim() || undefined,
      start: iso(date, allDay ? '00:00' : start), end: allDay ? iso(date, '23:59') : iso(endKey, end), allDay, alert,
      source: initial?.source ?? 'you', itemId: initial?.itemId, attendees: initial?.attendees,
    };
    tap('success');
    dispatch(initial ? { type: 'updateEvent', id: event.id, patch: event } : { type: 'addEvent', event });
    onSaved?.(event);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? 'Editar evento' : 'Nuevo evento'} action={{ label: initial ? 'Guardar' : 'Agregar', onPress: save, disabled: !title.trim() }}>
      <Field value={title} onChangeText={setTitle} placeholder="Título" autoFocus={!initial} accessibilityLabel="Título del evento" />
      <Field value={place} onChangeText={setPlace} placeholder="Lugar o enlace" accessibilityLabel="Lugar" />
      <List>
        <ListRow title="Todo el día" right={<Switch value={allDay} onValueChange={(v) => { tap(); setAllDay(v); }} trackColor={{ true: p.calm, false: p.surface }} ios_backgroundColor={p.surface} accessibilityLabel="Todo el día" />} />
        <ListRow title="Día" value={cap(dayLabel(date))} onPress={() => setOpen(open === 'date' ? null : 'date')} last={allDay && open !== 'date'} />
        {open === 'date' ? <View style={{ padding: space.md }}><DateCalendar value={date} onChange={(k) => { setDate(k); setOpen(null); }} /></View> : null}
        {!allDay ? (
          <>
            <ListRow title="Empieza" value={start} onPress={() => setOpen(open === 'start' ? null : 'start')} />
            {open === 'start' ? <TimeWheel value={start} onChange={(v) => { const d = minutesOf(end) - minutesOf(start); setStart(v); setEnd(shiftTime(v, d > 0 ? d : 60)); }} /> : null}
            <ListRow title="Termina" value={minutesOf(end) <= minutesOf(start) ? `${end} (día siguiente)` : end} onPress={() => setOpen(open === 'end' ? null : 'end')} last={open !== 'end'} />
            {open === 'end' ? <TimeWheel value={end} onChange={setEnd} /> : null}
          </>
        ) : null}
      </List>
      <View style={{ gap: space.sm }}>
        <T v="captionStrong" tone="muted">Calendario</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {state.calendars.map((c) => <Chip key={c.id} label={c.name} dot={categoryColors[c.color]} selected={calendarId === c.id} onPress={() => setCalendarId(c.id)} />)}
        </ScrollView>
      </View>
      <View style={{ gap: space.sm }}>
        <T v="captionStrong" tone="muted">Aviso</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {REMINDERS.filter((r) => ['none', 'at', '5m', '15m', '1h', '1d'].includes(r.id)).map((r) => <Chip key={r.id} label={r.short} selected={alert === r.id} onPress={() => setAlert(r.id)} />)}
        </ScrollView>
      </View>
      <Field value={notes} onChangeText={setNotes} placeholder="Notas" multiline accessibilityLabel="Notas" />
    </Sheet>
  );
}
