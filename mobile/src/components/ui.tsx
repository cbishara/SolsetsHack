import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import {
  AlertTriangle, Briefcase, Calendar, Check, ChevronRight, GraduationCap, Heart, Home, Info, Mail, MessageCircle, Mic, Package,
  PenLine, Receipt, Repeat, Shield, Sun, Users, VolumeX, Wrench,
} from 'lucide-react-native';
import { useId, useState, type ReactNode } from 'react';
import {
  Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Animated, { cubicBezier, Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { CategoryIcon as CategoryIconName, SourceId } from '../data/types';
import { useTheme } from '../theme/theme';
import { bottomInset, categoryColors, motion, radius, size, space, type, type CategoryColor, type TypeVariant } from '../theme/tokens';

export const tap = (kind: 'select' | 'light' | 'success' | 'warning' = 'select') => {
  if (Platform.OS === 'web') return;
  if (kind === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (kind === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else void Haptics.selectionAsync();
};

// Text ---------------------------------------------------------------------

export type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'urgent' | 'calm' | 'sol' | 'solHi' | 'onHero' | 'onHeroMuted' | 'onAccent' | 'onSol';

export function T({ v = 'body', tone = 'ink', style, children, ...rest }: TextProps & { v?: TypeVariant; tone?: Tone; style?: StyleProp<TextStyle>; children: ReactNode }) {
  const { p } = useTheme();
  return (
    <Text {...rest} style={[type[v] as TextStyle, { color: p[tone] }, style]} maxFontSizeMultiplier={1.4}>
      {children}
    </Text>
  );
}

// Measured fills -------------------------------------------------------------
// SVG sized in percent is resolved once on iOS and does not follow the view
// when its content grows (that was the "cut" card). Backgrounds measure their
// box and draw at that exact size instead.

function useBox() {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - box.w) > 0.5 || Math.abs(height - box.h) > 0.5) setBox({ w: width, h: height });
  };
  return { box, onLayout };
}

/** A radial light, drawn to the exact size of its parent. */
export function Light({ color, cx = '50%', cy = '0%', rx = '85%', ry = '100%', strength = 0.16, mid = 0.35, style }: {
  color: string; cx?: string; cy?: string; rx?: string; ry?: string; strength?: number; mid?: number; style?: StyleProp<ViewStyle>;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { box, onLayout } = useBox();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} onLayout={onLayout}>
      {box.w > 0 ? (
        <Svg width={box.w} height={box.h}>
          <Defs>
            <RadialGradient id={`l${uid}`} cx={cx} cy={cy} rx={rx} ry={ry}>
              <Stop offset="0" stopColor={color} stopOpacity={strength} />
              <Stop offset="0.55" stopColor={color} stopOpacity={strength * mid} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={box.w} height={box.h} fill={`url(#l${uid})`} />
        </Svg>
      ) : null}
    </View>
  );
}

// Layout -------------------------------------------------------------------

export type Glow = 'neutral' | 'sol' | 'solStrong' | 'calm' | 'urgent' | 'none';

/**
 * Ambient light at the top of a screen, so black never reads as flat.
 * Screens where Sol is present get Sol's warm light; the rest stay neutral.
 */
export function GlowBackdrop({ glow = 'neutral', height = 520 }: { glow?: Glow; height?: number }) {
  const { p } = useTheme();
  if (glow === 'none') return null;
  const dim = p.scheme === 'night' ? 0.7 : 1;
  if (glow === 'sol' || glow === 'solStrong') {
    const k = glow === 'solStrong' ? 1 : 0.62;
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: height * (glow === 'solStrong' ? 1.25 : 1) }]}>
        <Light color={p.solDeep} cx="50%" cy="0%" rx="95%" ry="90%" strength={0.55 * k * dim} mid={0.4} />
        <Light color={p.sol} cx="62%" cy="6%" rx="55%" ry="42%" strength={0.34 * k * dim} mid={0.3} />
      </View>
    );
  }
  const color = { neutral: p.glow, calm: p.calm, urgent: p.urgent }[glow];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]}>
      <Light color={color} strength={(glow === 'neutral' ? 0.15 : 0.16) * dim} />
    </View>
  );
}

