import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { keyOf, weekOf } from '../../components/week-strip';
import { T, tap } from '../../components/ui';
import type { Shift } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

const LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Week strip that pages by week. Same look as the shared WeekStrip, plus
 * arrows. A lime dot marks a night on call; a blue dot, that there is something.
 */
export function WeekPager({ anchor, onAnchor, selected, onSelect, shifts, busy }: {
  anchor: Date; onAnchor: (d: Date) => void; selected: string; onSelect: (key: string) => void;
  shifts: Shift[]; busy: Record<string, number>;
}) {
  const { p } = useTheme();
  const days = weekOf(anchor);
  const today = keyOf(new Date());
  const move = (weeks: number) => {
    tap();
    const next = new Date(anchor.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    onAnchor(next);
    const keys = weekOf(next).map(keyOf);
    onSelect(keys.includes(today) ? today : keys[0]);
  };
  const raw = days[3].toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const month = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <View style={{ gap: space.md }}>
      <View style={s.head}>
        <T v="h3">{month}</T>
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          <Arrow label="Semana anterior" onPress={() => move(-1)} icon="left" />
          <Arrow label="Semana siguiente" onPress={() => move(1)} icon="right" />
        </View>
      </View>
      <View style={s.row} accessibilityRole="tablist">
        {days.map((d) => {
          const key = keyOf(d);
          const isSel = key === selected;
          const shift = shifts.find((x) => x.date === key);
          const label = `${d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}${shift?.onCall ? ', guardia de noche' : ''}${busy[key] ? `, ${busy[key]} cosas` : ''}`;
          return (
            <Pressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isSel }}
              onPress={() => { tap(); onSelect(key); }} style={s.day} hitSlop={4}>
              <T v="caption" tone={isSel ? 'accent' : 'muted'}>{LETTERS[d.getDay()]}</T>
              <View style={[s.num, isSel && { backgroundColor: p.accent }, !isSel && key === today && { borderColor: p.accent, borderWidth: 1.5 }]}>
                <T v="bodyStrong" style={{ color: isSel ? p.onAccent : p.ink, fontVariant: ['tabular-nums'] }}>{d.getDate()}</T>
              </View>
              <View style={s.dots}>
                {shift?.onCall ? <View style={[s.dot, { backgroundColor: p.lime, borderWidth: p.scheme === 'day' ? 1 : 0, borderColor: '#B9C700' }]} /> : null}
                {busy[key] ? <View style={[s.dot, { backgroundColor: p.accent }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Arrow({ label, onPress, icon }: { label: string; onPress: () => void; icon: 'left' | 'right' }) {
  const { p } = useTheme();
  const Icon = icon === 'left' ? ChevronLeft : ChevronRight;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [s.arrow, { backgroundColor: p.surface, opacity: pressed ? 0.6 : 1 }]}>
      <Icon size={20} color={p.ink} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: space.xs + 2, minWidth: 44 },
  num: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  arrow: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
