import { Flag, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Field, Segmented, Sheet, T, tap } from '../../components/ui';
import { addDays, dayLabel, PRIORITIES, REMINDERS, REPEATS, snoozeOptions, todayKey } from '../../data/dates';
import { parseWhen, stripWhen } from '../../data/dump';
import { activeCategories } from '../../data/select';
import { newId, useStore } from '../../data/store';
import type { Priority, ReminderOption, Repeat, Task } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { categoryColors, space } from '../../theme/tokens';
import { DateCalendar, TimeWheel } from './pickers';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <T v="captionStrong" tone="muted">{label}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.xl }} style={{ marginRight: -space.xl }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * New task, with everything a reminders app offers but nothing required:
 * type "llamar al dentista mañana a las 10" and the date fills itself in.
 */
export function TaskComposer({ visible, onClose, onCreated, initial }: {
  visible: boolean; onClose: () => void; onCreated?: (t: Task) => void; initial?: Partial<Task>;
}) {
  const { p } = useTheme();
  const { state, addTasks } = useStore();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string | undefined>(todayKey());
  const [time, setTime] = useState<string | undefined>();
  const [reminder, setReminder] = useState<ReminderOption>('none');
  const [repeat, setRepeat] = useState<Repeat>('never');
  const [priority, setPriority] = useState<Priority>('none');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? ''); setNotes(initial?.notes ?? ''); setDate(initial?.date ?? todayKey()); setTime(initial?.time);
    setReminder(initial?.reminder ?? 'none'); setRepeat(initial?.repeat ?? 'never'); setPriority(initial?.priority ?? 'none');
    setCategoryId(initial?.categoryId ?? null); setFlagged(initial?.flagged ?? false); setPicking(null); setAuto(true);
  }, [visible, initial]);

  // Natural language: a date said in the title fills the fields, until the person picks by hand.
  const when = parseWhen(title);
  useEffect(() => {
    if (!auto) return;
    if (when.date) setDate(when.date);
    if (when.time) { setTime(when.time); setReminder((r) => (r === 'none' ? 'at' : r)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [when.date, when.time, auto]);

  const save = () => {
    const clean = auto ? stripWhen(title.trim(), when) : title.trim();
    if (!clean) return;
    const task: Task = {
      id: newId('t'), title: clean, notes: notes.trim() || undefined, categoryId, source: 'you', sourceLabel: 'Lo anotaste tú',
      date, time: date ? time : undefined, reminder: date ? reminder : 'none', repeat: date ? repeat : 'never', priority, flagged,
      done: false, createdAt: new Date().toISOString(),
    };
    tap('success');
    addTasks([task]);
    onCreated?.(task);
    onClose();
  };

  const today = todayKey();
  const quick = snoozeOptions().filter((o) => o.id === 'weekend' || o.id === 'nextweek');
  const pickDate = (d?: string) => { setAuto(false); setDate(d); if (!d) { setTime(undefined); setReminder('none'); setRepeat('never'); } };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nueva tarea" action={{ label: 'Agregar', onPress: save, disabled: !title.trim() }}>
      <Field value={title} onChangeText={setTitle} placeholder="Qué hay que hacer" autoFocus returnKeyType="done" onSubmitEditing={save} accessibilityLabel="Título de la tarea" />
      {auto && when.matched.length ? (
        <Pressable onPress={() => setAuto(false)} accessibilityRole="button" accessibilityLabel="Quitar la fecha detectada" style={[s.detected, { backgroundColor: `${p.sol}1F` }]}>
          <T v="captionStrong" tone="sol">{`Detecté: ${[when.date && dayLabel(when.date), when.time].filter(Boolean).join(', ')}`}</T>
          <X size={13} color={p.sol} />
        </Pressable>
      ) : null}
      <Field value={notes} onChangeText={setNotes} placeholder="Notas" accessibilityLabel="Notas" style={{ minHeight: 44 }} />

      <Row label="Fecha">
        <Chip label="Hoy" selected={date === today} onPress={() => pickDate(today)} />
        <Chip label="Mañana" selected={date === addDays(today, 1)} onPress={() => pickDate(addDays(today, 1))} />
        {quick.map((o) => <Chip key={o.id} label={o.label} selected={date === o.date} onPress={() => pickDate(o.date)} />)}
        <Chip label={date && ![today, addDays(today, 1), ...quick.map((q) => q.date)].includes(date) ? dayLabel(date) : 'Elegir…'} selected={picking === 'date'} onPress={() => setPicking(picking === 'date' ? null : 'date')} />
        <Chip label="Sin fecha" selected={!date} onPress={() => pickDate(undefined)} />
      </Row>
      {picking === 'date' ? <DateCalendar value={date} onChange={(k) => { pickDate(k); setPicking(null); }} /> : null}

      {date ? (
        <>
          <Row label="Hora">
            <Chip label="Sin hora" selected={!time} onPress={() => { setAuto(false); setTime(undefined); }} />
            {['09:00', '13:00', '18:00'].map((t) => <Chip key={t} label={t} selected={time === t} onPress={() => { setAuto(false); setTime(t); if (reminder === 'none') setReminder('at'); }} />)}
            <Chip label={time && !['09:00', '13:00', '18:00'].includes(time) ? time : 'Otra…'} selected={picking === 'time'} onPress={() => { setPicking(picking === 'time' ? null : 'time'); if (!time) setTime('10:00'); }} />
          </Row>
          {picking === 'time' && time ? <TimeWheel value={time} onChange={(t) => { setAuto(false); setTime(t); }} /> : null}
          <Row label="Aviso">
            {REMINDERS.filter((r) => ['none', 'at', '15m', '1h', '1d'].includes(r.id)).map((r) => (
              <Chip key={r.id} label={r.short} selected={reminder === r.id} onPress={() => setReminder(r.id)} />
            ))}
          </Row>
          <Row label="Repetir">
            {REPEATS.map((r) => <Chip key={r.id} label={r.label} selected={repeat === r.id} onPress={() => setRepeat(r.id)} />)}
          </Row>
        </>
      ) : null}

      <View style={{ gap: space.sm }}>
        <T v="captionStrong" tone="muted">Prioridad</T>
        <Segmented options={PRIORITIES.map((x) => ({ id: x.id, label: x.marks || 'Ninguna' }))} value={priority} onChange={setPriority} />
      </View>

      <Row label="Categoría">
        <Chip label="Sin categoría" selected={!categoryId} onPress={() => setCategoryId(null)} />
        {activeCategories(state).filter((c) => c.action !== 'ignore').map((c) => (
          <Chip key={c.id} label={c.name} dot={categoryColors[c.color]} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </Row>

      <View style={{ flexDirection: 'row' }}>
        <Chip label={flagged ? 'Marcada' : 'Marcar'} icon={Flag} tone="sol" selected={flagged} onPress={() => setFlagged(!flagged)} />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  detected: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: -space.sm },
});
