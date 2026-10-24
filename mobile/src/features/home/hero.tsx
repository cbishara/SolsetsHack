import { router } from 'expo-router';
import { Check, CircleAlert, Mic } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { SolOrb, type SolState } from '../../components/sol-orb';
import { Glass, T, tap } from '../../components/ui';
import { relative } from '../../data/dates';
import type { Connection } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

/**
 * Sol at the top of Inicio: the avatar, one status line built from real
 * counts, and every source with the last time Sol checked it. This is the
 * proof that someone is watching.
 */
export function SolStatus({ state, title, detail, connections }: { state: SolState; title: string; detail: string; connections: Connection[] }) {
  const { p } = useTheme();
  const shown = connections.filter((c) => c.status !== 'off');
  return (
    <View style={s.wrap}>
      <SolOrb size={112} state={state} />
      <View style={{ gap: space.xs, alignItems: 'center', marginTop: -space.lg }}>
        <T v="h2" style={{ textAlign: 'center' }} accessibilityRole="header">{title}</T>
        <T v="callout" tone="muted" style={{ textAlign: 'center', maxWidth: 320 }}>{detail}</T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Ver conexiones" onPress={() => { tap(); router.push('/perfil/conexiones'); }} style={s.sources}>
        {shown.map((c) => {
          const ok = c.status === 'connected';
          return (
            <Glass key={c.id} radius={radius.pill} style={s.source}>
              <View style={[s.check, { backgroundColor: ok ? p.calmSoft : p.urgentSoft }]}>
                {ok ? <Check size={10} color={p.calm} strokeWidth={3.4} /> : <CircleAlert size={11} color={p.urgent} strokeWidth={2.6} />}
              </View>
              <T v="captionStrong" numberOfLines={1}>{c.name}</T>
              <T v="caption" tone="faint" numberOfLines={1}>{ok ? relative(c.lastCheck ?? new Date().toISOString()) : 'Revisar'}</T>
            </Glass>
          );
        })}
      </Pressable>
    </View>
  );
}

/** "Pídele algo a Sol": the chat is one tap away, and the mic says you can talk. */
export function AskSol({ hint }: { hint: string }) {
  const { p } = useTheme();
  return (
    <Glass strong radius={radius.pill} style={s.ask}>
      <Pressable accessibilityRole="button" accessibilityLabel="Escribirle a Sol" onPress={() => { tap('light'); router.push('/sol'); }}
        style={({ pressed }) => [s.askText, pressed && { opacity: 0.7 }]}>
        <SolOrb size={18} state="watching" style={{ marginHorizontal: -8 }} />
        <T v="body" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{hint}</T>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Hablarle a Sol" onPress={() => { tap('success'); router.push({ pathname: '/sol', params: { voice: '1' } }); }}
        hitSlop={8} style={({ pressed }) => [s.mic, { backgroundColor: p.sol }, pressed && { opacity: 0.8 }]}>
        <Mic size={19} color={p.onSol} strokeWidth={2.4} />
      </Pressable>
    </Glass>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.lg, marginTop: -space.md },
  sources: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, height: 32 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ask: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: 6, height: 56, gap: space.sm },
  askText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, height: '100%' },
  mic: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
