import { router } from 'expo-router';
import { ChevronRight, FileText, Moon, MoonStar, Sunrise, VolumeX } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, CATEGORY_ICONS, Card, Divider, Glass, IconTile, List, T, tap } from '../../components/ui';
import { dayLabel, keyOf, timeOf } from '../../data/dates';
import { byCategory, calendarById, categoryById, eventsOn, nightKey, todayCounts, upcoming, type Tonight } from '../../data/select';
import { useStore } from '../../data/store';
import type { CalendarEvent, Item, Task } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';
import { ItemRow } from '../inbox/item-row';
import { TaskRow } from '../tasks/task-row';

// Today's tasks ------------------------------------------------------------------

export function TodayTasks({ tasks }: { tasks: Task[] }) {
  const { state, toggleTask } = useStore();
  const { p } = useTheme();
  const shown = tasks.slice(0, 4);
  if (!tasks.length) {
    return (
      <Card>
        <T v="bodyStrong">Nada pendiente para hoy</T>
        <T v="callout" tone="muted">Lo que llegue con plazo para hoy aparece aquí.</T>
      </Card>
    );
  }
  return (
    <List>
      {shown.map((t) => (
        <TaskRow key={t.id} task={t} category={categoryById(state, t.categoryId)} onToggle={() => toggleTask(t.id)} onPress={() => router.push(`/tarea/${t.id}`)} />
      ))}
      <Pressable accessibilityRole="button" onPress={() => { tap(); router.navigate('/tareas'); }}
        style={({ pressed }) => [s.more, pressed && { backgroundColor: p.accentSoft }]}>
        <T v="calloutStrong" tone="muted" style={{ flex: 1 }}>{tasks.length > shown.length ? `Ver las ${tasks.length} de hoy` : 'Ver todas las tareas'}</T>
        <ChevronRight size={16} color={p.faint} />
      </Pressable>
    </List>
  );
}

// Agenda -------------------------------------------------------------------------

function until(e: CalendarEvent, now: Date): string {
  const start = new Date(e.start).getTime();
  const end = new Date(e.end).getTime();
  if (start <= now.getTime() && end > now.getTime()) return 'Ahora';
  const min = Math.round((start - now.getTime()) / 60_000);
  if (min < 60) return `En ${min} min`;
  if (min < 180) return `En ${Math.round(min / 60)} h`;
  return timeOf(e.start);
}

