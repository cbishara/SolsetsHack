import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { TopBar } from '../../components/top-bar';
import { Screen, Section } from '../../components/ui';
import { cap, greeting, longDate, minutesOf } from '../../data/dates';
import { dueToday, inNightWindow, lastNightItems, shouldAskTonight, todayCounts, tonight, toReview, unseenAlerts } from '../../data/select';
import { useStore } from '../../data/store';
import { AskSol, SolStatus } from '../../features/home/hero';
import { QuestionCard } from '../../features/home/question-card';
import { AgendaWidget, InboxWidget, NightCard, SummaryCard, TodayTasks } from '../../features/home/widgets';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

/** Re-render every minute so "hace 2 min" and "En 45 min" stay true. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/**
 * Inicio. One look should answer: is Sol on top of everything, what needs me
 * today, what is coming, and what happens tonight. Everything on it is built
 * from the store, so it reads right for anyone, not only the example person.
 */
export default function Inicio() {
  const { scheme } = useTheme();
  const { state } = useStore();
  const now = useNow();

  const counts = todayCounts(state, now);
  const today = dueToday(state, now);
  const review = toReview(state);
  const alerts = unseenAlerts(state, now);
  const night = tonight(state, now);
  const nightNow = scheme === 'night' || (night.on && inNightWindow(state.nightAlerts, now));
  const open = state.questions.filter((q) => !q.answer);
  const mins = now.getHours() * 60 + now.getMinutes();
  const morning = mins >= minutesOf(state.summaries.morning.at) && mins < 12 * 60 && lastNightItems(state, now).length > 0;
  const evening = mins >= minutesOf(state.summaries.evening.at) && !nightNow;

  const pressing = today.filter((t) => t.priority === 'high' || t.flagged).length + review.length + alerts.length;
  const title = alerts.length
    ? `${alerts.length} ${alerts.length === 1 ? 'aviso urgente sin ver' : 'avisos urgentes sin ver'}`
    : nightNow ? 'Modo noche' : pressing ? `${pressing} ${pressing === 1 ? 'cosa necesita' : 'cosas necesitan'} tu atención` : 'Todo en orden';
  const read = counts.read;
  const detail = nightNow
    ? night.on ? `Avisos nocturnos activos hasta las ${night.to}. Lo demás espera al resumen.` : `Sin avisos esta noche. Todo queda para el resumen de las ${state.summaries.morning.at}.`
    : read
      ? `Hoy revisé ${read} ${read === 1 ? 'mensaje' : 'mensajes'}: ${counts.tasks} ${counts.tasks === 1 ? 'quedó como tarea' : 'quedaron como tareas'}, ${counts.events} en tu agenda y ${counts.ignored} silenciados.`
      : 'Estoy revisando lo que llega. Te muestro aquí lo que te necesite.';

  return (
    <Screen glow="sol">
      <TopBar overline={cap(longDate(now))} title={`${greeting(now)}, ${state.profile.name}`} />

      <SolStatus state={alerts.length ? 'waking' : nightNow ? 'calm' : 'watching'} title={title} detail={detail} connections={state.connections} />

      <View style={{ gap: space.md, marginTop: -space.md }}>
        <AskSol hint={nightNow ? 'Anota algo antes de dormir…' : 'Pídele algo a Sol o cuéntale algo…'} />
      </View>

      {open.length ? <QuestionCard questions={open} /> : null}

      {morning ? <SummaryCard kind="morning" now={now} /> : evening ? <SummaryCard kind="evening" now={now} /> : null}

      <Section title="Para hoy" count={today.length}>
        <TodayTasks tasks={today} />
      </Section>

      <Section title="Agenda">
        <AgendaWidget now={now} />
      </Section>

      <Section title="Bandeja" action={review.length ? `${review.length} por confirmar` : 'Abrir'} onAction={() => router.navigate('/bandeja')}>
        <InboxWidget now={now} />
      </Section>

      <Section title="Esta noche">
        <NightCard tonight={night} ask={shouldAskTonight(state, now)} morningAt={state.summaries.morning.at} />
      </Section>
    </Screen>
  );
}
