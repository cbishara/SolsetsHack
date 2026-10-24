import { router } from 'expo-router';
import { CalendarArrowUp, Check, ChevronRight, Inbox } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Button, CategoryTag, Divider, Glass, List, ListRow, Screen, Section, Stat, T, tap } from '../../components/ui';
import { addDays, cap, isOverdue, keyOf, longDate, timeOf, todayKey } from '../../data/dates';
import { categoryById, dayDigest, shouldAskTonight } from '../../data/select';
import { useStore } from '../../data/store';
import { tomorrowLabel } from '../../features/digest/build';
import { Unload } from '../../features/digest/unload';
import { NightCard } from '../../features/home/widgets';
import { TaskRow } from '../../features/tasks/task-row';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

/**
 * Resumen del día, at the end of the work day. Proof that everything in the
 * person's head is mapped: what arrived, what got done, what moves to tomorrow.
 * Then a moment to unload the rest, and the night.
 */
export default function ResumenDia() {
  const { p, setManual } = useTheme();
  const { state, dispatch, toggleTask } = useStore();
  const now = new Date();
  const today = todayKey(now);
  const d = dayDigest(state, today, now);
  const overdue = d.tomorrow.filter((t) => isOverdue(t, now) || t.date === today);
  const first = d.tomorrowEvents.find((e) => !e.allDay && keyOf(new Date(e.start)) === addDays(today, 1));
  const groups = d.groups.filter((g) => g.category).slice(0, 5);

  const close = () => {
    tap('success');
    dispatch({ type: 'closeDay', date: today });
    setManual('night');
    router.replace('/noche');
  };

  return (
    <Screen padBottom={false} glow="sol" edges={['top', 'bottom']}>
      <Header close />

      <View style={s.hero}>
        <SolOrb size={72} state="calm" />
        <View style={{ alignItems: 'center', gap: space.xs, marginTop: -space.md }}>
          <T v="calloutStrong" tone="muted">{cap(longDate(now))}</T>
          <T v="title" accessibilityRole="header" style={{ textAlign: 'center' }}>Así quedó tu día</T>
        </View>
      </View>

      <Glass style={s.stats}>
        <Stat value={d.arrived.length} label="Llegaron" />
        <View style={[s.sep, { backgroundColor: p.glassLine }]} />
        <Stat value={d.done.length} label="Terminaste" tone="calm" />
        <View style={[s.sep, { backgroundColor: p.glassLine }]} />
        <Stat value={d.tomorrow.length} label={`Para ${tomorrowLabel(now).toLowerCase()}`} tone="sol" />
      </Glass>

      {d.done.length ? (
        <Section title="Lo que terminaste" count={d.done.length}>
          <List>
            {d.done.slice(0, 6).map((t, i, all) => (
              <ListRow key={t.id} title={t.title} titleTone="muted" last={i === all.length - 1}
                leading={<View style={[s.done, { backgroundColor: p.calmSoft }]}><Check size={14} color={p.calm} strokeWidth={3} /></View>}
                onPress={() => router.push(`/tarea/${t.id}`)} />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title={`Queda para ${tomorrowLabel(now).toLowerCase()}`} count={d.tomorrow.length}>
        {d.tomorrow.length ? (
          <>
            <List>
              {d.tomorrow.slice(0, 8).map((t, i, all) => (
                <TaskRow key={t.id} task={t} category={categoryById(state, t.categoryId)} onToggle={() => toggleTask(t.id)} onPress={() => router.push(`/tarea/${t.id}`)} last={i === all.length - 1} />
              ))}
            </List>
            {overdue.length ? (
              <Button small kind="secondary" icon={CalendarArrowUp} label={`Pasar ${overdue.length === 1 ? 'la de hoy' : `las ${overdue.length} de hoy`} a mañana`}
                onPress={() => { tap('success'); overdue.forEach((t) => dispatch({ type: 'updateTask', id: t.id, patch: { date: addDays(today, 1), time: t.time && t.time < '09:00' ? t.time : '09:00' } })); }} />
            ) : null}
          </>
        ) : <T tone="muted">Mañana empiezas sin pendientes.</T>}
        {first ? (
          <T v="callout" tone="muted">{`Tu día empieza a las ${timeOf(first.start)} con ${first.title}.`}</T>
        ) : null}
      </Section>

      {groups.length ? (
        <Section title="Lo nuevo de hoy" count={d.meaningful.length}>
          <List>
            {groups.map((g, gi) => (
              <View key={g.category!.id}>
                <Pressable accessibilityRole="button" onPress={() => { tap(); router.navigate({ pathname: '/bandeja', params: { c: g.category!.id } }); }}
                  style={({ pressed }) => [s.group, pressed && { backgroundColor: p.accentSoft }]}>
                  <CategoryTag name={g.category!.name} color={g.category!.color} />
                  <T v="calloutStrong" tone="muted" style={{ flex: 1 }}>{g.items.length}</T>
                  <ChevronRight size={16} color={p.faint} />
                </Pressable>
                {g.items.slice(0, 2).map((i) => (
                  <Pressable key={i.id} accessibilityRole="button" onPress={() => { tap(); router.push(`/entrada/${i.id}`); }} style={s.itemLine}>
                    <View style={[s.bar, { backgroundColor: categoryColors[g.category!.color] }]} />
                    <T v="callout" numberOfLines={1} style={{ flex: 1 }}>{i.summary}</T>
                  </Pressable>
                ))}
                {gi < groups.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </List>
          {d.ignored ? <T v="caption" tone="faint">{`Además silencié ${d.ignored} ${d.ignored === 1 ? 'mensaje' : 'mensajes'} de conversación.`}</T> : null}
        </Section>
      ) : null}

      {d.review.length ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); router.navigate({ pathname: '/bandeja', params: { f: 'review' } }); }}
          style={({ pressed }) => [s.review, { backgroundColor: `${p.sol}14`, borderColor: `${p.sol}40` }, pressed && { opacity: 0.8 }]}>
          <Inbox size={18} color={p.sol} />
          <T v="calloutStrong" style={{ flex: 1 }}>{`${d.review.length} ${d.review.length === 1 ? 'cosa espera' : 'cosas esperan'} tu confirmación`}</T>
          <ChevronRight size={16} color={p.sol} />
        </Pressable>
      ) : null}

      <Unload />

      <Section title="Esta noche">
        <NightCard tonight={d.tonight} ask={shouldAskTonight(state, now)} morningAt={state.summaries.morning.at} />
      </Section>

      <View style={{ gap: space.sm, marginBottom: space.xl }}>
        <Button kind="primary" label="Cerrar el día" onPress={close} />
        <T v="caption" tone="faint" style={{ textAlign: 'center' }}>La app pasa a modo noche. Sol sigue leyendo lo que llega.</T>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, marginTop: -space.lg },
  stats: { flexDirection: 'row', alignItems: 'center', padding: space.xl, borderRadius: radius.xl, gap: space.lg },
  sep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  done: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  group: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, minHeight: 44 },
  itemLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm, minHeight: 30 },
  bar: { width: 3, height: 14, borderRadius: 2, marginLeft: 4 },
  review: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
});