/**
 * Base screen. Leaves room for the floating tab bar, keeps the reading width
 * comfortable on large phones and the web preview, and lights the top faintly.
 */
export function Screen({ children, scroll = true, edges = ['top'], padBottom = true, glow = 'neutral', style, header }: {
  children: ReactNode; scroll?: boolean; edges?: Edge[]; padBottom?: boolean; glow?: Glow; style?: StyleProp<ViewStyle>; header?: ReactNode;
}) {
  const { p } = useTheme();
  const content = [s.page, padBottom && { paddingBottom: bottomInset + space.xl }, style];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={edges}>
      <GlowBackdrop glow={glow} />
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
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

/** Section header: a sentence-case title, an optional count and action. No all-caps labels. */
export function Section({ eyebrow, title, count, action, onAction, children, style }: {
  eyebrow?: string; title?: string; count?: number; action?: string; onAction?: () => void; children?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const heading = title ?? eyebrow;
  return (
    <View style={[{ gap: space.md }, style]}>
      {(heading || action) && (
        <View style={s.sectionHead}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
            {heading ? <T v={title ? 'h3' : 'eyebrow'} tone={title ? 'ink' : 'muted'} accessibilityRole="header">{heading}</T> : null}
            {count !== undefined ? <T v="calloutStrong" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>{count}</T> : null}
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
  // Layout props (flex, width, margins) belong to the outer pressable so a button can share a row.
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (/^(flex|flexGrow|flexShrink|flexBasis|alignSelf|width|minWidth|maxWidth|margin.*|position|top|left|right|bottom)$/.test(k)) outer[k] = v;
    else inner[k] = v;
  }
  if (outer.width !== undefined || outer.flex !== undefined || outer.flexGrow !== undefined) inner.flexGrow = 1;
  return (
    <Pressable
      {...rest}
      style={outer as ViewStyle}
      disabled={disabled}
      pressRetentionOffset={20}
      onPressIn={(e) => { setDown(true); rest.onPressIn?.(e); }}
      onPressOut={(e) => { setDown(false); rest.onPressOut?.(e); }}
    >
      <Animated.View
        style={[
          inner as ViewStyle,
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

/**
 * Frosted glass: a blur of whatever is behind, a translucent fill, a 1 px edge
 * and a faint highlight on the top edge. For things that float over Sol's light.
 */
export function Glass({ children, style, strong, radius: r = radius.lg, intensity = 36 }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean; radius?: number; intensity?: number;
}) {
  const { p } = useTheme();
  return (
    <View style={[{ borderRadius: r, borderCurve: 'continuous', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: p.glassLine }, style]}>
      <BlurView intensity={Platform.OS === 'android' ? 0 : intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: strong ? p.glassStrong : p.glass }]} />
      <View pointerEvents="none" style={[s.glassHi, { backgroundColor: p.glassHi }]} />
      {children}
    </View>
  );
}

export function Card({ children, style, onPress, tone = 'card', accessibilityLabel, glass }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'card' | 'surface' | 'accentSoft' | 'urgentSoft' | 'calmSoft';
  accessibilityLabel?: string; glass?: boolean;
}) {
  const { p } = useTheme();
  const inner = [s.card, !glass && { backgroundColor: p[tone], borderColor: tone === 'card' ? p.line : 'transparent', borderWidth: 1 }, style];
  const body = glass ? <Glass style={inner}>{children}</Glass> : <View style={inner}>{children}</View>;
  if (!onPress) return body;
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => { tap(); onPress(); }} scaleTo={0.985}>
      {body}
    </PressScale>
  );
}

/** Grouped list container with hairline separators (rows add their own). */
export function List({ children, style, glass }: { children: ReactNode; style?: StyleProp<ViewStyle>; glass?: boolean }) {
  const { p } = useTheme();
  if (glass) return <Glass style={[{ overflow: 'hidden' }, style]}>{children}</Glass>;
  return <View style={[s.list, { backgroundColor: p.card, borderColor: p.line }, style]}>{children}</View>;
}

export function ListRow({ title, detail, value, icon: Icon, iconTone = 'ink', iconColor, leading, right, onPress, last, accessibilityLabel, titleTone, numberOfLines }: {
  title: string; detail?: string; value?: string; icon?: LucideIcon; iconTone?: Tone; iconColor?: string; leading?: ReactNode; right?: ReactNode;
  onPress?: () => void; last?: boolean; accessibilityLabel?: string; titleTone?: Tone; numberOfLines?: number;
}) {
  const { p } = useTheme();
  const body = (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      {leading}
      {Icon && !leading ? <IconTile icon={Icon} color={iconColor ?? p[iconTone]} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body" tone={titleTone} numberOfLines={numberOfLines}>{title}</T>
        {detail ? <T v="callout" tone="muted">{detail}</T> : null}
      </View>
      {value ? <T v="callout" tone="muted" style={{ fontVariant: ['tabular-nums'], maxWidth: '45%', textAlign: 'right' }} numberOfLines={1}>{value}</T> : null}
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

export function ToggleRow({ title, detail, value, onChange, last, icon, iconColor }: {
  title: string; detail?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean; icon?: LucideIcon; iconColor?: string;
}) {
  const { p } = useTheme();
  return (
    <ListRow
      title={title}
      detail={detail}
      last={last}
      icon={icon}
      iconColor={iconColor}
      right={<Switch value={value} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: p.calm, false: p.surface }} ios_backgroundColor={p.surface} accessibilityLabel={title} />}
    />
  );
}

/** Radio-style choice row: a check on the right when chosen. */
export function OptionRow({ title, detail, selected, onPress, last, leading }: {
  title: string; detail?: string; selected: boolean; onPress: () => void; last?: boolean; leading?: ReactNode;
}) {
  const { p } = useTheme();
  return (
    <ListRow
      title={title}
      detail={detail}
      last={last}
      leading={leading}
      onPress={undefined}
      right={
        <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={title} onPress={() => { tap(); onPress(); }}
          hitSlop={{ left: 400, top: 14, bottom: 14, right: 12 }} style={{ width: 24, alignItems: 'center' }}>
          {selected ? <Check size={20} color={p.sol} strokeWidth={2.6} /> : null}
        </Pressable>
      }
    />
  );
}

/** A small rounded tile holding an icon, Settings style. */
export function IconTile({ icon: Icon, color, size: box = 32, filled }: { icon: LucideIcon; color: string; size?: number; filled?: boolean }) {
  return (
    <View style={{ width: box, height: box, borderRadius: box * 0.3, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? color : `${color}26` }}>
      <Icon size={box * 0.56} color={filled ? '#000' : color} strokeWidth={2.1} />
    </View>
  );
}

// Buttons ------------------------------------------------------------------

type ButtonKind = 'primary' | 'sol' | 'secondary' | 'ghost' | 'danger' | 'glass';

export function Button({ label, onPress, kind = 'primary', icon: Icon, style, disabled, accessibilityLabel, small, onLongPress }: {
  label: string; onPress: () => void; kind?: ButtonKind; icon?: LucideIcon; style?: StyleProp<ViewStyle>; disabled?: boolean;
  accessibilityLabel?: string; small?: boolean; onLongPress?: () => void;
}) {
  const { p } = useTheme();
  const look = {
    primary: { bg: p.accent, fg: p.onAccent, border: 'transparent' },
    sol: { bg: p.sol, fg: p.onSol, border: 'transparent' },
    secondary: { bg: p.surface, fg: p.ink, border: p.line },
    glass: { bg: p.glass, fg: p.ink, border: p.glassLine },
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
      onLongPress={onLongPress}
      style={[s.button, small && s.buttonSmall, { backgroundColor: look.bg, borderColor: look.border }, disabled && { opacity: 0.4 }, style]}
    >
      {Icon ? <Icon size={small ? 17 : 20} color={look.fg} strokeWidth={2.2} /> : null}
      <T v={small ? 'calloutStrong' : 'bodyStrong'} style={{ color: look.fg }} numberOfLines={1}>{label}</T>
    </PressScale>
  );
}

export function LinkButton({ label, onPress, tone = 'muted' }: { label: string; onPress: () => void; tone?: Tone }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); onPress(); }} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <T v="calloutStrong" tone={tone}>{label}</T>
    </Pressable>
  );
}

