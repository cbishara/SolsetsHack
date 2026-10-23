import { Check, CalendarClock } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { SourceTag, T, tap } from '../../components/ui';
import type { Task } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

/** Round check, one tap. 48pt target even though the box is 24. */
export function CheckBox({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  const { p } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      onPress={() => { tap(done ? 'select' : 'success'); onToggle(); }}
      hitSlop={12}
      style={s.checkHit}
    >
      <View style={[s.check, { borderColor: done ? p.calm : p.accent, backgroundColor: done ? p.calm : 'transparent' }]}>
        {done ? <Check size={15} color={p.bg} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

/** One task: check, title, and a quiet line with date, origin and (optionally) why. */
export function TaskRow({ task, onToggle, onPress, showWhy, last }: {
  task: Task; onToggle: () => void; onPress: () => void; showWhy?: boolean; last?: boolean;
}) {
  const { p } = useTheme();
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      <CheckBox done={task.done} onToggle={onToggle} label={`${task.done ? 'Desmarcar' : 'Marcar hecha'}: ${task.title}`} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}. ${task.due.label}. ${task.sourceLabel}`}
        accessibilityHint="Abre el detalle"
        onPress={() => { tap(); onPress(); }}
        style={({ pressed }) => [{ flex: 1, gap: 4, paddingVertical: space.xs }, pressed && { opacity: 0.6 }]}
      >
        <T v="body" tone={task.done ? 'faint' : 'ink'} style={task.done ? { textDecorationLine: 'line-through' } : undefined}>{task.title}</T>
        {showWhy && task.why && !task.done ? <T v="callout" tone="muted">{task.why}</T> : null}
        <View style={s.meta}>
          <View style={s.due}>
            <CalendarClock size={13} color={task.done ? p.faint : p.accent} strokeWidth={2.2} />
            <T v="caption" tone={task.done ? 'faint' : 'accent'}>{task.due.label}</T>
          </View>
          <SourceTag source={task.source} label={task.sourceLabel} />
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md },
  checkHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6 },
  check: { width: 24, height: 24, borderRadius: radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  due: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
