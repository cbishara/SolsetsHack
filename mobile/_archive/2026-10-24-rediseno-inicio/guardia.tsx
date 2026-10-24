import { router } from 'expo-router';
import { BellRing, CalendarDays, Check, Phone, ShieldAlert, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Header } from '../components/header';
import { Button, Card, List, ListRow, Screen, Section, T } from '../components/ui';
import { WeekStrip, keyOf } from '../components/week-strip';
import { useStore } from '../data/store';
import { useTheme } from '../theme/theme';
import { space } from '../theme/tokens';

// Contrato de la noche (official functionality 1): one question, answer
// suggested by the shift calendar (functionality 3), done in under a minute.
export default function Guardia() {
  const { p } = useTheme();
  const { state, shifts, dispatch } = useStore();
  const today = keyOf(new Date());
  const shift = shifts.find((s) => s.date === today);
  const suggested = shift?.onCall ?? null;
  const answered = state.onCallTonight;
  const wakeRules = state.rules.filter((r) => r.kind === 'wake' && r.confirmed);

  const answer = (value: boolean) => {
    dispatch({ type: 'setOnCall', value });
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']} padBottom={false} style={{ paddingBottom: space.section }}>
      <Header close />

      <Card>
        <View style={s.cardHead}>
          <View style={{ gap: 2 }}>
            <T v="bodyStrong">Tus turnos</T>
            <T v="caption" tone="muted">{new Date().toLocaleDateString('es-CL', { month: 'long' })}, esta semana</T>
          </View>
          <CalendarDays size={20} color={p.muted} />
        </View>
        <WeekStrip selected={today} onSelect={() => {}} shifts={shifts} />
      </Card>

      <View style={{ gap: space.sm }}>
        <T v="display" accessibilityRole="header">¿Te toca guardia esta noche?</T>
        <T tone="muted">
          {suggested === true
            ? <>Tu calendario dice que <T v="bodyStrong">sí, de 23:00 a 07:00</T>. Solo confírmalo.</>
            : suggested === false
              ? <>Tu calendario dice que <T v="bodyStrong">no</T>. Si te cambiaron el turno, dímelo.</>
              : 'No encontré tu turno de hoy en el calendario.'}
        </T>
        {answered !== null ? (
          <View style={s.inline}>
            <Check size={16} color={p.calm} />
            <T v="callout" tone="calm">Ya me dijiste que {answered ? 'sí' : 'no'}. Puedes cambiarlo.</T>
          </View>
        ) : null}
      </View>

      <View style={{ gap: space.md }}>
        <Button kind={suggested === false ? 'secondary' : 'primary'} label="Sí, me toca" onPress={() => answer(true)} />
        <Button kind={suggested === false ? 'primary' : 'secondary'} label="No, esta noche no" onPress={() => answer(false)} />
      </View>

      <Section eyebrow="Si dices que sí" title="Te despierto solo por esto">
        <List>
          {wakeRules.map((r, i) => (
            <ListRow
              key={r.id}
              title={r.text}
              detail={r.origin === 'feedback' ? 'Lo aprendí de ti' : r.examples ? `Lo vi ${r.examples} veces en tu historial` : undefined}
              icon={r.origin === 'feedback' ? Sparkles : ShieldAlert}
              iconTone={r.origin === 'feedback' ? 'accent' : 'urgent'}
              last={i === wakeRules.length - 1}
            />
          ))}
        </List>
        <View style={{ gap: space.sm }}>
          <View style={s.inline}>
            <BellRing size={18} color={p.muted} />
            <T v="callout" tone="muted" style={{ flex: 1 }}>Te aviso con una notificación.</T>
          </View>
          <View style={s.inline}>
            <Phone size={18} color={p.muted} />
            <T v="callout" tone="muted" style={{ flex: 1 }}>Si no tocas “Lo vi” en 3 minutos, te llamo y repito la llamada.</T>
          </View>
        </View>
        <Button kind="ghost" label="Ver cómo te despierto" onPress={() => router.push('/alerta')} />
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
