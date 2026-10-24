import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { Calendar, ChevronRight, Mail, MessageCircle, Mic, PenLine, Sun } from 'lucide-react-native';
import { useId, useState, type ReactNode } from 'react';
import {
  Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View,
  type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { SourceId } from '../data/types';
import { useTheme } from '../theme/theme';
import { bottomInset, motion, radius, size, space, type, type TypeVariant } from '../theme/tokens';

export const tap = (kind: 'select' | 'light' | 'success' = 'select') => {
  if (Platform.OS === 'web') return;
  if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else void Haptics.selectionAsync();
};

// Text ---------------------------------------------------------------------

type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'urgent' | 'calm' | 'sol' | 'onHero' | 'onHeroMuted' | 'onAccent' | 'onSol';

export function T({ v = 'body', tone = 'ink', style, children, ...rest }: TextProps & { v?: TypeVariant; tone?: Tone; style?: StyleProp<TextStyle>; children: ReactNode }) {
  const { p } = useTheme();
  return (
    <Text {...rest} style={[type[v] as TextStyle, { color: p[tone] }, style]} maxFontSizeMultiplier={1.6}>
      {children}
    </Text>
  );
}

// Layout -------------------------------------------------------------------

export type Glow = 'neutral' | 'sol' | 'calm' | 'urgent' | 'none';

/**
 * Ambient light at the top of a screen, so black never reads as flat. Very
 * faint and static, as in Opal: color is reserved for what the screen is about.
 */
export function GlowBackdrop({ glow = 'neutral', height = 460 }: { glow?: Glow; height?: number }) {
  const { p } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ''); // SVG ids are global on web
  if (glow === 'none') return null;
  const color = { neutral: p.glow, sol: p.sol, calm: p.calm, urgent: p.urgent }[glow];
  const strength = (glow === 'neutral' ? 0.16 : 0.13) * (p.scheme === 'night' ? 0.75 : 1);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`glow${uid}`} cx="50%" cy="0%" rx="85%" ry="100%">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="0.55" stopColor={color} stopOpacity={strength * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#glow${uid})`} />
      </Svg>
    </View>
  );
}

/**
 * Base screen. Leaves room for the floating tab bar, keeps the reading width
 * comfortable on large phones and the web preview, and lights the top faintly.
 */
export function Screen({ children, scroll = true, edges = ['top'], padBottom = true, glow = 'neutral', style }: {
  children: ReactNode; scroll?: boolean; edges?: Edge[]; padBottom?: boolean; glow?: Glow; style?: StyleProp<ViewStyle>;
}) {
  const { p } = useTheme();
  const content = [s.page, padBottom && { paddingBottom: bottomInset + space.xl }, style];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={edges}>
      <GlowBackdrop glow={glow} />
      {scroll ? (
        <ScrollView contentContainerStyle={content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Stack({ gap = 'md', children, style }: { gap?: keyof typeof space; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: space[gap] }, style]}>{children}</View>;
}

export function RowView({ gap = 'md', children, style }: { gap?: keyof typeof space; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space[gap] }, style]}>{children}</View>;
}

/** Eyebrow + title + optional action, the section header used across the app. */
export function Section({ eyebrow, title, action, onAction, children, style }: {
  eyebrow?: string; title?: string; action?: string; onAction?: () => void; children?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: space.md }, style]}>
      {(eyebrow || title || action) && (
        <View style={s.sectionHead}>
          <View style={{ flex: 1, gap: 2 }}>
            {eyebrow ? <T v="eyebrow" tone="muted">{eyebrow}</T> : null}
            {title ? <T v="h2" accessibilityRole="header">{title}</T> : null}
          </View>
          {action && onAction ? <LinkButton label={action} onPress={onAction} /> : null}
        </View>
      )}
      {children}
    </View>
  );
}

// Press --------------------------------------------------------------------

const PRESS_EASE = cubicBezier(...motion.easeOut);

