import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/top-bar';
import { Button, Chip, IconButton, Screen, Section, Segmented, T, tap } from '../../components/ui';
import { cap, dayLabel, fromKey, longDate, MONTHS, todayKey, weekOf } from '../../data/dates';
import { useStore } from '../../data/store';
import { EventComposer } from '../../features/agenda/event-composer';
import { weekLine } from '../../features/agenda/entries';
import { DayTimeline, MonthGrid, WeekBar, WeekList } from '../../features/agenda/views';
import { categoryColors, space } from '../../theme/tokens';

type Mode = 'day' | 'week' | 'month';

/**
 * Agenda: work, personal and shared calendars in one place, with the tasks
 * that have a time and the nights Sol is on alert. Day, week and month.
 */
export default function Agenda() {
  const { state, dispatch } = useStore();
  const [mode, setMode] = useState<Mode>('day');
  const [day, setDay] = useState(todayKey());
  const [composer, setComposer] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = todayKey();
  const d = fromKey(day);
  const week = weekOf(day);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar
          overline={`${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`}
          title="Agenda"
          actions={
            <>
              {day !== today ? <Button small kind="secondary" label="Hoy" onPress={() => setDay(today)} /> : null}
              <IconButton icon={Plus} label="Nuevo evento" onPress={() => setComposer(true)} size={40} />
            </>
          }
        />

        <View style={{ gap: space.md }}>
          <Segmented options={[{ id: 'day', label: 'Día' }, { id: 'week', label: 'Semana' }, { id: 'month', label: 'Mes' }]} value={mode} onChange={setMode} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipScroll}>
            {state.calendars.map((c) => (
              <Chip key={c.id} label={c.name} dot={c.visible ? categoryColors[c.color] : undefined} selected={c.visible}
                onPress={() => { tap(); dispatch({ type: 'toggleCalendar', id: c.id }); }} />
            ))}
          </ScrollView>
        </View>

        {mode === 'day' ? (
          <>
            <WeekBar selected={day} onSelect={setDay} />
            <Section title={day === today ? `Hoy, ${longDate(d).split(' ').slice(1).join(' ')}` : cap(longDate(d))}>
              <DayTimeline day={day} now={now} />
            </Section>
          </>
        ) : null}

        {mode === 'week' ? (
          <Section title={week[0] <= today && today <= week[6] ? 'Esta semana' : `Semana del ${fromKey(week[0]).getDate()} de ${MONTHS[fromKey(week[0]).getMonth()]}`}>
            <T v="callout" tone="muted" style={{ marginTop: -space.sm }}>{weekLine(state, week)}</T>
            <WeekBar selected={day} onSelect={setDay} />
            <WeekList days={week} onPick={(k) => { setDay(k); setMode('day'); }} />
          </Section>
        ) : null}

        {mode === 'month' ? (
          <>
            <MonthGrid selected={day} onSelect={setDay} />
            <Section title={cap(dayLabel(day))}>
              <DayTimeline day={day} now={now} />
            </Section>
          </>
        ) : null}
      </Screen>
      <EventComposer visible={composer} onClose={() => setComposer(false)} day={day} />
    </View>
  );
}

const s = StyleSheet.create({
  chipScroll: { marginHorizontal: -space.xl },
  chips: { gap: space.sm, paddingHorizontal: space.xl },
});
