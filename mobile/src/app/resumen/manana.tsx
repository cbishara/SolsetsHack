import { router } from 'expo-router';
import { BedDouble, BellRing, ChevronRight, ThumbsDown, ThumbsUp, VolumeX } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Button, Chip, Glass, List, Screen, Section, Stat, T, tap } from '../../components/ui';
import { cap, longDate, timeOf, todayKey } from '../../data/dates';
import { categoryById, dueToday, eventsOn, lastNightItems } from '../../data/select';
import { useStore } from '../../data/store';
import type { FeedbackValue, Item } from '../../data/types';
import { sleepLine } from '../../features/digest/build';
import { ItemRow } from '../../features/inbox/item-row';
import { TaskRow } from '../../features/tasks/task-row';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

const RATE: { id: FeedbackValue; label: string; icon: typeof ThumbsUp }[] = [
  { id: 'right', label: 'Bien', icon: ThumbsUp },
  { id: 'should_have_woken', label: 'Debió avisarme', icon: BellRing },
  { id: 'should_not_have_woken', label: 'No era para avisar', icon: ThumbsDown },
];

function Rate({ item }: { item: Item }) {
  const { rate } = useStore();
  const options = item.outcome.kind === 'alerted' ? RATE.filter((r) => r.id !== 'should_have_woken') : RATE.filter((r) => r.id !== 'should_not_have_woken');
  return (
    <View style={s.rate}>
      {options.map((r) => (
        <Chip key={r.id} label={r.label} icon={r.icon} tone={r.id === 'right' ? 'calm' : 'accent'} selected={item.feedback === r.id} onPress={() => rate(item.id, r.id)} />
      ))}
    </View>
  );
}

/**
 * Resumen de la mañana: how the night went, what is waiting today, and one
 * tap per decision to teach Sol. Built from the same data as WhatsApp's.
 */