/**
 * Pressable that scales to 0.97 the moment a finger lands and back on release,
 * on the UI thread (Reanimated CSS transition). Use it for anything button-like.
 * Full-width list rows highlight instead: a scaling row reads as the screen squishing.
 */
export function PressScale({ children, style, disabled, scaleTo = motion.pressScale, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number;
}) {
  const [down, setDown] = useState(false);
  const reduced = useReducedMotion();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={20}
      onPressIn={(e) => { setDown(true); rest.onPressIn?.(e); }}
      onPressOut={(e) => { setDown(false); rest.onPressOut?.(e); }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: down && !reduced ? scaleTo : 1 }],
            opacity: down && reduced ? 0.7 : 1,
            transitionProperty: ['transform', 'opacity'],
            transitionDuration: motion.fast,
            transitionTimingFunction: PRESS_EASE,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Surfaces -----------------------------------------------------------------

export function Card({ children, style, onPress, tone = 'card', accessibilityLabel }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'card' | 'surface' | 'accentSoft' | 'urgentSoft' | 'calmSoft'; accessibilityLabel?: string;
}) {
  const { p } = useTheme();
  const base = [s.card, { backgroundColor: p[tone], borderColor: tone === 'card' ? p.line : 'transparent' }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => { tap(); onPress(); }} scaleTo={0.985} style={base}>
      {children}
    </PressScale>
  );
}

/** Grouped list container with hairline separators (rows add their own). */
export function List({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { p } = useTheme();
  return <View style={[s.list, { backgroundColor: p.card, borderColor: p.line }, style]}>{children}</View>;
}

export function ListRow({ title, detail, value, icon: Icon, iconTone = 'accent', right, onPress, last, accessibilityLabel }: {
  title: string; detail?: string; value?: string; icon?: LucideIcon; iconTone?: Tone; right?: ReactNode; onPress?: () => void; last?: boolean; accessibilityLabel?: string;
}) {
  const { p } = useTheme();
  const body = (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      {Icon ? (
        <View style={[s.rowIcon, { backgroundColor: p.surface }]}><Icon size={18} color={p[iconTone]} strokeWidth={2.2} /></View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body">{title}</T>
        {detail ? <T v="callout" tone="muted">{detail}</T> : null}
      </View>
      {value ? <T v="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>{value}</T> : null}
      {right}
      {onPress ? <ChevronRight size={18} color={p.faint} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ backgroundColor: pressed ? p.accentSoft : 'transparent' })}>
      {body}
    </Pressable>
  ) : body;
}

export function ToggleRow({ title, detail, value, onChange, last }: { title: string; detail?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  const { p } = useTheme();
  return (
    <ListRow
      title={title}
      detail={detail}
      last={last}
      right={<Switch value={value} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: p.calm, false: p.surface }} ios_backgroundColor={p.surface} accessibilityLabel={title} />}
    />
  );
}

// Buttons ------------------------------------------------------------------

type ButtonKind = 'primary' | 'sol' | 'secondary' | 'ghost' | 'danger';

export function Button({ label, onPress, kind = 'primary', icon: Icon, style, disabled, accessibilityLabel }: {
  label: string; onPress: () => void; kind?: ButtonKind; icon?: LucideIcon; style?: StyleProp<ViewStyle>; disabled?: boolean; accessibilityLabel?: string;
}) {
  const { p } = useTheme();
  const look = {
    primary: { bg: p.accent, fg: p.onAccent, border: 'transparent' },
    sol: { bg: p.sol, fg: p.onSol, border: 'transparent' },
    secondary: { bg: p.surface, fg: p.ink, border: p.line },
    ghost: { bg: 'transparent', fg: p.muted, border: 'transparent' },
    danger: { bg: p.urgentSoft, fg: p.urgent, border: 'transparent' },
  }[kind];
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => { tap('light'); onPress(); }}
      style={[s.button, { backgroundColor: look.bg, borderColor: look.border }, disabled && { opacity: 0.4 }, style]}
    >
      {Icon ? <Icon size={20} color={look.fg} strokeWidth={2.2} /> : null}
      <T v="bodyStrong" style={{ color: look.fg }}>{label}</T>
    </PressScale>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <T v="calloutStrong" tone="accent">{label}</T>
    </Pressable>
  );
}

