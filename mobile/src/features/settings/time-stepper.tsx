import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { T, tap } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';
import { shiftTime } from './format';

/** "Despertar 07:00 [-] [+]": half-hour steps, no extra packages. */
export function TimeStepper({ label, detail, value, onChange, last }: {
  label: string; detail?: string; value: string; onChange: (v: string) => void; last?: boolean;
}) {
  const { p } = useTheme();
  const step = (d: number) => { tap(); onChange(shiftTime(value, d)); };
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body">{label}</T>
        {detail ? <T v="callout" tone="muted">{detail}</T> : null}
      </View>
      <View style={s.controls} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 30 : -30)}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}, media hora antes`} onPress={() => step(-30)} hitSlop={6}
          style={({ pressed }) => [s.btn, { backgroundColor: p.surface, borderColor: p.line, opacity: pressed ? 0.6 : 1 }]}>
          <Minus size={18} color={p.ink} />
        </Pressable>
        <T v="bodyStrong" style={{ minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{value}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}, media hora después`} onPress={() => step(30)} hitSlop={6}
          style={({ pressed }) => [s.btn, { backgroundColor: p.surface, borderColor: p.line, opacity: pressed ? 0.6 : 1 }]}>
          <Plus size={18} color={p.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  btn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
