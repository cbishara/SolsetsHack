import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

export const colors = {
  bg: "#141824",
  card: "#202636",
  line: "#343E53",
  ink: "#F4F0E9",
  muted: "#B5B8C9",
  dim: "#8D95AA",
  accent: "#F18A62",
  mint: "#91D1BB",
  danger: "#FFAFA4",
};
export const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  page: {
    padding: 22,
    paddingBottom: 32,
    gap: 20,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  spread: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "600",
    letterSpacing: -1.2,
    lineHeight: 41,
  },
  h2: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "600",
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  text: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  eyebrow: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderColor: colors.line,
    borderWidth: 1,
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    color: colors.ink,
    fontSize: 16,
    minHeight: 52,
  },
  button: {
    borderRadius: 16,
    backgroundColor: colors.accent,
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#261710",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryText: { color: colors.ink },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  selectedChip: { backgroundColor: "#31493F", borderColor: colors.mint },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: {
    padding: 14,
    backgroundColor: "#452C30",
    borderRadius: 14,
    marginHorizontal: 22,
    marginTop: 8,
  },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
});

export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        style,
        (pressed || disabled || loading) && { opacity: 0.55 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.ink : colors.bg} />
      ) : (
        <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
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
      style={[
        styles.chip,
        selected && styles.selectedChip,
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text style={styles.small}>{title}</Text>
    </Pressable>
  );
}