export function IconButton({ icon: Icon, label, onPress, tone = 'ink' }: { icon: LucideIcon; label: string; onPress: () => void; tone?: Tone }) {
  const { p } = useTheme();
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={() => { tap(); onPress(); }} hitSlop={8} scaleTo={0.92}
      style={[s.iconButton, { backgroundColor: p.surface, borderColor: p.line }]}>
      <Icon size={20} color={p[tone]} strokeWidth={2} />
    </PressScale>
  );
}

export function Chip({ label, selected, onPress, tone = 'accent', icon: Icon }: { label: string; selected?: boolean; onPress: () => void; tone?: 'accent' | 'urgent' | 'calm'; icon?: LucideIcon }) {
  const { p } = useTheme();
  // Selected accent chips go solid white, the way Opal marks a choice.
  const on = { accent: [p.accent, p.onAccent, p.accent], urgent: [p.urgentSoft, p.urgent, p.urgent], calm: [p.calmSoft, p.calm, p.calm] }[tone];
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => { tap(); onPress(); }}
      hitSlop={4}
      style={[
        s.chip,
        { backgroundColor: selected ? on[0] : p.surface, borderColor: selected ? on[2] : p.line },
        { transitionProperty: ['backgroundColor', 'borderColor'], transitionDuration: motion.base } as ViewStyle,
      ]}
    >
      {Icon ? <Icon size={16} color={selected ? on[1] : p.muted} /> : null}
      <T v="calloutStrong" style={{ color: selected ? on[1] : p.ink }}>{label}</T>
    </PressScale>
  );
}

// Small parts --------------------------------------------------------------

const SOURCE: Record<SourceId, { icon: LucideIcon; label: string }> = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  email: { icon: Mail, label: 'Correo' },
  calendar: { icon: Calendar, label: 'Calendario' },
  voice: { icon: Mic, label: 'Audio' },
  you: { icon: PenLine, label: 'Tú' },
  sol: { icon: Sun, label: 'Sol' },
};

/** Where something came from. Trust starts with knowing the origin. */
export function SourceTag({ source, label }: { source: SourceId; label?: string }) {
  const { p } = useTheme();
  const { icon: Icon, label: fallback } = SOURCE[source];
  return (
    <View style={s.source} accessibilityLabel={`Origen: ${label ?? fallback}`}>
      <Icon size={13} color={p.muted} strokeWidth={2.2} />
      <T v="caption" tone="muted" numberOfLines={1}>{label ?? fallback}</T>
    </View>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'urgent' | 'calm' | 'neutral' }) {
  const { p } = useTheme();
  const c = { accent: [p.accentSoft, p.ink], urgent: [p.urgentSoft, p.urgent], calm: [p.calmSoft, p.calm], neutral: [p.surface, p.muted] }[tone];
  return (
    <View style={[s.badge, { backgroundColor: c[0] }]}>
      <T v="caption" style={{ color: c[1] }}>{label}</T>
    </View>
  );
}

export function Progress({ value, tone = 'accent', height = 6 }: { value: number; tone?: 'accent' | 'calm' | 'sol'; height?: number }) {
  const { p } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: p.surface, overflow: 'hidden' }}
      accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: p[tone] }} />
    </View>
  );
}

export function Divider() {
  const { p } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.line }} />;
}

export const s = StyleSheet.create({
  page: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.xxxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  card: { borderRadius: radius.lg, borderCurve: 'continuous', padding: space.xl, gap: space.md, borderWidth: 1 },
  list: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md + 2, minHeight: size.target + 8 },
  rowIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 54, borderRadius: radius.pill, paddingHorizontal: space.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderWidth: 1 },
  iconButton: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  chip: { minHeight: 40, borderRadius: radius.pill, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, borderWidth: 1 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 3 },
});
