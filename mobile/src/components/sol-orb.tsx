import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/theme';
import { motion } from '../theme/tokens';

/**
 * What Sol is doing, shown without words:
 * - calm: on guard, nothing needs you. Slow breath.
 * - watching: awake and reading what comes in (daytime). Steadier breath.
 * - waking: something needs you. Brighter, faster.
 * - shadow: shadow mode, it only shows what it would have done. Translucent.
 */
export type SolState = 'calm' | 'watching' | 'waking' | 'shadow';

const BREATH_EASE = cubicBezier(...motion.easeInOut);

const breathe = {
  '0%': { transform: [{ scale: 1 }] },
  '50%': { transform: [{ scale: 1.045 }] },
  '100%': { transform: [{ scale: 1 }] },
};

const halo = {
  '0%': { opacity: 0.55 },
  '50%': { opacity: 1 },
  '100%': { opacity: 0.55 },
};

/**
 * Sol, the agent, as a living light. Placeholder for the 3D avatar: when the
 * rendered loops arrive, they replace the inside of this component and every
 * screen keeps working. The loop is the point (state indication), so it is
 * slow and small; with Reduce Motion on, Sol holds still.
 */
export function SolOrb({ size = 120, state = 'calm', style }: { size?: number; state?: SolState; style?: StyleProp<ViewStyle> }) {
  const { p } = useTheme();
  const reduced = useReducedMotion();
  const core = state === 'waking' ? p.urgent : p.sol;
  const breath = state === 'waking' ? motion.breath.waking : state === 'watching' ? motion.breath.watching : motion.breath.calm;
  const loop = reduced
    ? null
    : { animationDuration: breath, animationIterationCount: 'infinite' as const, animationTimingFunction: BREATH_EASE };
  const box = size * 1.9; // room for the halo
  // SVG gradient ids are global on web: each orb needs its own.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <View
      style={[{ width: box, height: box, alignItems: 'center', justifyContent: 'center', opacity: state === 'shadow' ? 0.45 : 1 }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABEL[state]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, loop && { animationName: halo, ...loop }]} pointerEvents="none">
        <Svg width={box} height={box}>
          <Defs>
            <RadialGradient id={`halo${uid}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.3" stopColor={core} stopOpacity={state === 'waking' ? 0.5 : 0.36} />
              <Stop offset="0.62" stopColor={core} stopOpacity={0.1} />
              <Stop offset="1" stopColor={core} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={box / 2} cy={box / 2} r={box / 2} fill={`url(#halo${uid})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ width: size, height: size }, loop && { animationName: breathe, ...loop }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`core${uid}`} cx="44%" cy="40%" r="56%">
              {/* A light, not a ball: white-hot center, warm body, edge that melts into the halo. */}
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="0.28" stopColor="#FFF6E6" stopOpacity={1} />
              <Stop offset="0.62" stopColor={core} stopOpacity={0.95} />
              <Stop offset="1" stopColor={core} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#core${uid})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const LABEL: Record<SolState, string> = {
  calm: 'Sol está de guardia, todo tranquilo',
  watching: 'Sol está mirando lo que llega',
  waking: 'Sol te está despertando',
  shadow: 'Sol en modo sombra',
};
