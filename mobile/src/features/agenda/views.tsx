import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, MapPin, MoonStar, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle, T, tap } from '../../components/ui';
import { addDays, cap, dayLabel, fromKey, keyOf, monthGrid, todayKey, weekOf, WEEKDAY_LETTER, WEEKDAYS_SHORT } from '../../data/dates';
import { categoryById } from '../../data/select';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';
import { dayDots, dayPlan, type Entry } from './entries';

// Week bar -------------------------------------------------------------------------

/** Seven days, Monday first, with arrows to move by week and colored dots per day. */
export function WeekBar({ selected, onSelect }: { selected: string; onSelect: (k: string) => void }) {
  const { p } = useTheme();
  const { state } = useStore();
  const days = weekOf(selected);
  const today = todayKey();
  const move = (n: number) => { tap(); onSelect(addDays(selected, n * 7)); };
  return (
    <View style={s.weekWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Semana anterior" onPress={() => move(-1)} hitSlop={8} style={s.arrow}>
        <ChevronLeft size={18} color={p.muted} />
      </Pressable>
      <View style={s.week}>
        {days.map((k) => {
          const d = fromKey(k);
          const on = k === selected;
          const isToday = k === today;
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${dayLabel(k)} ${d.getDate()}`} accessibilityState={{ selected: on }}
              onPress={() => { tap(); onSelect(k); }} style={[s.day, on && { backgroundColor: p.ink }]}>
              <T v="micro" style={{ color: on ? p.bg : p.faint }}>{WEEKDAY_LETTER[d.getDay()]}</T>
              <T v="bodyStrong" style={{ color: on ? p.bg : isToday ? p.sol : p.ink, fontVariant: ['tabular-nums'] }}>{d.getDate()}</T>
              <View style={s.dots}>
                {dayDots(state, k).map((c) => <View key={c} style={[s.dot, { backgroundColor: on ? p.bg : c }]} />)}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Semana siguiente" onPress={() => move(1)} hitSlop={8} style={s.arrow}>
        <ChevronRight size={18} color={p.muted} />
      </Pressable>
    </View>
  );
}

// Day ------------------------------------------------------------------------------

function EntryRow({ entry, last, now }: { entry: Entry; last: boolean; now: Date }) {
  const { p } = useTheme();
  const { state, toggleTask } = useStore();
  const isNow = entry.kind === 'event' && new Date(entry.event.start) <= now && new Date(entry.event.end) > now;
  const node = entry.kind === 'event' ? entry.color : entry.kind === 'night' ? p.sol : categoryColors[categoryById(state, entry.task.categoryId)?.color ?? 'gray'];
  return (
    <View style={s.row}>
      <View style={s.timeCol}>
        <T v="calloutStrong" tone={isNow ? 'sol' : 'ink'} style={{ fontVariant: ['tabular-nums'] }}>{entry.time}</T>
        {'end' in entry ? <T v="caption" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>{entry.end}</T> : null}
      </View>
      <View style={s.rail}>
        <View style={[s.node, { backgroundColor: entry.kind === 'task' ? p.bg : node, borderColor: entry.kind === 'task' ? node : p.bg }]} />
        {!last ? <View style={[s.line, { backgroundColor: p.line }]} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : space.md }}>
        {entry.kind === 'event' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${entry.event.title}, ${entry.time} a ${entry.end}`} onPress={() => { tap(); router.push(`/evento/${entry.event.id}`); }}
            style={({ pressed }) => [s.block, { backgroundColor: `${entry.color}14`, borderLeftColor: entry.color }, pressed && { opacity: 0.7 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>{entry.event.title}</T>
              {isNow ? <T v="captionStrong" tone="sol">Ahora</T> : null}
            </View>
            {entry.event.place ? (
              <View style={s.inline}><MapPin size={13} color={p.muted} /><T v="callout" tone="muted" numberOfLines={1}>{entry.event.place}</T></View>
            ) : null}
            {entry.event.attendees?.length ? (
              <View style={s.inline}><Users size={13} color={p.faint} /><T v="caption" tone="faint" numberOfLines={1}>{entry.event.attendees.join(', ')}</T></View>
            ) : null}
            {entry.note ? <T v="caption" tone="faint">{entry.note}</T> : null}
          </Pressable>
        ) : entry.kind === 'night' ? (
          <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/perfil/noche'); }} style={[s.block, { backgroundColor: `${p.sol}14`, borderLeftColor: p.sol }]}>
            <View style={s.inline}><MoonStar size={15} color={p.sol} /><T v="bodyStrong">Avisos nocturnos</T></View>
            <T v="caption" tone="muted">{entry.because}</T>
          </Pressable>
        ) : (
          <View style={s.task}>
            <CheckCircle done={entry.task.done} onPress={() => toggleTask(entry.task.id)} color={node} label={entry.task.title} />
            <Pressable accessibilityRole="button" style={{ flex: 1 }} onPress={() => { tap(); router.push(`/tarea/${entry.task.id}`); }}>
              <T v="body" tone={entry.task.done ? 'faint' : 'ink'} style={entry.task.done && { textDecorationLine: 'line-through' }}>{entry.task.title}</T>
              <T v="caption" tone="faint">Tarea</T>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

/** The selected day: all-day things on top, then a timeline, then tasks without a time. */
export function DayTimeline({ day, now }: { day: string; now: Date }) {
  const { p } = useTheme();
  const { state, toggleTask } = useStore();
  const plan = dayPlan(state, day);
  const empty = !plan.allDay.length && !plan.timed.length && !plan.untimed.length;
  if (empty) {
    return (
      <View style={[s.empty, { backgroundColor: p.card, borderColor: p.line }]}>
        <T v="bodyStrong">Día libre</T>
        <T v="callout" tone="muted">No hay nada agendado. Toca + para agregar un evento.</T>
      </View>
    );
  }
  return (
    <View style={{ gap: space.lg }}>
      {plan.allDay.map(({ event, color, note }) => (
        <Pressable key={event.id} onPress={() => { tap(); router.push(`/evento/${event.id}`); }} style={[s.allDay, { backgroundColor: `${color}1C` }]} accessibilityRole="button">
          <View style={[s.dot, { backgroundColor: color, width: 8, height: 8, borderRadius: 4 }]} />
          <T v="calloutStrong" style={{ flex: 1 }} numberOfLines={1}>{event.title}</T>
          <T v="caption" tone="muted">{note ?? 'Todo el día'}</T>
        </Pressable>
      ))}
      {plan.timed.length ? <View>{plan.timed.map((e, i) => <EntryRow key={e.id} entry={e} last={i === plan.timed.length - 1} now={now} />)}</View> : null}
      {plan.untimed.length ? (
        <View style={{ gap: space.sm }}>
          <T v="captionStrong" tone="faint">Tareas para este día</T>
          <View style={[s.taskList, { backgroundColor: p.card, borderColor: p.line }]}>
            {plan.untimed.map((t, i) => {
              const c = categoryById(state, t.categoryId);
              return (
                <View key={t.id} style={[s.task, { paddingHorizontal: space.lg }, i < plan.untimed.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
                  <CheckCircle done={t.done} onPress={() => toggleTask(t.id)} color={c ? categoryColors[c.color] : p.ink} label={t.title} />
                  <Pressable accessibilityRole="button" style={{ flex: 1 }} onPress={() => { tap(); router.push(`/tarea/${t.id}`); }}>
                    <T v="body" tone={t.done ? 'faint' : 'ink'} style={t.done && { textDecorationLine: 'line-through' }}>{t.title}</T>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Week -----------------------------------------------------------------------------

/** The week as a list, one block per day: a quick read of what is coming. */
export function WeekList({ days, onPick }: { days: string[]; onPick: (k: string) => void }) {
  const { p } = useTheme();
  const { state } = useStore();
  return (
    <View style={{ gap: space.sm }}>
      {days.map((k) => {
        const plan = dayPlan(state, k);
        const n = plan.timed.length + plan.allDay.length + plan.untimed.length;
        const d = fromKey(k);
        const isToday = k === todayKey();
        return (
          <Pressable key={k} accessibilityRole="button" onPress={() => { tap(); onPick(k); }}
            style={({ pressed }) => [s.weekDay, { backgroundColor: p.card, borderColor: isToday ? p.glassHi : p.line }, pressed && { opacity: 0.7 }]}>
            <View style={s.weekDate}>
              <T v="captionStrong" tone={isToday ? 'sol' : 'faint'}>{cap(WEEKDAYS_SHORT[d.getDay()])}</T>
              <T v="h2" tone={isToday ? 'sol' : 'ink'} style={{ fontVariant: ['tabular-nums'] }}>{d.getDate()}</T>
            </View>
            <View style={{ flex: 1, gap: 6, paddingVertical: 2 }}>
              {n === 0 ? <T v="callout" tone="faint">Libre</T> : null}
              {plan.allDay.map((a) => (
                <View key={a.event.id} style={s.inline}><View style={[s.bar, { backgroundColor: a.color }]} /><T v="callout" numberOfLines={1} style={{ flex: 1 }}>{a.event.title}</T></View>
              ))}
              {plan.timed.slice(0, 4).map((e) => (
                <View key={e.id} style={s.inline}>
                  <T v="caption" tone="faint" style={{ width: 40, fontVariant: ['tabular-nums'] }}>{e.time}</T>
                  <View style={[s.bar, { backgroundColor: e.kind === 'event' ? e.color : e.kind === 'night' ? p.sol : p.faint }]} />
                  <T v="callout" numberOfLines={1} style={{ flex: 1 }} tone={e.kind === 'task' ? 'muted' : 'ink'}>{e.kind === 'event' ? e.event.title : e.kind === 'night' ? 'Avisos nocturnos' : e.task.title}</T>
                </View>
              ))}
              {plan.timed.length > 4 ? <T v="caption" tone="faint">{`y ${plan.timed.length - 4} más`}</T> : null}
              {plan.untimed.length ? <T v="caption" tone="faint">{`${plan.untimed.length} ${plan.untimed.length === 1 ? 'tarea' : 'tareas'} sin hora`}</T> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// Month ----------------------------------------------------------------------------

export function MonthGrid({ selected, onSelect }: { selected: string; onSelect: (k: string) => void }) {
  const { p } = useTheme();
  const { state } = useStore();
  const base = fromKey(selected);
  const days = monthGrid(base.getFullYear(), base.getMonth());
  const today = todayKey();
  const move = (n: number) => { tap(); onSelect(keyOf(new Date(base.getFullYear(), base.getMonth() + n, 1))); };
  return (
    <View style={[s.month, { backgroundColor: p.card, borderColor: p.line }]}>
      <View style={s.monthHead}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => move(-1)} hitSlop={8} style={s.arrow}><ChevronLeft size={18} color={p.muted} /></Pressable>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => move(1)} hitSlop={8} style={s.arrow}><ChevronRight size={18} color={p.muted} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => <T key={d} v="captionStrong" tone="faint" style={s.cellHead}>{WEEKDAY_LETTER[d]}</T>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((k) => {
          const d = fromKey(k);
          const inMonth = d.getMonth() === base.getMonth();
          const on = k === selected;
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${d.getDate()}`} accessibilityState={{ selected: on }} onPress={() => { tap(); onSelect(k); }} style={s.cell}>
              <View style={[s.cellDay, on && { backgroundColor: p.ink }, !on && k === today && { borderWidth: 1.5, borderColor: p.sol }]}>
                <T v={on ? 'bodyStrong' : 'body'} style={{ color: on ? p.bg : k === today ? p.sol : inMonth ? p.ink : p.faint, fontVariant: ['tabular-nums'] }}>{d.getDate()}</T>
              </View>
              <View style={s.dots}>{inMonth ? dayDots(state, k).map((c) => <View key={c} style={[s.dot, { backgroundColor: c }]} />) : null}</View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  weekWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -space.sm },
  week: { flex: 1, flexDirection: 'row', gap: 2 },
  arrow: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, borderRadius: radius.md, borderCurve: 'continuous' },
  dots: { flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  row: { flexDirection: 'row', gap: space.md },
  timeCol: { width: 46, alignItems: 'flex-end', paddingTop: space.md },
  rail: { width: 12, alignItems: 'center' },
  node: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, marginTop: space.md + 4 },
  line: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  block: { borderRadius: radius.md, borderCurve: 'continuous', borderLeftWidth: 3, paddingHorizontal: space.md, paddingVertical: space.md, gap: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  taskList: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  allDay: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 42 },
  empty: { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, gap: space.xs },
  weekDay: { flexDirection: 'row', gap: space.lg, borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  weekDate: { width: 40, alignItems: 'center' },
  bar: { width: 3, height: 16, borderRadius: 2 },
  month: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, gap: space.xs },
  monthHead: { flexDirection: 'row', alignItems: 'center', marginTop: -space.xs },
  cellHead: { width: `${100 / 7}%`, textAlign: 'center' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, gap: 2 },
  cellDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
