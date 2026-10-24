import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { T, tap } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { motion, radius, size, space } from '../../theme/tokens';

const SPRING = { duration: motion.spring.snapBack.duration, dampingRatio: motion.spring.snapBack.dampingRatio };

/**
 * Voice control, "forma que cambia" (ADR oficial 2026-10-24-controles-de-voz-forma-que-cambia):
 * round at rest; while pressed, or while it is "on" (muted), it springs to a
 * soft square (radius.lg). Press scales to 0.97 in 120 ms; color changes in 200 ms.
 */
export function ShapeButton({ icon: Icon, label, onPress, on, tone = 'neutral', width = size.fab }: {
  icon: LucideIcon; label: string; onPress: () => void; on?: boolean; tone?: 'neutral' | 'end'; width?: number;
}) {
  const { p } = useTheme();
  const reduced = useReducedMotion();
  const [down, setDown] = useState(false);
  const square = useSharedValue(on ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const target = on || down ? 1 : 0;
    square.value = reduced ? target : withSpring(target, SPRING);
  }, [on, down, reduced, square]);

  const anim = useAnimatedStyle(() => ({
    borderRadius: (size.fab / 2) - square.value * (size.fab / 2 - radius.lg),
    transform: [{ scale: scale.value }],
  }));

  const bg = tone === 'end' ? p.urgentSoft : on ? p.accent : p.surface;
  const fg = tone === 'end' ? p.urgent : on ? p.onAccent : p.ink;

  return (
    <View style={s.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={on !== undefined ? { selected: on } : undefined}
        onPressIn={() => { setDown(true); scale.value = reduced ? 1 : withTiming(motion.pressScale, { duration: motion.fast }); }}
        onPressOut={() => { setDown(false); scale.value = withTiming(1, { duration: motion.fast }); }}
        onPress={() => { tap(tone === 'end' ? 'warning' : 'light'); onPress(); }}
        hitSlop={8}
      >
        <Animated.View style={[s.button, { width, height: size.fab, backgroundColor: bg, borderColor: tone === 'end' || on ? 'transparent' : p.line }, anim,
          { transitionProperty: 'backgroundColor', transitionDuration: motion.base }]}>
          <Icon size={24} color={fg} strokeWidth={2.2} />
        </Animated.View>
      </Pressable>
      <T v="caption" tone="muted">{label}</T>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, minWidth: 72 },
  button: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