export function AgendaWidget({ now }: { now: Date }) {
  const { p } = useTheme();
  const { state } = useStore();
  const today = eventsOn(state, keyOf(now)).filter((e) => new Date(e.end).getTime() > now.getTime() && !e.allDay);
  const [next, ...rest] = today;
  const later = upcoming(state, now, 6).filter((e) => keyOf(new Date(e.start)) !== keyOf(now)).slice(0, 4);
  const color = (e: CalendarEvent) => categoryColors[calendarById(state, e.calendarId)?.color ?? 'gray'];

  return (
    <Card style={{ padding: 0, gap: 0 }} onPress={() => router.navigate('/agenda')} accessibilityLabel="Abrir agenda">
      <View style={{ padding: space.xl, gap: space.md }}>
        {next ? (
          <View style={s.next}>
            <View style={[s.bar, { backgroundColor: color(next) }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="captionStrong" tone={until(next, now) === 'Ahora' ? 'sol' : 'muted'}>{until(next, now)}</T>
              <T v="h3" numberOfLines={2}>{next.title}</T>
              <T v="callout" tone="muted" numberOfLines={1}>{`${timeOf(next.start)} – ${timeOf(next.end)}${next.place ? ` · ${next.place}` : ''}`}</T>
            </View>
          </View>
        ) : (
          <T v="bodyStrong">No te queda nada más hoy</T>
        )}
        {rest.slice(0, 3).map((e) => (
          <View key={e.id} style={s.line}>
            <T v="calloutStrong" tone="muted" style={s.time}>{timeOf(e.start)}</T>
            <View style={[s.dot, { backgroundColor: color(e) }]} />
            <T v="callout" numberOfLines={1} style={{ flex: 1 }}>{e.title}</T>
          </View>
        ))}
      </View>
      {later.length ? (
        <>
          <Divider />
          <View style={{ padding: space.xl, paddingTop: space.lg, gap: space.md }}>
            <T v="captionStrong" tone="faint">Próximos días</T>
            {later.map((e) => (
              <View key={e.id} style={s.line}>
                <T v="calloutStrong" tone="muted" style={s.day} numberOfLines={1}>{dayLabel(keyOf(new Date(e.start)), now, { short: true })}</T>
                <T v="callout" tone="faint" style={s.time}>{timeOf(e.start)}</T>
                <View style={[s.dot, { backgroundColor: color(e) }]} />
                <T v="callout" numberOfLines={1} style={{ flex: 1 }}>{e.title}</T>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Card>
  );
}

// Inbox by category ----------------------------------------------------------------

export function InboxWidget({ now }: { now: Date }) {
  const { p } = useTheme();
  const { state } = useStore();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const since = new Date(start.getTime() - 6 * 3_600_000); // today and last night
  const recent = state.items.filter((i) => new Date(i.receivedAt) >= since);
  const groups = byCategory(state, recent.filter((i) => i.outcome.kind !== 'ignored')).filter((g) => g.category).slice(0, 4);
  const silenced = recent.filter((i) => i.outcome.kind === 'ignored').length;
  const latest = recent.filter((i) => i.outcome.kind !== 'ignored').slice(0, 3);

  return (
    <View style={{ gap: space.md }}>
      <View style={s.grid}>
        {groups.map(({ category, items }) => {
          const c = category!;
          const Icon = CATEGORY_ICONS[c.icon];
          const unread = items.filter((i) => !i.read).length;
          return (
            <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.name}: ${items.length}`}
              onPress={() => { tap(); router.navigate({ pathname: '/bandeja', params: { c: c.id } }); }}
              style={({ pressed }) => [s.tile, { backgroundColor: p.card, borderColor: p.line }, pressed && { opacity: 0.7 }]}>
              <View style={s.tileHead}>
                <IconTile icon={Icon} color={categoryColors[c.color]} size={30} />
                <T v="title" style={{ fontVariant: ['tabular-nums'] }}>{items.length}</T>
              </View>
              <View style={{ gap: 1 }}>
                <T v="calloutStrong" numberOfLines={2}>{c.name}</T>
                <T v="caption" tone="faint" numberOfLines={1}>{unread ? `${unread} sin leer` : 'Al día'}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
      {latest.length ? (
        <List>
          {latest.map((i: Item, n) => (
            <ItemRow key={i.id} item={i} category={categoryById(state, i.categoryId)} onPress={() => router.push(`/entrada/${i.id}`)} compact last={n === latest.length - 1 && !silenced} />
          ))}
          {silenced ? (
            <View style={s.silenced}>
              <VolumeX size={14} color={p.faint} />
              <T v="caption" tone="faint" style={{ flex: 1 }}>{`Silencié ${silenced} ${silenced === 1 ? 'mensaje' : 'mensajes'} de conversación que no pedían nada.`}</T>
            </View>
          ) : null}
        </List>
      ) : null}
    </View>
  );
}

// Tonight --------------------------------------------------------------------------

export function NightCard({ tonight, ask, morningAt }: { tonight: Tonight; ask: boolean; morningAt: string }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const night = nightKey(state.nightAlerts);
  const set = (on: boolean) => { tap('success'); dispatch({ type: 'setNightAlerts', patch: { override: { date: night, on } } }); };
  const wakers = tonight.wakers.map((c) => c.name);
  const quiet = state.nightAlerts.mode === 'quiet';

  return (
    <Glass style={s.night}>
      <View style={s.nightHead}>
        <IconTile icon={tonight.on ? MoonStar : Moon} color={tonight.on ? p.sol : p.muted} size={34} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{ask ? '¿Activo los avisos esta noche?' : tonight.on ? 'Avisos nocturnos activos' : 'Avisos nocturnos apagados'}</T>
          <T v="caption" tone="muted">{`${tonight.from} a ${tonight.to} · ${tonight.because}`}</T>
        </View>
      </View>
      <T v="callout" tone="muted">
        {tonight.on
          ? `Si llega algo de ${wakers.length ? wakers.join(' o ') : 'una categoría que pueda despertarte'}, te aviso${state.nightAlerts.call ? ` y te llamo si no lo ves en ${state.nightAlerts.callAfterMin} min` : ''}. Lo demás queda para el resumen de las ${morningAt}.`
          : `Lo que llegue de noche queda ordenado para el resumen de las ${morningAt}.`}
      </T>
      <View style={s.nightActions}>
        {ask ? (
          <>
            <Button label="Sí, activar" kind="sol" small onPress={() => set(true)} style={{ flex: 1 }} />
            <Button label="No, esta noche no" kind="secondary" small onPress={() => set(false)} style={{ flex: 1 }} />
          </>
        ) : (
          <>
            {!quiet ? <Button label={tonight.on ? 'Apagar esta noche' : 'Activar esta noche'} kind="secondary" small onPress={() => set(!tonight.on)} style={{ flex: 1 }} /> : null}
            <Button label="Configurar" kind="ghost" small onPress={() => router.push('/perfil/noche')} />
          </>
        )}
      </View>
    </Glass>
  );
}

// Summaries ------------------------------------------------------------------------

export function SummaryCard({ kind, now }: { kind: 'morning' | 'evening'; now: Date }) {
  const { p } = useTheme();
  const { state } = useStore();
  const counts = todayCounts(state, now);
  const night = state.items.filter((i) => i.night && new Date(i.receivedAt).getTime() > now.getTime() - 14 * 3_600_000);
  const woke = night.filter((i) => i.outcome.kind === 'alerted').length;
  const title = kind === 'morning' ? 'Resumen de la noche' : 'Resumen del día';
  const detail = kind === 'morning'
    ? `${night.length} ${night.length === 1 ? 'mensaje' : 'mensajes'} de noche · ${woke ? `${woke} ${woke === 1 ? 'aviso urgente' : 'avisos urgentes'}` : 'ningún aviso urgente'}`
    : `${counts.read} recibidos hoy · ${counts.tasks} tareas nuevas · ${counts.events} en tu agenda`;
  const Icon = kind === 'morning' ? Sunrise : FileText;
  return (
    <Card onPress={() => router.push(kind === 'morning' ? '/resumen/manana' : '/resumen/noche')} accessibilityLabel={`Abrir ${title}`} style={s.summary}>
      <IconTile icon={Icon} color={p.sol} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyStrong">{title}</T>
        <T v="caption" tone="muted" numberOfLines={2}>{detail}</T>
      </View>
      <ChevronRight size={18} color={p.faint} />
    </Card>
  );
}

const s = StyleSheet.create({
  more: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.06)' },
  next: { flexDirection: 'row', gap: space.md },
  bar: { width: 4, borderRadius: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  time: { width: 44, fontVariant: ['tabular-nums'] },
  day: { width: 64 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.6%', flexGrow: 1, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, padding: space.lg, gap: space.md },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  silenced: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  night: { padding: space.xl, gap: space.md, borderRadius: radius.xl },
  nightHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nightActions: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
