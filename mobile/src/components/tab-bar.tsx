import { router, type Tabs } from 'expo-router';
import { CalendarDays, CircleUserRound, House, ListChecks, Sun, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { radius, size, space } from '../theme/tokens';
import { tap, T } from './ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'index', label: 'Hoy', icon: House },
  { name: 'tareas', label: 'Tareas', icon: ListChecks },
  { name: 'agenda', label: 'Agenda', icon: CalendarDays },
  { name: 'tu', label: 'Tú', icon: CircleUserRound },
];

export function TabBar({ state, navigateToTab }: TabBarProps) {
  const { p } = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  return (
    <View pointerEvents="box-none">
      <SolButton bottom={size.tabBar + Math.max(insets.bottom, space.sm) + space.md} />
      <View style={[styles.bar, { backgroundColor: p.tabBar, borderTopColor: p.line, paddingBottom: Math.max(insets.bottom, space.sm) }]}>
        {TABS.map(({ name, label, icon: Icon }) => {
          const active = current === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                tap();
                const route = state.routes.find((r) => r.name === name);
                if (route && !active) navigateToTab(route.key);
              }}
              style={styles.tab}
            >
              <View style={[styles.pill, active && { backgroundColor: p.accentSoft }]}>
                <Icon size={22} color={active ? p.accent : p.muted} strokeWidth={active ? 2.4 : 2} />
              </View>
              <T v="caption" style={{ color: active ? p.accent : p.muted }}>{label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Sol, the agent. Always one tap away, bottom right. Tap to talk or write;
 * hold to dictate right away: the lowest-friction way to drop a to-do.
 */
function SolButton({ bottom }: { bottom: number }) {
  const { p } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Hablar con Sol"
      accessibilityHint="Mantén presionado para dictar"
      onPress={() => { tap('light'); router.push('/sol'); }}
      onLongPress={() => { tap('success'); router.push({ pathname: '/sol', params: { voice: '1' } }); }}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.fab,
        { bottom, backgroundColor: p.lime, shadowColor: p.scheme === 'night' ? '#000' : '#1B3FB8' },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <Sun size={26} color={p.onLime} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: size.target },
  pill: { width: 56, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', right: space.xl, width: size.fab, height: size.fab, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
    shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
