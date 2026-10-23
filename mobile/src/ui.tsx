import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";

// Shared SOL tokens, following the Mi espacio reference.
export const colors = {
  bg: "#ffffff",
  card: "#ffffff",
  surface: "#f5f7fc",
  blueSoft: "#edf2ff",
  line: "#dfe4ee",
  inputLine: "#8992a5",
  ink: "#151b2e",
  muted: "#62677a",
  dim: "#62677a",
  accent: "#2e59e5",
  lime: "#e4f51a",
  mint: "#2e59e5",
  danger: "#a12d36",
  errorBg: "#fff1f2",
  white: "#ffffff",
  heroMuted: "#e3eaff",
};
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};
export const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  page: {
    padding: space.xl,
    paddingBottom: space.section,
    gap: space.xxl,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  spread: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.md,
    flexWrap: "wrap",
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1.2,
    lineHeight: 40,
  },
  h2: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  text: { color: colors.ink, fontSize: 17, lineHeight: 25 },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderCurve: "continuous",
    padding: space.xl,
    gap: space.lg,
    borderColor: colors.line,
    borderWidth: 1,
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.inputLine,
    borderWidth: 1,
    borderRadius: 12,
    padding: space.lg,
    color: colors.ink,
    fontSize: 17,
    minHeight: 52,
  },
  button: {
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.accent,
    minHeight: 48,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  secondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.inputLine,
  },
  secondaryText: { color: colors.ink },
  chip: {
    borderWidth: 1,
    borderColor: colors.inputLine,
    borderRadius: 24,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 48,
    justifyContent: "center",
  },
  selectedChip: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.accent,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  error: {
    padding: space.lg,
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    gap: space.sm,
  },
  rule: { height: 1, backgroundColor: colors.line },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});

type ButtonProps = {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: LucideIcon;
  variant?: "primary" | "lime" | "secondary" | "quiet" | "danger";
  accessibilityHint?: string;
};
export function Button({
  title,
  onPress,
  secondary,
  disabled,
  loading,
  style,
  icon: Icon,
  variant = secondary ? "secondary" : "primary",
  accessibilityHint,
}: ButtonProps) {
  const foreground =
    variant === "lime" || variant === "secondary"
      ? colors.ink
      : variant === "quiet"
        ? colors.accent
        : variant === "danger"
          ? colors.danger
          : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: !!disabled || !!loading,
        busy: !!loading,
      }}
      onPress={onPress}
      disabled={disabled || loading}
      pressRetentionOffset={16}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondary,
        variant === "lime" && { backgroundColor: colors.lime },
        (variant === "quiet" || variant === "danger") && {
          backgroundColor: "transparent",
        },
        { opacity: disabled || loading ? 0.5 : pressed ? 0.72 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : Icon ? (
        <Icon size={20} color={foreground} accessible={false} />
      ) : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}
export function IconButton({
  label,
  icon: Icon,
  onPress,
  disabled,
  color = colors.ink,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: pressed ? colors.blueSoft : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Icon size={22} color={color} accessible={false} />
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Chip({
  title,
  selected,
  onPress,
  disabled,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selectedChip,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={[styles.muted, { color: selected ? colors.accent : colors.ink }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Heading({
  kicker,
  title,
  description,
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={{ gap: space.sm }}>
      {kicker ? <Text style={styles.eyebrow}>{kicker}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
    </View>
  );
}