export default function ResumenManana() {
  const { p } = useTheme();
  const { state, sleep, toggleTask } = useStore();
  const now = new Date();
  const night = lastNightItems(state, now);
  const alerted = night.filter((i) => i.outcome.kind === 'alerted');
  const tasks = night.filter((i) => i.outcome.kind === 'task').map((i) => state.tasks.find((t) => t.id === (i.outcome as { taskId: string }).taskId)).filter((t): t is NonNullable<typeof t> => !!t);
  const silenced = night.filter((i) => i.outcome.kind === 'ignored' || i.outcome.kind === 'digest');
  const toRate = night.filter((i) => i.outcome.kind !== 'ignored' && !i.feedback);
  const today = dueToday(state, now);
  const events = eventsOn(state, todayKey(now)).filter((e) => !e.allDay && new Date(e.start) >= new Date(now.getTime() - 3_600_000)).slice(0, 4);
  const shadow = state.profile.agentMode === 'shadow';

  return (
    <Screen padBottom={false} glow="sol" edges={['top', 'bottom']}>
      <Header close />
      <View style={s.hero}>
        <SolOrb size={72} state="watching" />
        <View style={{ alignItems: 'center', gap: space.xs, marginTop: -space.md }}>
          <T v="calloutStrong" tone="muted">{cap(longDate(now))}</T>
          <T v="title" accessibilityRole="header" style={{ textAlign: 'center' }}>{alerted.length ? `Anoche te avisé ${alerted.length === 1 ? '1 vez' : `${alerted.length} veces`}` : 'Anoche no hubo nada urgente'}</T>
          {sleepLine(sleep) ? (
            <View style={s.inline}>
              <BedDouble size={15} color={p.muted} />
              <T v="callout" tone="muted">{sleepLine(sleep)}</T>
            </View>
          ) : null}
        </View>
      </View>

      <Glass style={s.stats}>
        <Stat value={night.length} label="Revisé de noche" />
        <View style={[s.sep, { backgroundColor: p.glassLine }]} />
        <Stat value={alerted.length} label="Te avisé" tone={alerted.length ? 'urgent' : 'ink'} />
        <View style={[s.sep, { backgroundColor: p.glassLine }]} />
        <Stat value={tasks.length} label="Para hoy" tone="sol" />
      </Glass>
      {shadow ? <T v="caption" tone="muted" style={{ textAlign: 'center', marginTop: -space.lg }}>Modo prueba: no silencié nada. Esto es lo que habría hecho.</T> : null}

      {alerted.length ? (
        <Section title="Te avisé">
          <List>
            {alerted.map((i, n) => (
              <View key={i.id}>
                <ItemRow item={i} category={categoryById(state, i.categoryId)} onPress={() => router.push(`/entrada/${i.id}`)} last />
                <View style={s.under}>
                  <T v="caption" tone="muted">{i.outcome.kind === 'alerted' && i.outcome.seenAt ? `Lo viste a las ${timeOf(i.outcome.seenAt)}.` : 'No lo alcanzaste a ver.'} ¿Estuvo bien avisarte?</T>
                  <Rate item={i} />
                </View>
                {n < alerted.length - 1 ? <View style={[s.div, { backgroundColor: p.line }]} /> : null}
              </View>
            ))}
          </List>
        </Section>
      ) : null}

      {tasks.length ? (
        <Section title="Quedó para hoy" count={tasks.length}>
          <List>
            {tasks.map((t, i) => <TaskRow key={t.id} task={t} category={categoryById(state, t.categoryId)} onToggle={() => toggleTask(t.id)} onPress={() => router.push(`/tarea/${t.id}`)} showWhy last={i === tasks.length - 1} />)}
          </List>
        </Section>
      ) : null}

      {silenced.length ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); router.navigate('/bandeja'); }} style={({ pressed }) => [s.silenced, { backgroundColor: p.card, borderColor: p.line }, pressed && { opacity: 0.7 }]}>
          <VolumeX size={18} color={p.muted} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodyStrong">{`${silenced.length} sin interrumpirte`}</T>
            <T v="caption" tone="muted">Confirmaciones, conversación y avisos que no pedían nada. Están en la bandeja.</T>
          </View>
          <ChevronRight size={16} color={p.faint} />
        </Pressable>
      ) : null}

      {toRate.filter((i) => i.outcome.kind !== 'alerted').length ? (
        <Section title="¿Lo hice bien?">
          <T v="callout" tone="muted" style={{ marginTop: -space.sm }}>{shadow ? 'En modo prueba, tus respuestas me entrenan. Con varias noches sin errores, te propongo el modo real.' : 'Tus respuestas me sirven de ejemplo para lo próximo.'}</T>
          <List>
            {toRate.filter((i) => i.outcome.kind !== 'alerted').slice(0, 4).map((i, n, all) => {
              const c = categoryById(state, i.categoryId);
              return (
                <View key={i.id} style={[s.decision, n < all.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
                  <Pressable accessibilityRole="button" onPress={() => { tap(); router.push(`/entrada/${i.id}`); }} style={{ gap: 3 }}>
                    <View style={s.inline}>
                      <T v="caption" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>{timeOf(i.receivedAt)}</T>
                      {c ? <View style={[s.dot, { backgroundColor: categoryColors[c.color] }]} /> : null}
                      <T v="caption" tone="faint" numberOfLines={1} style={{ flex: 1 }}>{i.night?.reason ?? i.context}</T>
                    </View>
                    <T v="body" numberOfLines={2}>{i.summary}</T>
                  </Pressable>
                  <Rate item={i} />
                </View>
              );
            })}
          </List>
        </Section>
      ) : null}

      <Section title="Tu día">
        <List>
          {events.map((e, i) => (
            <Pressable key={e.id} accessibilityRole="button" onPress={() => { tap(); router.push(`/evento/${e.id}`); }} style={[s.event, { borderBottomColor: p.line }, i === events.length - 1 && !today.length && { borderBottomWidth: 0 }]}>
              <T v="calloutStrong" style={{ width: 48, fontVariant: ['tabular-nums'] }}>{timeOf(e.start)}</T>
              <T v="body" numberOfLines={1} style={{ flex: 1 }}>{e.title}</T>
            </Pressable>
          ))}
          {today.length ? (
            <Pressable accessibilityRole="button" onPress={() => { tap(); router.navigate('/tareas'); }} style={s.event}>
              <T v="calloutStrong" tone="sol" style={{ width: 48 }}>{today.length}</T>
              <T v="body" style={{ flex: 1 }}>{today.length === 1 ? 'tarea para hoy' : 'tareas para hoy'}</T>
              <ChevronRight size={16} color={p.faint} />
            </Pressable>
          ) : null}
        </List>
      </Section>

      <Button kind="primary" label="Empezar el día" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ marginBottom: space.xl }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, marginTop: -space.lg },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stats: { flexDirection: 'row', alignItems: 'center', padding: space.xl, borderRadius: radius.xl, gap: space.lg },
  sep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  under: { paddingLeft: 70, paddingRight: space.lg, paddingBottom: space.md, gap: space.sm, marginTop: -space.xs },
  rate: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  div: { height: StyleSheet.hairlineWidth },
  silenced: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  decision: { padding: space.lg, gap: space.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth },
});
