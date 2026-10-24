import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Phone, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SolOrb } from '../components/sol-orb';
import { CategoryTag, GlowBackdrop, PressScale, T, tap } from '../components/ui';
import { cap, longDate, timeOf } from '../data/dates';
import { categoryById } from '../data/select';
import { useBackend } from '../api/backend';
import { useStore } from '../data/store';
import { alertPalette as a } from '../features/digest/palettes';
import { font, radius, space } from '../theme/tokens';

/**
 * The urgent alert, seen at 3 a.m. by someone half asleep: one fact, why it
 * woke them (the category they chose), the original, one huge action, and
 * what happens if they do not act. Always night-styled.
 */
export default function Alerta() {
  const { id, demo, alert: alertParam } = useLocalSearchParams<{ id?: string; demo?: string; alert?: string }>();
  const { state, dispatch } = useStore();
  const backend = useBackend();
  const item = state.items.find((i) => i.id === id)
    ?? state.items.find((i) => i.outcome.kind === 'alerted')
    ?? state.items[0];
  const category = categoryById(state, item?.categoryId);
  const callAfter = state.nightAlerts.call ? state.nightAlerts.callAfterMin * 60 : 0;
  const [left, setLeft] = useState(callAfter);
  const [seen, setSeen] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!item) return;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    AccessibilityInfo.announceForAccessibility(`Urgente. ${item.summary}.`);
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [item]);

  if (!item) return null;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const alertId = alertParam ?? item.alertId;
  const ack = async () => {
    if (sending) return;
    setFailed(false);
    // With a server alert, success shows only once server/ confirms; otherwise nothing escalates anyway.
    if (alertId && !demo) {
      setSending(true);
      try {
        await backend.alertSeen(alertId);
      } catch {
        setSending(false);
        setFailed(true);
        tap('warning');
        return;
      }
      setSending(false);
    }
    tap('success');
    setSeen(true);
    if (!demo) dispatch({ type: 'updateItem', id: item.id, patch: { read: true, outcome: { kind: 'alerted', seenAt: new Date().toISOString() } } });
    setTimeout(close, 800);
  };

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const when = demo ? new Date() : new Date(item.receivedAt);

  return (
    <View style={{ flex: 1, backgroundColor: a.bg }}>
      <StatusBar style="light" />
      <GlowBackdrop glow="urgent" height={560} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.top}>
          <T v="calloutStrong" style={{ color: a.muted }}>{cap(longDate(when))}</T>
          <Text style={s.clock} accessibilityLabel={`Son las ${timeOf(when.toISOString())}`}>{timeOf(when.toISOString())}</Text>
        </View>

        <View style={[s.card, { backgroundColor: a.card, borderColor: a.urgentLine }]}>
          <View style={s.cardHead}>
            <View style={s.inline}>
              <SolOrb size={14} state="waking" style={{ margin: -6 }} />
              <T v="captionStrong" style={{ color: a.muted }}>Sol</T>
            </View>
            <View style={[s.pill, { backgroundColor: a.urgentSoft }]}>
              <TriangleAlert size={15} color={a.urgent} strokeWidth={2.6} />
              <T v="calloutStrong" style={{ color: a.urgent }}>Urgente</T>
            </View>
          </View>
          <T v="h2" style={{ color: a.ink }}>{item.summary}</T>
          <T style={{ color: a.muted }}>{item.direct ? item.from.name : `${item.from.name}, en ${item.channel}`}</T>
          <View style={[s.quote, { borderLeftColor: a.line }]}>
            <T v="callout" style={{ color: a.muted }} numberOfLines={4}>{item.body}</T>
          </View>
          {category ? (
            <View style={[s.why, { borderTopColor: a.line }]}>
              <CategoryTag name={category.name} color={category.color} />
              <T v="callout" style={{ color: a.ink, flex: 1 }}>Te aviso porque esta categoría puede despertarte.</T>
            </View>
          ) : (
            <View style={[s.why, { borderTopColor: a.line }]}>
              <T v="callout" style={{ color: a.ink, flex: 1 }}>No lo reconozco con seguridad. Ante la duda, te aviso.</T>
            </View>
          )}
        </View>

        <View style={{ flex: 1, minHeight: space.xxl }} />

        <View style={{ gap: space.md }}>
          <PressScale accessibilityRole="button" accessibilityLabel={failed ? 'Reintentar' : 'Lo vi'} onPress={() => void ack()} disabled={sending}
            style={[s.seen, { backgroundColor: seen ? a.calm : a.ink, opacity: sending ? 0.7 : 1, transitionProperty: 'backgroundColor', transitionDuration: 200 } as ViewStyle]}>
            <Text style={s.seenText}>{seen ? 'Listo, quedó registrado' : sending ? 'Avisando a Sol…' : failed ? 'Reintentar' : 'Lo vi'}</Text>
          </PressScale>
          {failed ? <T v="callout" style={{ color: a.urgent, textAlign: 'center' }}>No pude confirmarlo con el servidor. Si no se confirma, te voy a llamar. Toca de nuevo para reintentar.</T> : null}
          <Pressable accessibilityRole="button" onPress={() => { tap(); router.replace(`/entrada/${item.id}`); }}
            style={({ pressed }) => [s.secondary, { borderColor: a.line, opacity: pressed ? 0.7 : 1 }]}>
            <T v="bodyStrong" style={{ color: a.ink }}>Abrir el detalle</T>
          </Pressable>
          {callAfter ? (
            <View style={s.inline} accessibilityLiveRegion="polite">
              <Phone size={18} color={a.muted} />
              <T v="callout" style={{ color: a.muted, flex: 1 }}>
                {seen ? 'No te voy a llamar.' : left > 0 ? `Si no tocas "Lo vi", te llamo en ${mm}:${ss}.` : 'Te estoy llamando.'}
              </T>
            </View>
          ) : null}
          {demo ? <T v="caption" style={{ color: a.faint, textAlign: 'center' }}>Prueba de la alerta · no se avisó a nadie</T> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  top: { alignItems: 'center', marginTop: space.xxl, marginBottom: space.xxl, gap: space.xs },
  clock: { fontFamily: font.bold, fontSize: 92, lineHeight: 98, letterSpacing: -4, color: a.ink, fontVariant: ['tabular-nums'] },
  card: { borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, padding: space.xl, gap: space.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radius.pill },
  quote: { borderLeftWidth: 2, paddingLeft: space.md, marginTop: space.xs },
  why: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: space.sm, flexWrap: 'wrap' },
  seen: { minHeight: 76, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  seenText: { fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: '#000000' },
  secondary: { minHeight: 54, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
