import { router, useLocalSearchParams } from 'expo-router';
import {
  Bell, Calendar, Clock, Flag, ListChecks, ListTree, Plus, Repeat as RepeatIcon, Tag, Timer, Trash2, TriangleAlert, X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import {
  Avatar, Button, CategoryTag, CheckCircle, EmptyState, Glass, IconTile, List, ListRow, OptionRow, Screen, Section, Sheet, T, tap,
} from '../../components/ui';
import {
  cap, dayLabel, isOverdue, keyOf, PRIORITIES, priorityLabel, REMINDERS, reminderLabel, REPEATS, repeatLabel, snoozeOptions, stamp, timeOf, todayKey,
} from '../../data/dates';
import { categoryById } from '../../data/select';
import { newId, useStore } from '../../data/store';
import type { Task } from '../../data/types';
import { CategoryPicker } from '../../features/inbox/category-picker';
import { confirm } from '../../features/settings/confirm';
import { DateCalendar, TimeWheel } from '../../features/tasks/pickers';
import { askReminderPermission } from '../../features/tasks/reminders';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

type Picker = 'reminder' | 'repeat' | 'priority' | 'snooze' | null;

/** Settings-style row with a switch; tapping the text opens its picker (the value turns Sol-colored while open). */
function SwitchRow({ icon: Icon, color, title, detail, value, onChange, open, onToggleOpen, disabled, last }: {
  icon: typeof Calendar; color: string; title: string; detail?: string; value: boolean; onChange: (v: boolean) => void;
  open: boolean; onToggleOpen: () => void; disabled?: boolean; last?: boolean;
}) {
  const { p } = useTheme();
  return (
    <View style={[s.switchRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }, disabled && { opacity: 0.45 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}${detail ? `: ${detail}` : ''}`} onPress={() => { tap(); onToggleOpen(); }} style={s.switchText} disabled={disabled}>
        <IconTile icon={Icon} color={color} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="body">{title}</T>
          {detail ? <T v="calloutStrong" tone={open ? 'sol' : 'muted'}>{detail}</T> : null}
        </View>
      </Pressable>
      <Switch value={value} disabled={disabled} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: p.calm, false: p.surface }} ios_backgroundColor={p.surface} accessibilityLabel={title} />
    </View>
  );
}

/**
 * A task in full, Reminders style: edit in place, every change saved as you
 * make it. If it came from a message, the original is right here to check.
 */
export default function Tarea() {
  const { p } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch, toggleTask } = useStore();
  const task = state.tasks.find((t) => t.id === id);
  const [expand, setExpand] = useState<'date' | 'time' | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [cats, setCats] = useState(false);
  const [sub, setSub] = useState('');

  if (!task) {
    return (
      <Screen padBottom={false}>
        <Header />
        <EmptyState icon={ListChecks} title="Esta tarea ya no está" detail="Puede que la hayas eliminado." />
      </Screen>
    );
  }

  const set = (patch: Partial<Task>) => dispatch({ type: 'updateTask', id: task.id, patch });
  const item = task.itemId ? state.items.find((i) => i.id === task.itemId) : undefined;
  const category = categoryById(state, task.categoryId);
  const overdue = isOverdue(task);

  const setReminder = async (r: Task['reminder']) => {
    set({ reminder: r });
    setPicker(null);
    if (r !== 'none') await askReminderPermission();
  };

  const remove = () => confirm('Eliminar tarea', `"${task.title}" se elimina de tus tareas.`, () => {
    dispatch({ type: 'removeTasks', ids: [task.id] });
    router.back();
  }, 'Eliminar');

  const addSub = () => {
    const title = sub.trim();
    if (!title) return;
    tap('light');
    set({ subtasks: [...(task.subtasks ?? []), { id: newId('s'), title, done: false }] });
    setSub('');
  };

  return (
    <Screen padBottom={false}>
      <Header right={<Pressable accessibilityRole="button" onPress={() => { tap(); router.back(); }} hitSlop={12}><T v="bodyStrong" tone="sol">Listo</T></Pressable>} />

      <View style={s.titleRow}>
        <View style={{ paddingTop: 6 }}>
          <CheckCircle done={task.done} onPress={() => toggleTask(task.id)} color={category ? categoryColors[category.color] : p.ink} label={task.done ? 'Desmarcar' : 'Completar'} />
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <TextInput value={task.title} onChangeText={(title) => set({ title })} multiline selectionColor={p.sol} accessibilityLabel="Título"
            style={[s.title, { color: task.done ? p.faint : p.ink }, task.done && { textDecorationLine: 'line-through' }]} />
          <TextInput value={task.notes ?? ''} onChangeText={(notes) => set({ notes })} placeholder="Notas" placeholderTextColor={p.faint} multiline selectionColor={p.sol}
            accessibilityLabel="Notas" style={[s.notes, { color: p.muted }]} />
        </View>
      </View>

      {overdue ? (
        <View style={[s.overdue, { backgroundColor: p.urgentSoft }]}>
          <TriangleAlert size={16} color={p.urgent} />
          <T v="calloutStrong" tone="urgent" style={{ flex: 1 }}>{`Vencida desde ${dayLabel(task.date!).toLowerCase()}${task.time ? `, ${task.time}` : ''}`}</T>
          <Pressable onPress={() => setPicker('snooze')} hitSlop={8}><T v="calloutStrong" tone="urgent">Posponer</T></Pressable>
        </View>
      ) : null}

      {task.why || item ? (
        <Glass style={s.origin}>
          <View style={s.originHead}>
            <SolOrb size={16} state="watching" style={{ margin: -7 }} />
            <T v="captionStrong" tone="sol" style={{ flex: 1 }}>{task.source === 'you' || task.source === 'voice' ? 'Nota de Sol' : 'Por qué está aquí'}</T>
          </View>
          {task.why ? <T v="callout">{task.why}</T> : null}
          {item ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Ver el mensaje original" onPress={() => { tap(); router.push(`/entrada/${item.id}`); }}
              style={({ pressed }) => [s.quote, { backgroundColor: p.surface, borderColor: p.line }, pressed && { opacity: 0.7 }]}>
              <View style={s.quoteHead}>
                <Avatar name={item.from.name} size={24} />
                <T v="captionStrong" numberOfLines={1} style={{ flex: 1 }}>{item.from.name}{item.direct ? '' : <T v="caption" tone="faint">{`  ${item.channel}`}</T>}</T>
                <T v="caption" tone="faint">{stamp(item.receivedAt)}</T>
              </View>
              {item.subject ? <T v="calloutStrong" numberOfLines={1}>{item.subject}</T> : null}
              <T v="callout" tone="muted" numberOfLines={3}>{item.body}</T>
              <T v="captionStrong" tone="sol">Ver mensaje completo</T>
            </Pressable>
          ) : null}
        </Glass>
      ) : null}

      <List>
        <SwitchRow icon={Calendar} color={categoryColors.red} title="Fecha" detail={task.date ? cap(dayLabel(task.date)) : undefined} open={expand === 'date'}
          value={!!task.date} onToggleOpen={() => task.date && setExpand(expand === 'date' ? null : 'date')}
          onChange={(on) => { set(on ? { date: todayKey() } : { date: undefined, time: undefined, reminder: 'none', repeat: 'never' }); setExpand(on ? 'date' : null); }} />
        {task.date && expand === 'date' ? <View style={[s.expand, { borderBottomColor: p.line }]}><DateCalendar value={task.date} onChange={(date) => set({ date })} /></View> : null}
        <SwitchRow icon={Clock} color={categoryColors.blue} title="Hora" detail={task.time} open={expand === 'time'} disabled={!task.date} last={!task.date}
          value={!!task.time} onToggleOpen={() => task.time && setExpand(expand === 'time' ? null : 'time')}
          onChange={(on) => { set(on ? { time: '09:00', reminder: task.reminder === 'none' ? 'at' : task.reminder } : { time: undefined }); setExpand(on ? 'time' : null); }} />
        {task.time && expand === 'time' ? <View style={[s.expand, { borderBottomColor: p.line }]}><TimeWheel value={task.time} onChange={(time) => set({ time })} /></View> : null}
        {task.date ? (
          <>
            <ListRow icon={Bell} iconColor={categoryColors.orange} title="Aviso" value={reminderLabel(task.reminder)} onPress={() => setPicker('reminder')} />
            <ListRow icon={RepeatIcon} iconColor={categoryColors.gray} title="Repetir" value={repeatLabel(task.repeat)} onPress={() => setPicker('repeat')} last />
          </>
        ) : null}
      </List>

      <List>
        <ListRow icon={Flag} iconColor={categoryColors.orange} title="Marcar como importante"
          right={<Switch value={task.flagged} onValueChange={(flagged) => { tap(); set({ flagged }); }} trackColor={{ true: p.calm, false: p.surface }} ios_backgroundColor={p.surface} accessibilityLabel="Importante" />} />
        <ListRow icon={TriangleAlert} iconColor={categoryColors.red} title="Prioridad" value={priorityLabel(task.priority)} onPress={() => setPicker('priority')} />
        <ListRow icon={Tag} iconColor={category ? categoryColors[category.color] : p.muted} title="Categoría"
          right={category ? <CategoryTag name={category.name} color={category.color} small /> : <T v="callout" tone="muted">Ninguna</T>} onPress={() => setCats(true)} last />
      </List>

      <Section title="Subtareas" count={task.subtasks?.length || undefined}>
        <List>
          {task.subtasks?.map((x) => (
            <View key={x.id} style={[s.sub, { borderBottomColor: p.line }]}>
              <CheckCircle done={x.done} onPress={() => set({ subtasks: task.subtasks!.map((y) => (y.id === x.id ? { ...y, done: !y.done } : y)) })} label={x.title} />
              <T v="body" tone={x.done ? 'faint' : 'ink'} style={[{ flex: 1 }, x.done && { textDecorationLine: 'line-through' }]}>{x.title}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${x.title}`} hitSlop={10} onPress={() => { tap(); set({ subtasks: task.subtasks!.filter((y) => y.id !== x.id) }); }}>
                <X size={16} color={p.faint} />
              </Pressable>
            </View>
          ))}
          <View style={s.sub}>
            <ListTree size={20} color={p.faint} />
            <TextInput value={sub} onChangeText={setSub} onSubmitEditing={addSub} placeholder="Agregar subtarea" placeholderTextColor={p.faint} returnKeyType="done"
              selectionColor={p.sol} style={[s.subInput, { color: p.ink }]} accessibilityLabel="Agregar subtarea" />
            {sub.trim() ? <Pressable onPress={addSub} hitSlop={8} accessibilityRole="button" accessibilityLabel="Agregar"><Plus size={20} color={p.sol} /></Pressable> : null}
          </View>
        </List>
      </Section>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {!task.done ? <Button kind="secondary" label="Posponer" icon={Timer} onPress={() => setPicker('snooze')} style={{ flex: 1 }} /> : null}
        <Button kind={task.done ? 'secondary' : 'primary'} label={task.done ? 'Marcar pendiente' : 'Completar'} onPress={() => { toggleTask(task.id); if (!task.done) router.back(); }} style={{ flex: 1 }} />
      </View>

      <List>
        <ListRow icon={Trash2} iconTone="urgent" titleTone="urgent" title="Eliminar tarea" onPress={remove} last />
      </List>

      <T v="caption" tone="faint" style={{ textAlign: 'center' }}>
        {`${task.source === 'you' ? 'La anotaste tú' : task.source === 'voice' ? 'La dictaste tú' : `La creó Sol desde ${task.sourceLabel.split(' · ')[1] ?? 'un mensaje'}`} · ${cap(dayLabel(keyOf(new Date(task.createdAt))))} ${timeOf(task.createdAt)}`}
      </T>
      <View style={{ height: space.xxxl }} />

      <Sheet visible={picker === 'reminder'} onClose={() => setPicker(null)} title="Aviso">
        <List>
          {REMINDERS.map((r, i) => <OptionRow key={r.id} title={r.label} selected={task.reminder === r.id} onPress={() => void setReminder(r.id)} last={i === REMINDERS.length - 1} />)}
        </List>
        <T v="caption" tone="faint">{task.time ? 'El aviso llega como notificación en este teléfono.' : 'Sin hora, el aviso llega a las 09:00 del día.'}</T>
      </Sheet>
      <Sheet visible={picker === 'repeat'} onClose={() => setPicker(null)} title="Repetir">
        <List>
          {REPEATS.map((r, i) => <OptionRow key={r.id} title={r.label} selected={task.repeat === r.id} onPress={() => { set({ repeat: r.id }); setPicker(null); }} last={i === REPEATS.length - 1} />)}
        </List>
        <T v="caption" tone="faint">Al completarla, la siguiente queda agendada sola.</T>
      </Sheet>
      <Sheet visible={picker === 'priority'} onClose={() => setPicker(null)} title="Prioridad">
        <List>
          {PRIORITIES.map((r, i) => <OptionRow key={r.id} title={r.label} detail={r.marks || undefined} selected={task.priority === r.id} onPress={() => { set({ priority: r.id }); setPicker(null); }} last={i === PRIORITIES.length - 1} />)}
        </List>
      </Sheet>
      <Sheet visible={picker === 'snooze'} onClose={() => setPicker(null)} title="Posponer">
        <List>
          {snoozeOptions().map((o, i, all) => (
            <ListRow key={o.id} title={o.label} value={o.detail} onPress={() => { tap('success'); set({ date: o.date, time: o.time ?? task.time }); setPicker(null); }} last={i === all.length - 1} />
          ))}
        </List>
      </Sheet>
      <CategoryPicker visible={cats} onClose={() => setCats(false)} value={task.categoryId ?? null} onPick={(categoryId) => set({ categoryId })} />
    </Screen>
  );
}

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  title: { fontFamily: 'InterTight_700Bold', fontSize: 26, lineHeight: 31, letterSpacing: -0.8, padding: 0 },
  notes: { fontFamily: 'InterTight_400Regular', fontSize: 17, lineHeight: 24, padding: 0, minHeight: 24 },
  overdue: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, padding: space.md, marginTop: -space.lg },
  origin: { padding: space.lg, gap: space.md, borderRadius: radius.lg },
  originHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  quote: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: 6 },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingRight: space.lg, minHeight: 60 },
  switchText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg, paddingVertical: space.md },
  expand: { padding: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  sub: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  subInput: { flex: 1, fontFamily: 'InterTight_400Regular', fontSize: 17, paddingVertical: space.md },
});
