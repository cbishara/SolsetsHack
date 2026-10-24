import { Bell, Flag, ListTree, Repeat as RepeatIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { CategoryTag, CheckCircle, sourceIcon, T, tap } from '../../components/ui';
import { dueLabel, isOverdue, PRIORITIES } from '../../data/dates';
import type { Category, Task } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { categoryColors, space } from '../../theme/tokens';

/**
 * One task, Reminders style: a round check, the title with its priority marks,
 * and one quiet line with date, repeat, reminder, category and where it came from.
 */
export function TaskRow({ task, category, onToggle, onPress, last, showWhy, hideCategory, hideSource }: {
  task: Task; category?: Category; onToggle: () => void; onPress: () => void; last?: boolean; showWhy?: boolean; hideCategory?: boolean; hideSource?: boolean;
}) {
  const { p } = useTheme();
  const overdue = isOverdue(task);
  const due = dueLabel(task);
  const marks = PRIORITIES.find((x) => x.id === task.priority)?.marks;
  const SourceIcon = sourceIcon(task.source);
  const sub = task.subtasks?.length ? `${task.subtasks.filter((x) => x.done).length}/${task.subtasks.length}` : null;
  const checkColor = category ? categoryColors[category.color] : p.ink;
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      <View style={s.check}>
        <CheckCircle done={task.done} onPress={onToggle} color={checkColor} label={`${task.done ? 'Desmarcar' : 'Completar'}: ${task.title}`} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}${due ? `. ${due}` : ''}. ${task.sourceLabel}`}
        accessibilityHint="Abre el detalle"
        onPress={() => { tap(); onPress(); }}
        style={({ pressed }) => [{ flex: 1, gap: 5 }, pressed && { opacity: 0.6 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
          <T v="body" tone={task.done ? 'faint' : 'ink'} style={[{ flex: 1 }, task.done && { textDecorationLine: 'line-through' }]} numberOfLines={2}>
            {marks && !task.done ? <T v="bodyStrong" tone="sol">{marks} </T> : null}
            {task.title}
          </T>
          {task.flagged && !task.done ? <Flag size={15} color={p.sol} fill={p.sol} style={{ marginTop: 4 }} /> : null}
        </View>
        {showWhy && task.why && !task.done ? <T v="callout" tone="muted" numberOfLines={2}>{task.why}</T> : null}
        <View style={s.meta}>
          {due ? <T v="captionStrong" tone={overdue ? 'urgent' : task.done ? 'faint' : 'muted'}>{overdue ? `Vencida · ${due}` : due}</T> : null}
          {task.repeat !== 'never' ? <RepeatIcon size={12} color={p.faint} strokeWidth={2.4} /> : null}
          {task.reminder !== 'none' && task.date && !task.done ? <Bell size={12} color={p.faint} strokeWidth={2.4} /> : null}
          {sub ? (
            <View style={s.inline}>
              <ListTree size={12} color={p.faint} strokeWidth={2.4} />
              <T v="caption" tone="faint">{sub}</T>
            </View>
          ) : null}
          {category && !hideCategory ? <CategoryTag name={category.name} color={category.color} small /> : null}
          {!hideSource ? (
            <View style={[s.inline, { flexShrink: 1 }]}>
              <SourceIcon size={12} color={p.faint} strokeWidth={2.4} />
              <T v="caption" tone="faint" numberOfLines={1} style={{ flexShrink: 1 }}>{task.sourceLabel.split(' · ')[0]}</T>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md + 2 },
  check: { paddingTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
