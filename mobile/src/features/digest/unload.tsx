import { router } from 'expo-router';
import { Check, Mic } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useBackend } from '../../api/backend';
import { SolOrb } from '../../components/sol-orb';
import { Glass, T, tap } from '../../components/ui';
import { dueLabel } from '../../data/dates';
import { dumpToTasks } from '../../data/dump';
import { useStore } from '../../data/store';
import type { Task } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

/**
 * "¿Algo más en la cabeza?": the place to unload what did not arrive by any
 * channel. Write it as it comes; Sol splits it into dated tasks right away.
 */
export function Unload({ title = '¿Algo más en la cabeza?', detail = 'Escríbelo o díctalo como salga. Lo anoto con fecha y mañana te lo muestro, para que puedas desconectarte.' }: { title?: string; detail?: string }) {
  const { p } = useTheme();
  const { addTasks, dispatch } = useStore();
  const backend = useBackend();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<Task[] | null>(null);

  const save = () => {
    const clean = text.trim();
    if (!clean) return;
    const { tasks } = dumpToTasks(clean, 'you');
    if (!tasks.length) return;
    tap('success');
    addTasks(tasks);
    backend.saveWorries(tasks.map((t) => t.title));
    setSaved(tasks);
    setText('');
  };

  return (
    <Glass strong style={s.card}>
      <View style={s.head}>
        <SolOrb size={16} state="watching" style={{ margin: -7 }} />
        <T v="bodyStrong" style={{ flex: 1 }}>{title}</T>
      </View>
      <T v="callout" tone="muted">{detail}</T>
      <View style={[s.input, { backgroundColor: p.surface, borderColor: p.line }]}>
        <TextInput value={text} onChangeText={(v) => { setText(v); if (saved) setSaved(null); }} multiline placeholder="Ej: mañana llamar al dentista y el viernes pagar la luz"
          placeholderTextColor={p.faint} selectionColor={p.sol} style={[s.text, { color: p.ink }]} accessibilityLabel="Lo que tienes en la cabeza" />
        <View style={s.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dictar" onPress={() => { tap('light'); router.push({ pathname: '/sol', params: { voice: '1' } }); }} hitSlop={8}
            style={({ pressed }) => [s.mic, { borderColor: p.line }, pressed && { opacity: 0.7 }]}>
            <Mic size={18} color={p.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Anotar" disabled={!text.trim()} onPress={save}
            style={({ pressed }) => [s.send, { backgroundColor: text.trim() ? p.sol : p.surface }, pressed && { opacity: 0.8 }]}>
            <T v="calloutStrong" style={{ color: text.trim() ? p.onSol : p.faint }}>Anotar</T>
          </Pressable>
        </View>
      </View>
      {saved ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: space.sm }}>
          <T v="captionStrong" tone="calm">{saved.length === 1 ? 'Anoté 1 tarea' : `Anoté ${saved.length} tareas`}</T>
          {saved.map((t) => (
            <Pressable key={t.id} accessibilityRole="button" onPress={() => { tap(); router.push(`/tarea/${t.id}`); }} style={s.saved}>
              <Check size={15} color={p.calm} strokeWidth={2.8} />
              <T v="callout" style={{ flex: 1 }} numberOfLines={1}>{t.title}</T>
              <T v="caption" tone="muted">{dueLabel(t) ?? 'Sin fecha'}</T>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => { tap(); dispatch({ type: 'removeTasks', ids: saved.map((t) => t.id) }); setSaved(null); }} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <T v="calloutStrong" tone="faint">Deshacer</T>
          </Pressable>
        </Animated.View>
      ) : null}
    </Glass>
  );
}

const s = StyleSheet.create({
  card: { padding: space.xl, gap: space.md, borderRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, gap: space.sm },
  text: { minHeight: 72, fontFamily: 'InterTight_400Regular', fontSize: 17, lineHeight: 24, textAlignVertical: 'top', padding: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.sm },
  mic: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  send: { borderRadius: radius.pill, paddingHorizontal: space.lg, height: 40, justifyContent: 'center' },
  saved: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
});