export function IconButton({ icon: Icon, label, onPress, tone = 'ink', glass, size: box = 44, badge }: {
  icon: LucideIcon; label: string; onPress: () => void; tone?: Tone; glass?: boolean; size?: number; badge?: boolean;
}) {
  const { p } = useTheme();
  const inner = (
    <>
      <Icon size={box * 0.45} color={p[tone]} strokeWidth={2} />
      {badge ? <View style={[s.dotBadge, { backgroundColor: p.sol, borderColor: p.bg }]} /> : null}
    </>
  );
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={() => { tap(); onPress(); }} hitSlop={8} scaleTo={0.92}>
      {glass ? (
        <Glass radius={box / 2} style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>{inner}</Glass>
      ) : (
        <View style={[s.iconButton, { width: box, height: box, backgroundColor: p.surface, borderColor: p.line }]}>{inner}</View>
      )}
    </PressScale>
  );
}

export function Chip({ label, selected, onPress, tone = 'accent', icon: Icon, dot, count }: {
  label: string; selected?: boolean; onPress: () => void; tone?: 'accent' | 'urgent' | 'calm' | 'sol'; icon?: LucideIcon; dot?: string; count?: number;
}) {
  const { p } = useTheme();
  // Selected accent chips go solid white, the way Opal marks a choice.
  const on = {
    accent: [p.accent, p.onAccent, p.accent],
    urgent: [p.urgentSoft, p.urgent, p.urgent],
    calm: [p.calmSoft, p.calm, p.calm],
    sol: [p.sol, p.onSol, p.sol],
  }[tone];
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
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
      {Icon ? <Icon size={16} color={selected ? on[1] : p.muted} /> : null}
      <T v="calloutStrong" style={{ color: selected ? on[1] : p.ink }} numberOfLines={1}>{label}</T>
      {count !== undefined ? <T v="calloutStrong" style={{ color: selected ? on[1] : p.faint, fontVariant: ['tabular-nums'] }}>{count}</T> : null}
    </PressScale>
  );
}

