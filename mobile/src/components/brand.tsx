import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/theme';
import { font, radius, space } from '../theme/tokens';
import { T } from './ui';

/** "Soltra" wordmark: bold, tight, white. The name is the mark; no icon beside it. */
export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <View accessibilityRole="header" accessibilityLabel="Soltra">
      <T v="h2" style={{ fontFamily: font.bold, fontSize: size, lineHeight: size * 1.15, letterSpacing: -size * 0.045 }}>Soltra</T>
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

/**
 * The hero card: barely lifted off black, a hairline edge and a faint warm
 * light in the corner where Sol would be. Quieter still at night.
 */
export function Hero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { p } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''); // SVG ids are global on web
  return (
    <View style={[styles.hero, { borderColor: p.line }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`hero${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={p.hero[0]} />
            <Stop offset="1" stopColor={p.hero[1]} />
          </LinearGradient>
          <RadialGradient id={`heroLight${uid}`} cx="100%" cy="0%" rx="70%" ry="80%">
            <Stop offset="0" stopColor={p.sol} stopOpacity={p.scheme === 'night' ? 0.1 : 0.14} />
            <Stop offset="1" stopColor={p.sol} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#hero${uid})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#heroLight${uid})`} />
      </Svg>
      <View style={{ gap: space.md }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, borderCurve: 'continuous', padding: space.xxl, overflow: 'hidden', gap: space.md, borderWidth: StyleSheet.hairlineWidth },
});
