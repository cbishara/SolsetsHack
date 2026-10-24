import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mic, MoonStar, Sun } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SolOrb } from '../components/sol-orb';
import { GlowBackdrop, T, tap } from '../components/ui';
import { cap, longDate, minutesOf, timeOf } from '../data/dates';
import { tonight } from '../data/select';
import { useStore } from '../data/store';
import { useTheme } from '../theme/theme';
import { font, radius, space } from '../theme/tokens';

/**
 * Modo noche: what the phone shows after "Cerrar el día". Almost no light, a
 * big clock, Sol resting, and only facts: whether night alerts are on, for
 * what, and what has arrived since the night started.
 */
export default function Noche() {
  const { p, setManual } = useTheme();
  const { state } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const t = tonight(state, now);
  const start = new Date(now);
  const from = minutesOf(state.nightAlerts.from);
  start.setHours(Math.floor(from / 60), from % 60, 0, 0);
  if (start > now) start.setDate(start.getDate() - 1);
  const since = state.items.filter((i) => new Date(i.receivedAt) >= start && new Date(i.receivedAt) <= now);
  const urgent = since.filter((i) => i.outcome.kind === 'alerted').length;
  const wakers = t.wakers.map((c) => c.name);

  const leave = () => {
    tap();
    setManual(null);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <GlowBackdrop glow="sol" height={520} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.top}>
          <T v="calloutStrong" tone="faint">{cap(longDate(now))}</T>
          <Text style={[s.clock, { color: p.ink }]} accessibilityLabel={`Son las ${timeOf(now.toISOString())}`}>{timeOf(now.toISOString())}</Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <SolOrb size={92} state="calm" style={{ opacity: 0.85 }} />
        </View>

        <View style={s.status}>
          <View style={s.inline}>
            <MoonStar size={18} color={t.on ? p.sol : p.faint} />
            <T v="bodyStrong" style={{ textAlign: 'center' }}>{t.on ? `Avisos activos hasta las ${t.to}` : 'Sin avisos esta noche'}</T>
          </View>
          <T v="callout" tone="muted" style={{ textAlign: 'center' }}>
            {t.on
              ? `Solo te aviso por ${wakers.join(' o ') || 'lo que marcaste como urgente'}. Si no estoy seguro de algo, también te aviso.`
              : `Lo que llegue queda ordenado para el resumen de las ${state.summaries.morning.at}.`}
          </T>
          <T v="caption" tone="faint" style={{ textAlign: 'center' }}>
            {since.length
              ? `Desde las ${state.nightAlerts.from} llegaron ${since.length} ${since.length === 1 ? 'mensaje' : 'mensajes'}${urgent ? `, ${urgent} urgente${urgent === 1 ? '' : 's'}` : ', ninguno urgente'}.`
              : `Desde las ${state.nightAlerts.from} no ha llegado nada.`}
          </T>
        </View>

        <View style={{ flex: 1 }} />

        <View style={s.actions}>
          <Pressable accessibilityRole="button" onPress={() => { tap('light'); router.push({ pathname: '/sol', params: { voice: '1' } }); }}
            style={({ pressed }) => [s.action, { borderColor: p.glassLine, backgroundColor: p.glass }, pressed && { opacity: 0.7 }]}>
            <Mic size={18} color={p.ink} />
            <T v="calloutStrong">Anotar algo</T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={leave} style={({ pressed }) => [s.action, { borderColor: 'transparent' }, pressed && { opacity: 0.7 }]}>
            <Sun size={18} color={p.muted} />
            <T v="calloutStrong" tone="muted">Salir del modo noche</T>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  top: { alignItems: 'center', marginTop: space.section, gap: space.xs, marginBottom: space.lg },
  clock: { fontFamily: font.bold, fontSize: 96, lineHeight: 102, letterSpacing: -4.5, fontVariant: ['tabular-nums'], opacity: 0.92 },
  status: { alignItems: 'center', gap: space.sm, marginTop: space.lg, paddingHorizontal: space.lg },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: space.md, flexWrap: 'wrap' },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
});
