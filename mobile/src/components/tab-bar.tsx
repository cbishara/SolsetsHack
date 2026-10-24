import { router, type Tabs } from 'expo-router';
import { CalendarDays, House, Inbox, ListChecks, type LucideIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../data/store';
import { toReview } from '../data/select';
import { useTheme } from '../theme/theme';
import { radius, size, space } from '../theme/tokens';
import { SolOrb } from './sol-orb';
import { PressScale, tap, T } from './ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'index', label: 'Inicio', icon: House },
  { name: 'bandeja', label: 'Bandeja', icon: Inbox },
  { name: 'tareas', label: 'Tareas', icon: ListChecks },
  { name: 'agenda', label: 'Agenda', icon: CalendarDays },
];

export function TabBar({ state, navigateToTab }: TabBarProps) {
  const { p } = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const review = toReview(useStore().state).length;

  // Floating glass capsule, as in Opal. Tabs switch instantly: they are peers.
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom - space.xs, space.md) }]}>
      <View style={[styles.bar, { borderColor: p.line }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? p.tabBar : p.surface }]} />
        {TABS.map(({ name, label, icon: Icon }) => {
          const active = current === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                const route = state.routes.find((r) => r.name === name);
                if (route && !active) { tap(); navigateToTab(route.key); }
              }}
              style={[styles.tab, active && { backgroundColor: p.accentSoft }]}
            >
              <View>
                <Icon size={21} color={active ? p.ink : p.faint} strokeWidth={active ? 2.3 : 2} />
                {name === 'bandeja' && review ? <View style={[styles.badge, { backgroundColor: p.sol, borderColor: p.bg }]} accessibilityLabel={`${review} por revisar`} /> : null}
              </View>
              <T v="micro" style={{ color: active ? p.ink : p.faint }}>{label}</T>
            </Pressable>
          );
        })}
      </View>
      <SolButton />
    </View>
  );
}

/**
 * Sol, the agent. Always one tap away, next to the tabs. Tap to talk or write;
 * hold to dictate right away: the lowest-friction way to drop a to-do.
 */
function SolButton() {
  const { p } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel="Hablar con Sol"
      accessibilityHint="Mantén presionado para dictar"
      onPress={() => { tap('light'); router.push('/sol'); }}
      onLongPress={() => { tap('success'); router.push({ pathname: '/sol', params: { voice: '1' } }); }}
      delayLongPress={300}
      scaleTo={0.92}
      style={[styles.fab, { borderColor: p.glassLine }]}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 40 : 0} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? p.tabBar : p.surface }]} />
      <SolOrb size={30} state="watching" />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  bar: {
    flex: 1, flexDirection: 'row', height: size.tabBar, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', padding: 5, gap: 2,
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.pill },
  badge: { position: 'absolute', top: -2, right: -5, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  fab: {
    width: size.tabBar, height: size.tabBar, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
});
