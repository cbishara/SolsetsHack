import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useStore } from '../data/store';
import { useTheme } from '../theme/theme';
import { space } from '../theme/tokens';
import { Avatar, T, tap } from './ui';

/**
 * Top of every tab: a large title (or a greeting) on the left, actions and the
 * person's avatar on the right. The avatar opens profile and settings, where
 * people expect them.
 */
export function TopBar({ title, overline, actions }: { title: string; overline?: string; actions?: ReactNode }) {
  return (
    <View style={s.bar}>
      <View style={{ flex: 1, gap: 2 }}>
        {overline ? <T v="calloutStrong" tone="muted" numberOfLines={1}>{overline}</T> : null}
        <T v="largeTitle" accessibilityRole="header" numberOfLines={2}>{title}</T>
      </View>
      <View style={s.actions}>
        {actions}
        <ProfileButton />
      </View>
    </View>
  );
}

export function ProfileButton() {
  const { p } = useTheme();
  const { state } = useStore();
  const pending = state.questions.some((q) => !q.answer) || state.connections.some((c) => c.status === 'needs_attention');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Perfil y ajustes" hitSlop={8}
      onPress={() => { tap(); router.push('/perfil'); }} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Avatar name={state.profile.fullName ?? state.profile.name} size={40} />
      {pending ? <View style={[s.dot, { backgroundColor: p.sol, borderColor: p.bg }]} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginBottom: -space.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: 2 },
  dot: { position: 'absolute', top: 0, right: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
