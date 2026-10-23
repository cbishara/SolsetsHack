import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { T, tap } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

/** A large radio option: title, plain-language consequence, selected ring. */
export function ChoiceCard({ title, detail, selected, onPress, icon: Icon }: {
  title: string; detail: string; selected: boolean; onPress: () => void; icon?: LucideIcon;
}) {
  const { p } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: selected ? p.accentSoft : p.card, borderColor: selected ? p.accent : p.line },
        pressed && { opacity: 0.85 },
      ]}
    >
      {Icon ? <Icon size={22} color={selected ? p.accent : p.muted} strokeWidth={2.2} /> : null}
      <View style={{ flex: 1, gap: 4 }}>
        <T v="bodyStrong">{title}</T>
        <T v="callout" tone="muted">{detail}</T>
      </View>
      <View style={[s.radio, { borderColor: selected ? p.accent : p.faint }]}>
        {selected ? <View style={[s.dot, { backgroundColor: p.accent }]} /> : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1.5 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
