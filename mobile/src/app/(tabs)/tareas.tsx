import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Chip, List, Screen, T, tap } from '../../components/ui';
import { dumpToTasks } from '../../data/dump';
import { useStore } from '../../data/store';
import { GROUPS, groupOf, matches, type SourceFilter } from '../../features/tasks/logic';
import { TaskRow } from '../../features/tasks/task-row';
import { UndoBar } from '../../features/tasks/undo-bar';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

const FILTERS: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Correo' },
  { id: 'you', label: 'Tú' },
];

/** The list Sol keeps in order. Adding is one line; checking is one tap. */
export default function Tareas() {
  const { p } = useTheme();
  const { state, toggleTask, addTasks, dispatch } = useStore();
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [draft, setDraft] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null);
  const dismiss = useCallback(() => setUndo(null), []);

  const visible = useMemo(() => state.tasks.filter((t) => matches(t, filter)), [state.tasks, filter]);
  const open = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done);
  const groups = GROUPS.map((g) => ({ ...g, items: open.filter((t) => groupOf(t.due) === g.id) }));

  const toggle = (id: string, title: string, wasDone: boolean) => {
    toggleTask(id);
    setUndo({ text: wasDone ? 'Volvió a tus tareas' : `Hecha: ${title}`, run: () => toggleTask(id) });
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const { tasks } = dumpToTasks(text, 'you');
    if (!tasks.length) return;
    addTasks(tasks);
    tap('success');
    setDraft('');
    const ids = tasks.map((t) => t.id);
    setUndo({ text: tasks.length === 1 ? 'Anotada' : `Anoté ${tasks.length} tareas`, run: () => dispatch({ type: 'removeTasks', ids }) });
  };

  const openTask = (id: string) => router.push({ pathname: '/tarea/[id]', params: { id } });

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Screen>
        <View style={{ gap: space.xs }}>
          <T v="title" accessibilityRole="header">Tareas</T>
          <T tone="muted">Las ordeno yo, con lo que llega por WhatsApp, correo y lo que me dictas.</T>
        </View>

        <View style={{ gap: space.md }}>
          <View style={[s.add, { backgroundColor: p.surface, borderColor: p.line }]}>
            <Plus size={20} color={p.accent} strokeWidth={2.4} />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              returnKeyType="done"
              placeholder="Agregar una tarea"
              placeholderTextColor={p.faint}
              style={[s.input, { color: p.ink }]}
              accessibilityLabel="Agregar una tarea. Puedes escribir varias separadas por coma."
            />
            {draft.trim() ? (
              <Pressable accessibilityRole="button" onPress={add} hitSlop={8} style={[s.addBtn, { backgroundColor: p.accent }]}>
                <T v="calloutStrong" tone="onAccent">Agregar</T>
              </Pressable>
            ) : null}
          </View>
          <T v="caption" tone="muted">Puedes escribir varias juntas: "mañana llamar al dentista y el lunes pagar la luz". Yo las separo y les pongo fecha.</T>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -space.xl }}>
          <View style={{ width: space.xl - space.sm }} />
          {FILTERS.map((f) => <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />)}
          <View style={{ width: space.xl - space.sm }} />
        </ScrollView>

        {groups.map((g) => (g.items.length || g.id === 'today' ? (
          <View key={g.id} style={{ gap: space.sm }}>
            <View style={s.groupHead}>
              <T v="h3" accessibilityRole="header">{g.label}</T>
              {g.items.length ? <T v="calloutStrong" tone="muted">{g.items.length}</T> : null}
            </View>
            {g.items.length ? (
              <List>
                {g.items.map((t, i) => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id, t.title, false)} onPress={() => openTask(t.id)} last={i === g.items.length - 1} />
                ))}
              </List>
            ) : (
              <T tone="muted">{filter === 'all' ? g.empty : 'Nada de este origen para hoy.'}</T>
            )}
          </View>
        ) : null))}

        {!open.length ? <T tone="muted">No hay tareas de este origen. Cuando llegue algo, lo verás aquí.</T> : null}

        {done.length ? (
          <View style={{ gap: space.sm }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDone }} onPress={() => { tap(); setShowDone((v) => !v); }} style={s.doneHead}>
              <T v="h3" tone="muted">Hechas · {done.length}</T>
              {showDone ? <ChevronUp size={20} color={p.muted} /> : <ChevronDown size={20} color={p.muted} />}
            </Pressable>
            {showDone ? (
              <List>
                {done.map((t, i) => (
                  <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id, t.title, true)} onPress={() => openTask(t.id)} last={i === done.length - 1} />
                ))}
              </List>
            ) : null}
          </View>
        ) : null}
      </Screen>
      {undo ? <UndoBar text={undo.text} onUndo={() => { undo.run(); setUndo(null); }} onDismiss={dismiss} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  add: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, borderWidth: 1, paddingLeft: space.lg, paddingRight: 6, minHeight: 56 },
  input: { flex: 1, fontFamily: 'InterTight_400Regular', fontSize: 17, paddingVertical: space.md },
  addBtn: { minHeight: 44, borderRadius: radius.sm, paddingHorizontal: space.lg, justifyContent: 'center' },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  doneHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
});
