import { Pressable, StyleSheet, View } from 'react-native';
import type { Shift } from '../data/types';
import { useTheme } from '../theme/theme';
import { radius, space } from '../theme/tokens';
import { T, tap } from './ui';

const LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DAY = 24 * 60 * 60 * 1000;

export const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Monday-first week around `anchor`. */
export function weekOf(anchor = new Date()): Date[] {
  const monday = new Date(anchor);
  monday.setHours(12, 0, 0, 0);
  monday.setTime(monday.getTime() - ((monday.getDay() + 6) % 7) * DAY);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY));
}

/**
 * The week at a glance (inspired by Structured). A dot marks a night on call;
 * the selected day is filled; today has a ring.
 */
export function WeekStrip({ selected, onSelect, shifts, busy = {} }: {
  selected: string; onSelect: (key: string) => void; shifts: Shift[]; busy?: Record<string, number>;
}) {
  const { p } = useTheme();
  const today = keyOf(new Date());
  return (
    <View style={s.row} accessibilityRole="tablist">
      {weekOf().map((d) => {
        const key = keyOf(d);
        const isSel = key === selected;
        const shift = shifts.find((x) => x.date === key);
        const label = `${d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' })}${shift?.onCall ? ', guardia de noche' : ''}${busy[key] ? `, ${busy[key]} cosas` : ''}`;
        return (
          <Pressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isSel }}
            onPress={() => { tap(); onSelect(key); }} style={s.day} hitSlop={4}>
            <T v="caption" tone={isSel ? 'accent' : 'muted'}>{LETTERS[d.getDay()]}</T>
            <View style={[s.num, isSel && { backgroundColor: p.accent }, !isSel && key === today && { borderColor: p.accent, borderWidth: 1.5 }]}>
              <T v="bodyStrong" style={{ color: isSel ? p.onAccent : p.ink, fontVariant: ['tabular-nums'] }}>{d.getDate()}</T>
            </View>
            <View style={s.dots}>
              {shift?.onCall ? <View style={[s.dot, { backgroundColor: p.lime, borderColor: p.scheme === 'day' ? '#C8D600' : 'transparent', borderWidth: p.scheme === 'day' ? 1 : 0 }]} /> : null}
              {busy[key] ? <View style={[s.dot, { backgroundColor: p.accent }]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: space.xs + 2, minWidth: 44 },
  num: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
