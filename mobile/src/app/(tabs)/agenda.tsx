import { router } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { keyOf, weekOf } from '../../components/week-strip';
import { Card, IconButton, Screen, Section, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { itemsFor, taskDayKey, weekSummary } from '../../features/agenda/day-items';
import { Timeline } from '../../features/agenda/timeline';
import { WeekPager } from '../../features/agenda/week-pager';
import { space } from '../../theme/tokens';

// Agenda: the week and the selected day in one timeline. Shifts, events and
// dated tasks together, so nobody has to cross-check three apps.
export default function Agenda() {
  const { state, events, shifts } = useStore();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => keyOf(new Date()));

  const busy = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) if (e.kind !== 'shift') { const k = keyOf(new Date(e.start)); counts[k] = (counts[k] ?? 0) + 1; }
    for (const t of state.tasks) { const k = taskDayKey(t); if (k && !t.done) counts[k] = (counts[k] ?? 0) + 1; }
    return counts;
  }, [events, state.tasks]);

  const items = useMemo(() => itemsFor(selected, events, shifts, state.tasks), [selected, events, shifts, state.tasks]);
  const summary = useMemo(() => weekSummary(anchor, events, shifts, state.tasks), [anchor, events, shifts, state.tasks]);
  const thisWeek = weekOf(anchor).some((d) => keyOf(d) === keyOf(new Date()));
  const selDate = new Date(`${selected}T12:00:00`);
  const isToday = selected === keyOf(new Date());
  const dayTitle = isToday ? 'Hoy' : selDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, gap: space.xs }}>
          <T v="eyebrow" tone="muted">{thisWeek ? 'Esta semana' : 'Otra semana'}</T>
          <T v="title" accessibilityRole="header">Agenda</T>
          <T v="callout" tone="muted">{summary}</T>
        </View>
        <IconButton icon={CalendarPlus} label="Agregar algo con Sol" onPress={() => router.push('/sol')} />
      </View>

      <WeekPager anchor={anchor} onAnchor={setAnchor} selected={selected} onSelect={setSelected} shifts={shifts} busy={busy} />

      <Section eyebrow={isToday ? selDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' }) : undefined}
        title={dayTitle.charAt(0).toUpperCase() + dayTitle.slice(1)}>
        {items.length ? (
          <Timeline items={items} />
        ) : (
          <Card tone="surface">
            <T v="bodyStrong">Día libre</T>
            <T v="callout" tone="muted">No hay nada agendado. Si quieres sumar algo, díselo a Sol y le pone fecha.</T>
          </Card>
        )}
      </Section>
    </Screen>
  );
}
