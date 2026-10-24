import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { T, tap } from '../../components/ui';
import { cap, fromKey, keyOf, monthGrid, MONTHS, WEEKDAY_LETTER } from '../../data/dates';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

/**
 * Inline month calendar, Monday first, like the date picker in Reminders.
 * Dots mark days that already have something.
 */
export function DateCalendar({ value, onChange, marked }: { value?: string; onChange: (key: string) => void; marked?: Set<string> }) {
  const { p } = useTheme();
  const base = value ? fromKey(value) : new Date();
  const [month, setMonth] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const today = keyOf(new Date());
  const days = monthGrid(month.y, month.m);
  const shift = (n: number) => {
    tap();
    const d = new Date(month.y, month.m + n, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((i) => WEEKDAY_LETTER[i]);

  return (
    <View style={{ gap: space.sm }}>
      <View style={s.head}>
        <T v="bodyStrong" style={{ flex: 1 }}>{`${cap(MONTHS[month.m])} ${month.y}`}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => shift(-1)} hitSlop={10} style={s.arrow}>
          <ChevronLeft size={20} color={p.sol} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => shift(1)} hitSlop={10} style={s.arrow}>
          <ChevronRight size={20} color={p.sol} />
        </Pressable>
      </View>
      <View style={s.week}>
        {weekdays.map((w, i) => <T key={i} v="captionStrong" tone="faint" style={s.cellText}>{w}</T>)}
      </View>
      <View style={s.grid}>
        {days.map((k) => {
          const d = fromKey(k);
          const inMonth = d.getMonth() === month.m;
          const selected = k === value;
          const isToday = k === today;
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${d.getDate()} de ${MONTHS[d.getMonth()]}`} accessibilityState={{ selected }}
              onPress={() => { tap(); onChange(k); }} style={s.cell}>
              <View style={[s.day, selected && { backgroundColor: p.sol }, !selected && isToday && { borderColor: p.sol, borderWidth: 1.5 }]}>
                <T v={selected || isToday ? 'bodyStrong' : 'body'} style={{ color: selected ? p.onSol : isToday ? p.sol : inMonth ? p.ink : p.faint, fontVariant: ['tabular-nums'] }}>
                  {d.getDate()}
                </T>
              </View>
              <View style={[s.mark, { backgroundColor: marked?.has(k) && !selected ? p.muted : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ROW = 40;

/** A scroll wheel that snaps to rows. Works with a finger, a trackpad or a mouse wheel. */
function Wheel({ values, value, onChange, label, width = 72 }: { values: string[]; value: string; onChange: (v: string) => void; label: string; width?: number }) {
  const { p } = useTheme();
  const ref = useRef<ScrollViewInstance>(null);
  const index = Math.max(0, values.indexOf(value));
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ROW, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ROW)));
    if (values[i] !== value) { tap(); onChange(values[i]); }
  };
  return (
    <View style={{ width, height: ROW * 5 }} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = e.nativeEvent.actionName === 'increment' ? index + 1 : index - 1;
        if (values[next]) { onChange(values[next]); ref.current?.scrollTo({ y: next * ROW }); }
      }}>
      <ScrollView ref={ref} showsVerticalScrollIndicator={false} snapToInterval={ROW} decelerationRate="fast"
        onMomentumScrollEnd={settle} onScrollEndDrag={(e) => { if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) settle(e); }}
        contentContainerStyle={{ paddingVertical: ROW * 2 }} nestedScrollEnabled>
        {values.map((v) => (
          <Pressable key={v} onPress={() => { tap(); onChange(v); ref.current?.scrollTo({ y: values.indexOf(v) * ROW }); }} style={{ height: ROW, alignItems: 'center', justifyContent: 'center' }}>
            <T v={v === value ? 'h2' : 'body'} tone={v === value ? 'ink' : 'faint'} style={{ fontVariant: ['tabular-nums'] }}>{v}</T>
          </Pressable>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={[s.band, { borderColor: p.line, backgroundColor: p.accentSoft }]} />
    </View>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** Hour and minute wheels, five-minute steps. */
export function TimeWheel({ value, onChange }: { value: string; onChange: (hhmm: string) => void }) {
  const [h, m] = value.split(':');
  const mm = MINUTES.includes(m) ? m : MINUTES[Math.round(Number(m) / 5) % 12];
  return (
    <View style={s.wheels}>
      <Wheel values={HOURS} value={h} onChange={(nh) => onChange(`${nh}:${mm}`)} label="Hora" />
      <T v="h2" tone="muted">:</T>
      <Wheel values={MINUTES} value={mm} onChange={(nm) => onChange(`${h}:${nm}`)} label="Minutos" />
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 4 },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  cellText: { width: `${100 / 7}%`, textAlign: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  band: { position: 'absolute', left: 0, right: 0, top: ROW * 2, height: ROW, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
});
