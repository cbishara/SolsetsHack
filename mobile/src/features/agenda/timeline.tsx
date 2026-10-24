import { router } from 'expo-router';
import { Briefcase, Check, MapPin, Moon, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { SourceTag, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';
import type { DayItem } from './day-items';

/** The selected day as a vertical timeline (Structured-style rail). */
export function Timeline({ items }: { items: DayItem[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <TimelineRow key={item.id} item={item} last={i === items.length - 1} />
      ))}
    </View>
  );
}

function TimelineRow({ item, last }: { item: DayItem; last: boolean }) {
  const { p } = useTheme();
  const time = item.kind === 'task' ? item.time : item.start;
  const end = item.kind === 'task' ? undefined : item.end;
  const nodeColor = item.kind === 'shift' && item.onCall ? p.sol : item.kind === 'task' ? p.faint : p.accent;

  return (
    <View style={s.row}>
      <View style={s.timeCol}>
        <T v="calloutStrong" style={{ fontVariant: ['tabular-nums'] }}>{time ?? 'Hoy'}</T>
        {end ? <T v="caption" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>{end}</T> : null}
      </View>
      <View style={s.rail}>
        <View style={[s.node, { backgroundColor: nodeColor, borderColor: p.bg }]} />
        {!last ? <View style={[s.line, { backgroundColor: p.line }]} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : space.lg }}>
        {item.kind === 'task' ? <TaskBlock item={item} /> : item.kind === 'shift' ? <ShiftBlock item={item} /> : <EventBlock item={item} />}
      </View>
    </View>
  );
}

function ShiftBlock({ item }: { item: Extract<DayItem, { kind: 'shift' }> }) {
  const { p } = useTheme();
  const Icon = item.onCall ? Moon : Briefcase;
  return (
    <View style={[s.block, { backgroundColor: item.onCall ? p.surface : p.card, borderColor: p.line }]}
      accessibilityLabel={`${item.title}, de ${item.start} a ${item.end}. ${item.detail}`}>
      <View style={s.blockHead}>
        <View style={[s.icon, { backgroundColor: item.onCall ? p.sol : p.accentSoft }]}>
          <Icon size={16} color={item.onCall ? p.onSol : p.accent} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{item.title}</T>
          <T v="callout" tone="muted">{item.detail}</T>
        </View>
      </View>
      <SourceTag source={item.source} label="Calendario de turnos" />
    </View>
  );
}

function EventBlock({ item }: { item: Extract<DayItem, { kind: 'event' }> }) {
  const { p } = useTheme();
  const Icon = item.personal ? Users : Briefcase;
  return (
    <View style={[s.block, { backgroundColor: p.card, borderColor: p.line }]}>
      <View style={s.blockHead}>
        <View style={[s.icon, { backgroundColor: p.accentSoft }]}><Icon size={16} color={p.accent} strokeWidth={2.2} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{item.title}</T>
          {item.place ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} color={p.muted} />
              <T v="callout" tone="muted">{item.place}</T>
            </View>
          ) : null}
        </View>
      </View>
      <SourceTag source={item.source} label={item.source === 'email' ? 'Sol lo sacó de un correo' : 'Calendario'} />
    </View>
  );
}

function TaskBlock({ item }: { item: Extract<DayItem, { kind: 'task' }> }) {
  const { p } = useTheme();
  const { toggleTask } = useStore();
  const t = item.task;
  return (
    <View style={[s.taskRow, { borderColor: p.line }]}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={`Marcar ${t.title}`}
        onPress={() => { tap(t.done ? 'select' : 'success'); toggleTask(t.id); }} hitSlop={10}
        style={[s.check, { borderColor: t.done ? p.calm : p.accent, backgroundColor: t.done ? p.calm : 'transparent' }]}>
        {t.done ? <Check size={14} color={p.bg} strokeWidth={3} /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" style={{ flex: 1, gap: 4 }} onPress={() => { tap(); router.push(`/tarea/${t.id}`); }}>
        <T v="body" tone={t.done ? 'faint' : 'ink'} style={t.done ? { textDecorationLine: 'line-through' } : undefined}>{t.title}</T>
        <SourceTag source={t.source} label={t.sourceLabel} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  timeCol: { width: 52, alignItems: 'flex-end', paddingTop: space.md },
  rail: { width: 14, alignItems: 'center' },
  node: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginTop: space.md + 3 },
  line: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  block: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, padding: space.lg, gap: space.md },
  blockHead: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  icon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  taskRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.md, paddingHorizontal: space.xs, minHeight: 56 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
