import { ArrowUpRight } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/theme';
import { font, radius, space } from '../theme/tokens';
import { T } from './ui';

/** "solsets ↗" wordmark, as in Amaru's prototype. */
export function Wordmark({ size = 24 }: { size?: number }) {
  const { p } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityRole="header" accessibilityLabel="Solsets">
      <T v="h2" style={{ fontFamily: font.semibold, fontSize: size, lineHeight: size * 1.15, letterSpacing: -size * 0.055 }}>solsets</T>
      <ArrowUpRight size={size * 0.95} color={p.accent} strokeWidth={2.4} />
    </View>
  );
}

const ARROW = 'M2 10 L10 2 M4.5 2 H10 V7.5';

/**
 * Field of small ↗ arrows: Amaru's signature texture ("suelta", let go).
 * Static on purpose: nothing animates forever.
 */
export function ArrowField({ color, opacity = 0.18, cell = 22, rows, cols }: { color: string; opacity?: number; cell?: number; rows?: number; cols?: number }) {
  // Fill whatever box it is in: rows and columns come from the measured size unless given.
  const [box, setBox] = useState({ w: 0, h: 0 });
  const r = rows ?? Math.ceil(box.h / cell);
  const c = cols ?? Math.ceil(box.w / cell);
  const items: [number, number][] = [];
  for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) items.push([x * cell + 6, y * cell + 6]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <G opacity={opacity}>
        {items.map(([x, y], i) => (
          <Path key={i} d={ARROW} transform={`translate(${x} ${y})`} stroke={color} strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </G>
    </Svg>
    </View>
  );
}

/** The blue hero card. In night mode it becomes deep blue and quieter. */
export function Hero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { p } = useTheme();
  return (
    <View style={[styles.hero, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={p.hero[0]} />
            <Stop offset="1" stopColor={p.hero[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hero)" />
      </Svg>
      <ArrowField color={p.onHero} opacity={p.scheme === 'night' ? 0.06 : 0.13} />
      <View style={{ gap: space.md }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, borderCurve: 'continuous', padding: space.xxl, overflow: 'hidden', gap: space.md },
});
