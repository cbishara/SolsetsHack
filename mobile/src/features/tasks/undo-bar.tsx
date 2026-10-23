import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { T, tap } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { radius, size, space } from '../../theme/tokens';

/** "Hecha · Deshacer" snackbar. Sits above the tab bar, left of the Sol button. */
export function UndoBar({ text, onUndo, onDismiss, ms = 4500 }: { text: string; onUndo: () => void; onDismiss: () => void; ms?: number }) {
  const { p } = useTheme();
  useEffect(() => {
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [text, onDismiss, ms]);
  return (
    <View style={[s.bar, { backgroundColor: p.ink }]} accessibilityLiveRegion="polite">
      <T v="calloutStrong" numberOfLines={1} style={{ color: p.bg, flex: 1 }}>{text}</T>
      <Pressable accessibilityRole="button" onPress={() => { tap(); onUndo(); }} hitSlop={10} style={s.action}>
        <T v="calloutStrong" style={{ color: p.scheme === 'day' ? p.lime : p.accent }}>Deshacer</T>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute', left: space.xl, right: space.xl + size.fab + space.md, bottom: space.lg,
    minHeight: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, gap: space.sm,
  },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg },
});
