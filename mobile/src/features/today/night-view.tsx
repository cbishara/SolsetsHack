import { router } from 'expo-router';
import { BellRing, Moon, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button, LinkButton, List, ListRow, Section, T } from '../../components/ui';
import { keyOf } from '../../components/week-strip';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';
import { groupOf } from '../tasks/logic';
import { hhmm } from './moment';

// Synthetic: messages Sol has looked at so far tonight.
const REVIEWED_TONIGHT = 14;

/**
 * Hoy at night. Low light, little text. The lime stays on the Sol button only,
 * so in-screen actions are blue. Three states:
 * unanswered guard question, on guard, or a free night.
 */
export function NightView({ name }: { name: string }) {
  const { state, shifts, events } = useStore();
  const rules = state.rules;
  const { p } = useTheme();
  const todayKey = keyOf(new Date());
  const guardShift = shifts.find((s) => s.date === todayKey)?.onCall ?? false;
  const guardEvent = events.find((e) => e.kind === 'shift' && keyOf(new Date(e.start)) === todayKey);
  const until = guardEvent ? hhmm(guardEvent.end) : state.profile.morningAt;
  const from = guardEvent ? hhmm(guardEvent.start) : '23:00';
  const onCall = state.onCallTonight ?? null;

  // 1. The night contract is still unanswered and the calendar says there is guard duty.
  if (onCall === null && guardShift) {
    return (
      <View style={{ gap: space.xxxl }}>
        <Greeting name={name} />
        <View style={[s.panel, { backgroundColor: p.card, borderColor: p.line }]}>
          <T v="eyebrow" tone="muted">Antes de dormir</T>
          <T v="title" accessibilityRole="header">¿Te toca guardia esta noche?</T>
          <T tone="muted">Tu calendario dice que <T v="bodyStrong">sí, de {from} a {until}</T>. Confírmalo y te digo qué te despertaría.</T>
          <Button label="Responder" onPress={() => router.push('/guardia')} style={{ marginTop: space.sm }} />
        </View>
      </View>
    );
  }

  // 2. On guard: a large, calm state.
  if (onCall) {
    const wake = rules.filter((r) => r.kind === 'wake' && r.confirmed);
    return (
      <View style={{ gap: space.xxxl }}>
        <View style={{ gap: space.lg, paddingTop: space.xl }}>
          <View style={[s.halo, { backgroundColor: p.accentSoft }]}><ShieldCheck size={30} color={p.accent} strokeWidth={2} /></View>
          <T v="display" accessibilityRole="header">Sol está de guardia</T>
          <T v="h3" tone="muted">hasta las {until}. Duerme tranquilo.</T>
        </View>
        <View style={{ gap: 2 }}>
          <T v="bodyStrong" tone="calm">Todo tranquilo</T>
          <T tone="muted">Revisé {REVIEWED_TONIGHT} mensajes. Ninguno era urgente.</T>
        </View>
        <Section eyebrow="Te despierto solo si">
          <List>
            {wake.map((r, i) => <ListRow key={r.id} title={r.text} last={i === wake.length - 1} />)}
          </List>
          <T v="callout" tone="muted">Te llega una alerta. Si no tocas "Lo vi" en 3 minutos, te llamo.</T>
        </Section>
        <View style={s.links}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <BellRing size={16} color={p.accent} />
            <LinkButton label="Ver cómo te despierto" onPress={() => router.push('/alerta')} />
          </View>
          <LinkButton label="Cambiar mi respuesta" onPress={() => router.push('/guardia')} />
        </View>
      </View>
    );
  }

  // 3. Free night: nothing will wake him; leave tomorrow sorted.
  const tomorrow = state.tasks
    .filter((t) => !t.done && ['today', 'tomorrow'].includes(groupOf(t.due)))
    .sort((a, b) => Number(b.important) - Number(a.important))
    .slice(0, 3);
  return (
    <View style={{ gap: space.xxxl }}>
      <View style={{ gap: space.lg, paddingTop: space.xl }}>
        <View style={[s.halo, { backgroundColor: p.accentSoft }]}><Moon size={30} color={p.accent} strokeWidth={2} /></View>
        <T v="display" accessibilityRole="header">Esta noche no te voy a despertar</T>
        <T v="h3" tone="muted">Igual reviso lo que llega y te lo ordeno para mañana.</T>
      </View>
      <Section eyebrow="Para mañana">
        {tomorrow.length ? (
          <List>
            {tomorrow.map((t, i) => (
              <ListRow key={t.id} title={t.title} detail={groupOf(t.due) === 'today' ? 'Quedó pendiente de hoy' : t.due.label} last={i === tomorrow.length - 1}
                onPress={() => router.push({ pathname: '/tarea/[id]', params: { id: t.id } })} />
            ))}
          </List>
        ) : (
          <T tone="muted">Mañana parte sin pendientes.</T>
        )}
      </Section>
      <Button label="Ver el resumen de la noche" onPress={() => router.push('/resumen/noche')} />
    </View>
  );
}

function Greeting({ name }: { name: string }) {
  return (
    <View style={{ gap: space.xs, paddingTop: space.md }}>
      <T v="title" accessibilityRole="header">Buenas noches, {name}</T>
      <T tone="muted">Un minuto y te puedes desconectar.</T>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { borderRadius: radius.xl, borderWidth: 1, padding: space.xxl, gap: space.md },
  halo: { width: 64, height: 64, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  links: { gap: space.lg },
});
