import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Phone, ShieldAlert, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowField } from '../components/brand';
import { T, tap } from '../components/ui';
import { useStore } from '../data/store';
import { hhmm } from '../features/digest/format';
import { alertPalette as a } from '../features/digest/palettes';
import { font, radius, space } from '../theme/tokens';

const CALL_AFTER = 180; // seconds: functionality 2, "Lo vi" or a phone call

// "Alerta imposible de perder", seen at 3 a.m. by someone half asleep:
// one fact, why it woke him, one huge action, and what happens if he doesn't act.
// Always night-styled, whatever the time: it must never flash white in the dark.
export default function Alerta() {
  const { lastNight, state } = useStore();
  const item = lastNight.find((i) => i.wouldWake) ?? lastNight[0];
  const rule = state.rules.find((r) => r.id === item.ruleId) ?? state.rules.find((r) => r.kind === 'wake' && r.confirmed);
  const [left, setLeft] = useState(CALL_AFTER);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    AccessibilityInfo.announceForAccessibility(`Urgente. ${item.text}.`);
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [item.text]);

  const ack = () => {
    tap('success');
    setSeen(true);
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 800);
  };

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const when = new Date(item.at);

  return (
    <View style={{ flex: 1, backgroundColor: a.bg }}>
      <StatusBar style="light" />
      <ArrowField color={a.urgent} opacity={0.05} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.top}>
          <T v="calloutStrong" style={{ color: a.muted }}>
            {when.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </T>
          <Text style={s.clock} accessibilityLabel={`Son las ${hhmm(item.at)}`}>{hhmm(item.at)}</Text>
        </View>

        <View style={[s.card, { backgroundColor: a.card, borderColor: a.urgentLine }]}>
          <View style={s.cardHead}>
            <View style={s.inline}>
              <View style={[s.mark, { backgroundColor: a.lime }]} />
              <T v="eyebrow" style={{ color: a.muted }}>Sol</T>
            </View>
            <View style={[s.pill, { backgroundColor: a.urgentSoft }]}>
              <TriangleAlert size={15} color={a.urgent} strokeWidth={2.6} />
              <T v="calloutStrong" style={{ color: a.urgent }}>Urgente</T>
            </View>
          </View>
          <T v="h2" style={{ color: a.ink }}>{item.text}</T>
          <T style={{ color: a.muted }}>{item.group ? `${item.from}, en ${item.group}` : item.from}</T>
          {rule ? (
            <View style={[s.why, { borderTopColor: a.line }]}>
              <ShieldAlert size={18} color={a.urgent} />
              <T v="callout" style={{ color: a.ink, flex: 1 }}>Te desperté por tu regla: {rule.text.toLowerCase()}.</T>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, minHeight: space.xxl }} />

        <View style={{ gap: space.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lo vi"
            onPress={ack}
            style={({ pressed }) => [s.seen, { backgroundColor: seen ? a.calm : a.lime, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Text style={s.seenText}>{seen ? 'Listo, quedó registrado' : 'Lo vi'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => { tap(); router.replace('/resumen/manana'); }}
            style={({ pressed }) => [s.secondary, { borderColor: a.line, opacity: pressed ? 0.7 : 1 }]}
          >
            <T v="bodyStrong" style={{ color: a.ink }}>Abrir el detalle</T>
          </Pressable>
          <View style={s.inline} accessibilityLiveRegion="polite">
            <Phone size={18} color={a.muted} />
            <T v="callout" style={{ color: a.muted, flex: 1 }}>
              {seen ? 'No te voy a llamar.' : left > 0 ? `Si no tocas “Lo vi”, te llamo en ${mm}:${ss} y repito la llamada.` : 'Te estoy llamando.'}
            </T>
          </View>
          <T v="caption" style={{ color: a.faint, textAlign: 'center' }}>Vista previa de la alerta · datos de ejemplo</T>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  top: { alignItems: 'center', marginTop: space.xxl, marginBottom: space.xxl, gap: space.xs },
  clock: { fontFamily: font.semibold, fontSize: 92, lineHeight: 98, letterSpacing: -4, color: a.ink, fontVariant: ['tabular-nums'] },
  card: { borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, padding: space.xl, gap: space.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mark: { width: 14, height: 14, borderRadius: 7 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radius.pill },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: space.xs },
  seen: { minHeight: 76, borderRadius: radius.xl, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  seenText: { fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: a.onLime },
  secondary: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