/** Segmented control: two to four peers. */
export function Segmented<K extends string>({ options, value, onChange, style }: {
  options: { id: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void; style?: StyleProp<ViewStyle>;
}) {
  const { p } = useTheme();
  return (
    <View style={[s.segmented, { backgroundColor: p.surface, borderColor: p.line }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { if (!on) { tap(); onChange(o.id); } }}
            style={[s.segment, on && { backgroundColor: p.accentSoft, borderColor: p.glassLine, borderWidth: StyleSheet.hairlineWidth }]}>
            <T v="calloutStrong" tone={on ? 'ink' : 'muted'} numberOfLines={1}>{o.label}</T>
            {o.count ? <T v="captionStrong" tone={on ? 'sol' : 'faint'}>{o.count}</T> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// Inputs -------------------------------------------------------------------

export function Field({ style, ...rest }: TextInputProps & { style?: StyleProp<TextStyle> }) {
  const { p } = useTheme();
  return (
    <TextInput
      placeholderTextColor={p.faint}
      selectionColor={p.sol}
      {...rest}
      style={[s.field, { color: p.ink, borderColor: p.line, backgroundColor: p.surface }, rest.multiline && { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' }, style]}
    />
  );
}

// Sheet ----------------------------------------------------------------------

/**
 * Bottom sheet for pickers and quick actions inside a screen. Dims what is
 * behind and slides up; tap outside or swipe the screen to close.
 */
export function Sheet({ visible, onClose, title, children, action }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; action?: { label: string; onPress: () => void; disabled?: boolean };
}) {
  const { p } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: p.overlay }]}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar" />
          </Animated.View>
          <Animated.View entering={SlideInDown.duration(280).easing(Easing.bezier(...motion.easeOut))} exiting={SlideOutDown.duration(200)}
            style={[s.sheet, { backgroundColor: p.glassStrong, borderColor: p.glassLine, paddingBottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
            <BlurView intensity={Platform.OS === 'android' ? 0 : 50} tint="dark" style={[StyleSheet.absoluteFill, { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]} />
            <View style={[s.grabber, { backgroundColor: p.faint }]} />
            {title || action ? (
              <View style={s.sheetHead}>
                <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button"><T v="body" tone="muted">{action ? 'Cancelar' : 'Cerrar'}</T></Pressable>
                <T v="bodyStrong" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>{title ?? ''}</T>
                {action ? (
                  <Pressable onPress={() => { tap('light'); action.onPress(); }} disabled={action.disabled} hitSlop={12} accessibilityRole="button">
                    <T v="bodyStrong" tone="sol" style={action.disabled && { opacity: 0.4 }}>{action.label}</T>
                  </Pressable>
                ) : <View style={{ width: 52 }} />}
              </View>
            ) : null}
            <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.xl, paddingBottom: space.sm }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

// Small parts --------------------------------------------------------------

const SOURCE: Record<SourceId, { icon: LucideIcon; label: string }> = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  email: { icon: Mail, label: 'Correo' },
  calendar: { icon: Calendar, label: 'Calendario' },
  voice: { icon: Mic, label: 'Nota de voz' },
  you: { icon: PenLine, label: 'Tú' },
  sol: { icon: Sun, label: 'Sol' },
};

export const sourceIcon = (s: SourceId) => SOURCE[s].icon;
export const sourceName = (s: SourceId) => SOURCE[s].label;

/** Where something came from. Trust starts with knowing the origin. */
export function SourceTag({ source, label }: { source: SourceId; label?: string }) {
  const { p } = useTheme();
  const { icon: Icon, label: fallback } = SOURCE[source];
  return (
    <View style={s.source} accessibilityLabel={`Origen: ${label ?? fallback}`}>
      <Icon size={13} color={p.muted} strokeWidth={2.2} />
      <T v="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{label ?? fallback}</T>
    </View>
  );
}

export const CATEGORY_ICONS: Record<CategoryIconName, LucideIcon> = {
  alert: AlertTriangle, wrench: Wrench, calendar: Calendar, users: Users, receipt: Receipt, home: Home, info: Info, mute: VolumeX,
  briefcase: Briefcase, heart: Heart, package: Package, shield: Shield, repeat: Repeat, graduation: GraduationCap,
};

export const catColor = (c?: CategoryColor | null) => categoryColors[c ?? 'gray'];

/** A category, as a colored dot and its name. The only place categories bring color. */
export function CategoryTag({ name, color, small }: { name: string; color: CategoryColor; small?: boolean }) {
  const c = categoryColors[color];
  return (
    <View style={[s.catTag, { backgroundColor: `${c}1F` }, small && { paddingVertical: 2, paddingHorizontal: 7 }]} accessibilityLabel={`Categoría: ${name}`}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
      <T v="captionStrong" style={{ color: c }} numberOfLines={1}>{name}</T>
    </View>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'urgent' | 'calm' | 'neutral' | 'sol' }) {
  const { p } = useTheme();
  const c = {
    accent: [p.accentSoft, p.ink], urgent: [p.urgentSoft, p.urgent], calm: [p.calmSoft, p.calm], neutral: [p.surface, p.muted], sol: [`${p.sol}24`, p.sol],
  }[tone];
  return (
    <View style={[s.badge, { backgroundColor: c[0] }]}>
      <T v="captionStrong" style={{ color: c[1] }} numberOfLines={1}>{label}</T>
    </View>
  );
}

/** Person or source avatar: initials on a tinted circle. */
export function Avatar({ name, size: box = 40, color, ring }: { name: string; size?: number; color?: string; ring?: boolean }) {
  const { p } = useTheme();
  const initials = name.split(/\s+/).filter((w) => /^[\p{L}]/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
  const tint = color ?? p.muted;
  return (
    <View style={{
      width: box, height: box, borderRadius: box / 2, alignItems: 'center', justifyContent: 'center',
      backgroundColor: color ? `${tint}2E` : p.surface, borderWidth: ring ? 1.5 : StyleSheet.hairlineWidth, borderColor: ring ? p.sol : p.line,
    }}>
      <T v="captionStrong" style={{ color: color ? tint : p.ink, fontSize: Math.round(box * 0.34), lineHeight: Math.round(box * 0.44), letterSpacing: 0.2 }} maxFontSizeMultiplier={1}>{initials}</T>
    </View>
  );
}

/** Round check: done, or not. Big target, small mark. */
export function CheckCircle({ done, onPress, color, label }: { done: boolean; onPress: () => void; color?: string; label: string }) {
  const { p } = useTheme();
  const c = color ?? p.ink;
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label} hitSlop={12}
      onPress={() => { tap(done ? 'select' : 'success'); onPress(); }}
      style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.8, borderColor: done ? c : p.faint, backgroundColor: done ? c : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {done ? <Check size={14} color={p.bg} strokeWidth={3} /> : null}
    </Pressable>
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

export function Divider({ inset = 0 }: { inset?: number }) {
  const { p } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.line, marginLeft: inset }} />;
}

/** A big number with its label underneath. */
export function Stat({ value, label, tone = 'ink' }: { value: string | number; label: string; tone?: Tone }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="title" tone={tone} style={{ fontVariant: ['tabular-nums'] }}>{value}</T>
      <T v="caption" tone="muted">{label}</T>
    </View>
  );
}

export function EmptyState({ icon: Icon, title, detail, action }: { icon: LucideIcon; title: string; detail?: string; action?: ReactNode }) {
  const { p } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl, paddingHorizontal: space.xl }}>
      <Icon size={28} color={p.faint} strokeWidth={1.8} />
      <T v="bodyStrong" style={{ textAlign: 'center' }}>{title}</T>
      {detail ? <T v="callout" tone="muted" style={{ textAlign: 'center' }}>{detail}</T> : null}
      {action}
    </View>
  );
}

export const s = StyleSheet.create({
  page: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.xxxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  card: { borderRadius: radius.lg, borderCurve: 'continuous', padding: space.xl, gap: space.md },
  glassHi: { position: 'absolute', top: 0, left: 16, right: 16, height: StyleSheet.hairlineWidth },
  list: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: size.target + 6 },
  button: { minHeight: 54, borderRadius: radius.pill, paddingHorizontal: space.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderWidth: 1 },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.lg },
  iconButton: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  dotBadge: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  chip: { minHeight: 38, borderRadius: radius.pill, paddingHorizontal: space.md + 2, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, borderWidth: 1 },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, padding: 3, borderWidth: StyleSheet.hairlineWidth },
  segment: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: space.sm },
  field: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, minHeight: 50, fontFamily: 'InterTight_400Regular', fontSize: 17 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', maxWidth: '100%' },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 3 },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden', gap: space.md },
  grabber: { width: 38, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: space.sm, opacity: 0.5 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, gap: space.md, minHeight: 36 },
});
