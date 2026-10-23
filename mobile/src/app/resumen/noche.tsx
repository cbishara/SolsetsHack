import { router } from 'expo-router';
import { BellRing, Mic, MoonStar, PenLine, Phone, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Hero } from '../../components/brand';
import { Header } from '../../components/header';
import { Button, Card, List, ListRow, Screen, Section, T } from '../../components/ui';
import { WeekStrip, keyOf } from '../../components/week-strip';
import { useStore } from '../../data/store';
import { eventsOn, hhmm, openTasks, plural } from '../../features/digest/format';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

// Nightly close: one minute to put the day down. What stays open, what comes
// tomorrow, a glance at the week, a place to drop what's on your mind, and
// the promise for tonight in plain words.
export default function ResumenNoche() {
  const { p } = useTheme();
  const { state, events, shifts } = useStore();
  const open = openTasks(state.tasks);
  const forToday = open.filter((t) => t.due.kind === 'today');
  const forTomorrow = open.filter((t) => t.due.kind === 'tomorrow' || (t.due.at && new Date(t.due.at).toDateString() === new Date(Date.now() + 864e5).toDateString()));
  const tomorrowEvents = eventsOn(events, 1);
  const tonightShift = shifts.find((s) => s.date === keyOf(new Date()));
  const onCall = state.onCallTonight ?? tonightShift?.onCall ?? false;
  const guard = state.profile.nightStyle === 'wake_if_urgent' && onCall;
  const wakeRules = state.rules.filter((r) => r.kind === 'wake' && r.confirmed);
  const watched = state.chats.filter((c) => c.on).map((c) => c.name);
  const busy: Record<string, number> = {};
  events.forEach((e) => { const k = keyOf(new Date(e.start)); busy[k] = (busy[k] ?? 0) + 1; });

  return (
    <Screen edges={['top', 'bottom']} padBottom={false} style={{ paddingBottom: space.section }}>
      <Header close />

      <View style={{ gap: space.sm }}>
        <T v="eyebrow" tone="muted">Cierre del día</T>
        <T v="title" accessibilityRole="header">Deja el día aquí. Yo me quedo con él.</T>
        <T tone="muted">
          {open.length
            ? `Quedan ${plural(open.length, 'cosa abierta', 'cosas abiertas')}. Todas tienen fecha, no tienes que acordarte de ninguna.`
            : 'No queda nada abierto. Buen día.'}
        </T>
      </View>

      {forToday.length ? (
        <Section eyebrow="Quedó de hoy" title="Pasa a mañana temprano">
          <List>
            {forToday.map((t, i) => <ListRow key={t.id} title={t.title} detail={t.sourceLabel} last={i === forToday.length - 1} />)}
          </List>
        </Section>
      ) : null}

      <Section eyebrow="Mañana" title={tomorrowEvents.length || forTomorrow.length ? 'Esto te espera' : 'Mañana está despejado'}>
        {tomorrowEvents.length || forTomorrow.length ? (
          <List>
            {tomorrowEvents.map((e) => (
              <ListRow key={e.id} title={e.title} detail={`${hhmm(e.start)} a ${hhmm(e.end)}${e.place ? ` · ${e.place}` : ''}`} />
            ))}
            {forTomorrow.map((t, i) => <ListRow key={t.id} title={t.title} detail="Tarea" last={i === forTomorrow.length - 1} />)}
          </List>
        ) : null}
      </Section>

      <Section eyebrow="Tu semana" title="De un vistazo" action="Abrir agenda" onAction={() => router.navigate('/agenda')}>
        <Card>
          <WeekStrip selected={keyOf(new Date())} onSelect={() => router.navigate('/agenda')} shifts={shifts} busy={busy} />
          <View style={s.legend}>
            <View style={[s.dot, { backgroundColor: p.lime }]} />
            <T v="caption" tone="muted">Guardia de noche</T>
            <View style={[s.dot, { backgroundColor: p.accent, marginLeft: space.md }]} />
            <T v="caption" tone="muted">Eventos</T>
          </View>
        </Card>
      </Section>

      <Section eyebrow="¿Algo te da vueltas?" title="Suéltalo antes de dormir">
        <T tone="muted">Dímelo como salga. Lo anoto con fecha y mañana te lo muestro.</T>
        <View style={s.dumpRow}>
          <Button kind="secondary" icon={PenLine} label="Escribir" onPress={() => router.push('/sol')} style={{ flex: 1 }} />
          <Button kind="secondary" icon={Mic} label="Dictar" onPress={() => router.push({ pathname: '/sol', params: { voice: '1' } })} style={{ flex: 1 }} />
        </View>
      </Section>

      <Hero>
        {guard ? (
          <>
            <View style={s.inline}><ShieldCheck size={20} color={p.lime} /><T v="eyebrow" tone="onHeroMuted">Esta noche estoy de guardia</T></View>
            <T v="h2" tone="onHero">
              Vigilo tus {watched.length} chats de guardia y tu correo. Te despierto solo si:
            </T>
            {watched.length ? <T v="caption" tone="onHeroMuted">{watched.join(' · ')}</T> : null}
            <View style={{ gap: space.sm }}>
              {wakeRules.map((r) => (
                <View key={r.id} style={s.inline}>
                  <View style={[s.bullet, { backgroundColor: p.lime }]} />
                  <T v="callout" tone="onHero" style={{ flex: 1 }}>{r.text}</T>
                </View>
              ))}
            </View>
            <View style={[s.channel, { borderTopColor: 'rgba(255,255,255,0.16)' }]}>
              <BellRing size={18} color={p.onHeroMuted} />
              <T v="callout" tone="onHeroMuted" style={{ flex: 1 }}>Te aviso con una notificación.</T>
            </View>
            <View style={s.inline}>
              <Phone size={18} color={p.onHeroMuted} />
              <T v="callout" tone="onHeroMuted" style={{ flex: 1 }}>Si no tocas “Lo vi” en 3 minutos, te llamo.</T>
            </View>
            {state.profile.agentMode === 'shadow' ? (
              <T v="caption" tone="onHeroMuted">Modo prueba: igual recibes todo como siempre. Mañana te muestro qué habría hecho.</T>
            ) : null}
          </>
        ) : (
          <>
            <View style={s.inline}><MoonStar size={20} color={p.lime} /><T v="eyebrow" tone="onHeroMuted">Esta noche</T></View>
            <T v="h2" tone="onHero">No te voy a despertar.</T>
            <T tone="onHeroMuted">Sigo leyendo lo que llega y lo ordeno. Mañana a las {state.profile.morningAt} te dejo el resumen.</T>
          </>
        )}
      </Hero>

      <View style={{ gap: space.md }}>
        <Button kind="lime" label="Listo, a descansar" onPress={() => router.back()} />
        {!guard && onCall ? null : (
          <Button kind="ghost" label={onCall ? 'Cambiar: esta noche no me toca' : '¿Te toca guardia? Confírmalo'} onPress={() => router.push('/guardia')} />
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dumpRow: { flexDirection: 'row', gap: space.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  channel: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: space.xs },
});
