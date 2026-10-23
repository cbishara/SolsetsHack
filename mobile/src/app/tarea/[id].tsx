import { router, useLocalSearchParams } from 'expo-router';
import { Lightbulb, MessageSquareQuote, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { Button, Card, Chip, List, Screen, Section, SourceTag, T, ToggleRow } from '../../components/ui';
import { useStore } from '../../data/store';
import type { Task } from '../../data/types';
import { dueFor } from '../../features/tasks/logic';
import { hhmm } from '../../features/today/moment';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

const DUE_CHIPS = [
  { id: 'today', label: 'Hoy' },
  { id: 'tomorrow', label: 'Mañana' },
  { id: 'week', label: 'Esta semana' },
  { id: 'someday', label: 'Sin fecha' },
] as const;

/** One task: where it came from, why it is here, and when. */
export default function TareaDetalle() {
  const { p } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, lastNight, dispatch, toggleTask } = useStore();
  const task = state.tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <Screen edges={['top', 'bottom']} padBottom={false}>
        <Header />
        <T v="title">No encontré esta tarea</T>
        <T tone="muted">Puede que la hayas borrado o deshecho.</T>
        <Button kind="secondary" label="Ir a Tareas" onPress={() => router.replace('/tareas')} />
      </Screen>
    );
  }

  const origin = lastNight.find((h) => h.taskId === task.id);
  const created = new Date(task.createdAt);
  const update = (patch: Partial<Task>) => dispatch({ type: 'updateTask', id: task.id, patch });

  return (
    <Screen edges={['top', 'bottom']} padBottom={false}>
      <Header />

      <View style={{ gap: space.md }}>
        <SourceTag source={task.source} label={task.sourceLabel} />
        <T v="title" accessibilityRole="header" style={task.done ? { textDecorationLine: 'line-through' } : undefined}>{task.title}</T>
        {task.detail ? <T tone="muted">{task.detail}</T> : null}
      </View>

      {origin ? (
        <Section eyebrow="De dónde salió">
          <Card tone="surface">
            <View style={s.inline}>
              <MessageSquareQuote size={18} color={p.muted} />
              <T v="caption" tone="muted">
                {origin.from}{origin.group ? ` en ${origin.group}` : ''} · {created.toLocaleDateString('es-CL', { weekday: 'long' })} {hhmm(origin.at)}
              </T>
            </View>
            <T>"{origin.text}"</T>
          </Card>
        </Section>
      ) : (
        <T v="callout" tone="muted">
          {task.source === 'voice' || task.source === 'you' ? 'La anotaste tú' : `Llegó por ${task.sourceLabel}`}, el {created.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}.
        </T>
      )}

      {task.why || origin?.reason ? (
        <Section eyebrow="Por qué la puse aquí">
          <View style={s.inline}>
            <Lightbulb size={18} color={p.accent} />
            <T style={{ flex: 1 }}>{task.why ?? origin?.reason}</T>
          </View>
        </Section>
      ) : null}

      <Section eyebrow="Cuándo" title={task.due.label}>
        <View style={s.chips}>
          {DUE_CHIPS.map((c) => (
            <Chip key={c.id} label={c.label} selected={task.due.kind === c.id || (c.id === 'tomorrow' && task.due.label === 'Mañana')}
              onPress={() => update({ due: dueFor(c.id) })} />
          ))}
        </View>
      </Section>

      <List>
        <ToggleRow title="Importante" detail="Aparece arriba en Hoy" value={task.important} onChange={(v) => update({ important: v })} last />
      </List>

      <View style={{ gap: space.md }}>
        <Button
          kind={task.done ? 'secondary' : 'primary'}
          label={task.done ? 'Volver a pendientes' : 'Marcar como hecha'}
          icon={task.done ? undefined : Star}
          onPress={() => { toggleTask(task.id); if (!task.done) router.back(); }}
        />
        <Button kind="ghost" label="Borrar tarea" onPress={() => { dispatch({ type: 'removeTasks', ids: [task.id] }); router.back(); }} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
