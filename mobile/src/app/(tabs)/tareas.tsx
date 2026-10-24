import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, CalendarClock, ChevronDown, Flag, Inbox, ListChecks, Plus, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { TopBar } from '../../components/top-bar';
import { Chip, EmptyState, IconButton, IconTile, List, Screen, Section, T, tap } from '../../components/ui';
import { dayLabel, isOverdue, todayKey } from '../../data/dates';
import { parseWhen, stripWhen } from '../../data/dump';
import { activeCategories, categoryById, groupTasks } from '../../data/select';
import { newId, useStore } from '../../data/store';
import type { Task } from '../../data/types';
import { TaskComposer } from '../../features/tasks/composer';
import { TaskRow } from '../../features/tasks/task-row';
import { UndoBar } from '../../features/tasks/undo-bar';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

type View_ = 'today' | 'scheduled' | 'flagged' | 'all';

/** Tareas: Reminders' smart lists, grouped by when, filtered by category. Adding takes one line. */
export default function Tareas() {
  const { p } = useTheme();
  const { state, toggleTask, addTasks, dispatch } = useStore();
  const params = useLocalSearchParams<{ v?: View_ }>();
  const [view, setView] = useState<View_>(params.v ?? 'today');
  const [cat, setCat] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [composer, setComposer] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null);
  const dismiss = useCallback(() => setUndo(null), []);

  useEffect(() => { if (params.v) setView(params.v); }, [params.v]);

  const today = todayKey();
  const open = state.tasks.filter((t) => !t.done);
  const lists = {
    today: open.filter((t) => t.date && t.date <= today),
    scheduled: open.filter((t) => t.date),
    flagged: open.filter((t) => t.flagged || t.priority === 'high'),
    all: open,
  };
  const overdue = open.filter((t) => isOverdue(t)).length;

  const visible = lists[view].filter((t) => !cat || t.categoryId === cat);
  const composerInitial = useMemo(() => ({ categoryId: cat, flagged: view === 'flagged', date: view === 'all' ? undefined : today }), [cat, view, today]);
  const groups = groupTasks(visible);
  const done = state.tasks.filter((t) => t.done && (!cat || t.categoryId === cat)).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
  const cats = activeCategories(state).filter((c) => open.some((t) => t.categoryId === c.id));

  const toggle = (t: Task) => {
    const wasDone = t.done;
    toggleTask(t.id);
    const repeats = !wasDone && t.repeat !== 'never' && t.date;
    setUndo({
      text: wasDone ? 'Volvió a tus tareas' : repeats ? 'Hecha. La próxima ya está agendada' : `Hecha: ${t.title}`,
      run: () => (repeats ? dispatch({ type: 'updateTask', id: t.id, patch: { date: t.date } }) : toggleTask(t.id)),
    });
  };

  const when = parseWhen(draft);
  const quickAdd = () => {
    const title = stripWhen(draft.trim(), when);
    if (!title) return;
    const task: Task = {
      id: newId('t'), title, categoryId: cat, source: 'you', sourceLabel: 'Lo anotaste tú',
      date: when.date ?? (view === 'today' ? today : undefined), time: when.time, reminder: when.time ? 'at' : 'none',
      repeat: 'never', priority: 'none', flagged: view === 'flagged', done: false, createdAt: new Date().toISOString(),
    };
    tap('success');
    addTasks([task]);
    setDraft('');
    setUndo({ text: `Anotada${task.date ? ` para ${dayLabel(task.date).toLowerCase()}` : ''}`, run: () => dispatch({ type: 'removeTasks', ids: [task.id] }) });
  };

  const TILES: { id: View_; label: string; icon: typeof Inbox; color: string; n: number; sub?: string }[] = [
    { id: 'today', label: 'Hoy', icon: CalendarCheck, color: p.sol, n: lists.today.length, sub: overdue ? `${overdue} ${overdue === 1 ? 'vencida' : 'vencidas'}` : undefined },
    { id: 'scheduled', label: 'Programadas', icon: CalendarClock, color: categoryColors.blue, n: lists.scheduled.length },
    { id: 'flagged', label: 'Importantes', icon: Flag, color: categoryColors.orange, n: lists.flagged.length },
    { id: 'all', label: 'Todas', icon: Inbox, color: categoryColors.gray, n: lists.all.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Screen>
        <TopBar title="Tareas" actions={<IconButton icon={Plus} label="Nueva tarea" onPress={() => setComposer(true)} size={40} />} />

        <View style={s.tiles}>
          {TILES.map((t) => {
            const on = view === t.id;
            return (
              <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${t.label}: ${t.n}`}
                onPress={() => { tap(); setView(t.id); }}
                style={({ pressed }) => [s.tile, { backgroundColor: on ? p.surface : p.card, borderColor: on ? p.glassHi : p.line }, pressed && { opacity: 0.75 }]}>
                <View style={s.tileHead}>
                  <IconTile icon={t.icon} color={t.color} size={32} filled={on} />
                  <T v="title" style={{ fontVariant: ['tabular-nums'] }}>{t.n}</T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <T v="calloutStrong" tone={on ? 'ink' : 'muted'}>{t.label}</T>
                  {t.sub ? <T v="caption" tone="urgent">{t.sub}</T> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: space.md }}>
          <View style={[s.add, { backgroundColor: p.surface, borderColor: p.line }]}>
            <Plus size={20} color={p.sol} strokeWidth={2.4} />
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={quickAdd} returnKeyType="done" placeholder="Agregar tarea" placeholderTextColor={p.faint}
              selectionColor={p.sol} style={[s.input, { color: p.ink }]} accessibilityLabel="Agregar tarea. Puedes decir la fecha, por ejemplo: mañana a las 10." />
            <Pressable accessibilityRole="button" accessibilityLabel="Más opciones" onPress={() => { tap(); setComposer(true); }} hitSlop={8} style={s.more}>
              <SlidersHorizontal size={18} color={p.muted} />
            </Pressable>
          </View>
          {draft.trim() && when.matched.length ? (
            <T v="caption" tone="sol">{`Quedará para ${[when.date && dayLabel(when.date).toLowerCase(), when.time && `a las ${when.time}`].filter(Boolean).join(' ')}. Toca Intro para agregarla.`}</T>
          ) : (
            <T v="caption" tone="faint">Escribe la fecha como la dirías: "pagar la luz el viernes", "llamar a Marcela mañana a las 10".</T>
          )}
        </View>

        {cats.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipScroll}>
            <Chip label="Todas las categorías" selected={!cat} onPress={() => setCat(null)} />
            {cats.map((c) => <Chip key={c.id} label={c.name} dot={categoryColors[c.color]} selected={cat === c.id} onPress={() => setCat(cat === c.id ? null : c.id)} />)}
          </ScrollView>
        ) : null}

        {groups.map((g) => (
          <Section key={g.id} title={g.title} count={g.tasks.length}>
            <List>
              {g.tasks.map((t, i) => (
                <TaskRow key={t.id} task={t} category={categoryById(state, t.categoryId)} onToggle={() => toggle(t)} onPress={() => router.push(`/tarea/${t.id}`)}
                  last={i === g.tasks.length - 1} hideCategory={!!cat} />
              ))}
            </List>
          </Section>
        ))}

        {!groups.length ? (
          <EmptyState icon={ListChecks} title={view === 'today' ? 'Nada para hoy' : 'Sin tareas aquí'}
            detail={view === 'today' ? 'Lo que llegue con plazo para hoy aparece aquí. Puedes respirar.' : 'Cuando Sol cree una tarea o anotes una, la verás aquí.'} />
        ) : null}

        {done.length ? (
          <View style={{ gap: space.md }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDone }} onPress={() => { tap(); setShowDone((v) => !v); }} style={s.doneHead}>
              <T v="calloutStrong" tone="muted" style={{ flex: 1 }}>{`${showDone ? 'Ocultar' : 'Mostrar'} completadas (${done.length})`}</T>
              <ChevronDown size={18} color={p.muted} style={{ transform: [{ rotate: showDone ? '180deg' : '0deg' }] }} />
            </Pressable>
            {showDone ? (
              <List>
                {done.slice(0, 30).map((t, i) => (
                  <TaskRow key={t.id} task={t} category={categoryById(state, t.categoryId)} onToggle={() => toggle(t)} onPress={() => router.push(`/tarea/${t.id}`)} last={i === Math.min(done.length, 30) - 1} />
                ))}
              </List>
            ) : null}
          </View>
        ) : null}
      </Screen>
      {undo ? <UndoBar text={undo.text} onUndo={() => { undo.run(); setUndo(null); }} onDismiss={dismiss} /> : null}
      <TaskComposer visible={composer} onClose={() => setComposer(false)} initial={composerInitial}
        onCreated={(t) => setUndo({ text: 'Tarea agregada', run: () => dispatch({ type: 'removeTasks', ids: [t.id] }) })} />
    </View>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.6%', flexGrow: 1, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, padding: space.lg, gap: space.md },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  add: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, borderWidth: 1, paddingLeft: space.lg, paddingRight: 4, minHeight: 54 },
  input: { flex: 1, fontFamily: 'InterTight_400Regular', fontSize: 17, paddingVertical: space.md },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chipScroll: { marginHorizontal: -space.xl },
  chips: { gap: space.sm, paddingHorizontal: space.xl },
  doneHead: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
