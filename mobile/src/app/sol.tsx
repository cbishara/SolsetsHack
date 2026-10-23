import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUp, CalendarClock, Mic, Square, Sun, Undo2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, IconButton, SourceTag, T, tap } from '../components/ui';
import { dumpToTasks } from '../data/dump';
import { useStore } from '../data/store';
import type { Task } from '../data/types';
import { useTheme } from '../theme/theme';
import { radius, space } from '../theme/tokens';

type Msg =
  | { id: string; from: 'sol' | 'me'; text: string; voice?: boolean }
  | { id: string; from: 'tasks'; tasks: Task[]; undone?: boolean };

// Demo transcript: Expo Go has no speech recognition. The real one comes from
// WhatsApp voice notes (transcribed by the provider) or a development build.
const SAMPLE_VOICE = 'Mañana tengo que llamar a CertiSur por el certificado, comprar el regalo de Tomás esta semana y el lunes mandar el informe de tickets';

const uid = () => Math.random().toString(36).slice(2, 9);

export default function Sol() {
  const { p, scheme } = useTheme();
  const { voice } = useLocalSearchParams<{ voice?: string }>();
  const { state, addTasks, dispatch, events } = useStore();
  const [draft, setDraft] = useState('');
  const [recording, setRecording] = useState(voice === '1');
  const [seconds, setSeconds] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const night = scheme === 'night';
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'hello', from: 'sol',
      text: night
        ? 'Antes de dormir, suelta lo que te da vueltas. Yo lo anoto con fecha y mañana te lo muestro.'
        : '¿Qué tienes en la cabeza? Dímelo como salga, por escrito o en audio. Yo lo ordeno.',
    },
  ]);

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const scrollDown = () => requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));

  const answer = (text: string, fromVoice = false) => {
    const t = text.trim();
    if (!t) return;
    const lower = t.toLowerCase();
    const me: Msg = { id: uid(), from: 'me', text: t, voice: fromVoice };

    if (/qué tengo|que tengo|mi día|mañana qué/.test(lower) && !/tengo que/.test(lower)) {
      const tomorrow = /mañana/.test(lower);
      const day = new Date(); if (tomorrow) day.setDate(day.getDate() + 1);
      const same = (iso: string) => new Date(iso).toDateString() === day.toDateString();
      const list = events.filter((e) => same(e.start)).map((e) => `${new Date(e.start).toTimeString().slice(0, 5)} ${e.title}`);
      const open = state.tasks.filter((x) => !x.done && x.important).map((x) => x.title);
      const reply = `${tomorrow ? 'Mañana' : 'Hoy'} tienes ${list.length ? list.join(', ') : 'el día libre de eventos'}.${open.length ? ` Lo importante: ${open.slice(0, 3).join('; ')}.` : ''}`;
      setMessages((m) => [...m, me, { id: uid(), from: 'sol', text: reply }]);
    } else {
      const { reply, tasks } = dumpToTasks(t, fromVoice ? 'voice' : 'you');
      if (tasks.length) addTasks(tasks);
      setMessages((m) => [...m, me, { id: uid(), from: 'sol', text: reply }, ...(tasks.length ? [{ id: uid(), from: 'tasks' as const, tasks }] : [])]);
      if (tasks.length) tap('success');
    }
    scrollDown();
  };

  const send = () => {
    answer(draft);
    setDraft('');
  };

  const stopRecording = () => {
    setRecording(false);
    answer(SAMPLE_VOICE, true);
  };

  const undo = (msgId: string, ids: string[]) => {
    dispatch({ type: 'removeTasks', ids });
    setMessages((m) => m.map((x) => (x.id === msgId && x.from === 'tasks' ? { ...x, undone: true } : x)));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { borderBottomColor: p.line }]}>
          <View style={[s.avatar, { backgroundColor: p.lime }]}><Sun size={20} color={p.onLime} strokeWidth={2.4} /></View>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Sol</T>
            <T v="caption" tone="muted">Atento a WhatsApp, correo y calendario</T>
          </View>
          <IconButton icon={X} label="Cerrar" onPress={() => router.back()} />
        </View>

        <ScrollView ref={scroll} contentContainerStyle={s.thread} keyboardShouldPersistTaps="handled" onContentSizeChange={scrollDown}>
          {messages.map((m) => {
            if (m.from === 'tasks') return <TaskCards key={m.id} tasks={m.tasks} undone={m.undone} onUndo={() => undo(m.id, m.tasks.map((t) => t.id))} />;
            const mine = m.from === 'me';
            return (
              <View key={m.id} style={[s.bubble, mine ? [s.mine, { backgroundColor: p.accent }] : [s.theirs, { backgroundColor: p.surface }]]}>
                {m.voice ? (
                  <View style={s.voiceTag}>
                    <Mic size={13} color={p.onAccent} />
                    <T v="caption" style={{ color: p.onAccent, opacity: 0.85 }}>Transcripción de ejemplo</T>
                  </View>
                ) : null}
                <T style={{ color: mine ? p.onAccent : p.ink }}>{m.text}</T>
              </View>
            );
          })}
        </ScrollView>

        {messages.length === 1 && !recording ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.suggestions} keyboardShouldPersistTaps="handled">
            <Chip label="Tengo que…" onPress={() => setDraft('Tengo que ')} />
            <Chip label={night ? '¿Qué tengo mañana?' : '¿Qué tengo hoy?'} onPress={() => answer(night ? '¿Qué tengo mañana?' : '¿Qué tengo hoy?')} />
            <Chip label="Dictar" icon={Mic} onPress={() => setRecording(true)} />
          </ScrollView>
        ) : null}

        {recording ? (
          <View style={[s.recorder, { backgroundColor: p.surface, borderColor: p.line }]}>
            <View style={s.wave} accessibilityLabel="Grabando">
              {[10, 18, 26, 14, 30, 20, 12, 24, 16, 28, 12, 20].map((h, i) => (
                <View key={i} style={{ width: 4, height: h, borderRadius: 2, backgroundColor: p.accent, opacity: (i + seconds) % 3 === 0 ? 1 : 0.45 }} />
              ))}
            </View>
            <T v="calloutStrong" style={{ fontVariant: ['tabular-nums'] }}>0:{String(seconds).padStart(2, '0')}</T>
            <View style={{ flex: 1 }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Terminar y enviar" onPress={stopRecording} style={[s.stop, { backgroundColor: p.accent }]}>
              <Square size={16} color={p.onAccent} fill={p.onAccent} />
            </Pressable>
          </View>
        ) : (
          <View style={[s.composer, { backgroundColor: p.surface, borderColor: p.line }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={night ? 'Suelta lo que te da vueltas' : 'Escribe o dicta lo que tienes que hacer'}
              placeholderTextColor={p.faint}
              multiline
              style={[s.input, { color: p.ink }]}
              accessibilityLabel="Mensaje para Sol"
            />
            {draft.trim() ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Enviar" onPress={send} style={[s.send, { backgroundColor: p.accent }]}>
                <ArrowUp size={20} color={p.onAccent} strokeWidth={2.6} />
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Dictar" onPress={() => { tap('light'); setRecording(true); }} style={[s.send, { backgroundColor: p.lime }]}>
                <Mic size={20} color={p.onLime} strokeWidth={2.4} />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TaskCards({ tasks, undone, onUndo }: { tasks: Task[]; undone?: boolean; onUndo: () => void }) {
  const { p } = useTheme();
  return (
    <View style={{ gap: space.sm, opacity: undone ? 0.45 : 1 }}>
      {tasks.map((t) => (
        <View key={t.id} style={[s.taskCard, { backgroundColor: p.card, borderColor: p.line }]}>
          <View style={[s.check, { borderColor: p.accent }]} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="bodyStrong" style={undone ? { textDecorationLine: 'line-through' } : undefined}>{t.title}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CalendarClock size={13} color={p.accent} />
                <T v="caption" tone="accent">{t.due.label}</T>
              </View>
              <SourceTag source={t.source} label={t.sourceLabel} />
            </View>
          </View>
        </View>
      ))}
      {!undone ? (
        <View style={s.cardActions}>
          <Chip label="Deshacer" icon={Undo2} onPress={onUndo} />
          <Chip label="Ver en Tareas" onPress={() => router.navigate('/tareas')} />
        </View>
      ) : (
        <T v="caption" tone="muted">Las quité de tus tareas.</T>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  thread: { padding: space.lg, gap: space.md, flexGrow: 1 },
  bubble: { maxWidth: '84%', paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, gap: 4 },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  voiceTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggestions: { paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: space.lg, marginBottom: space.sm, borderRadius: radius.xl, borderWidth: 1, paddingLeft: space.lg, padding: 6, gap: space.sm },
  input: { flex: 1, fontFamily: 'InterTight_400Regular', fontSize: 17, lineHeight: 22, maxHeight: 120, paddingTop: 10, paddingBottom: 10 },
  send: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  recorder: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginBottom: space.sm, borderRadius: radius.xl, borderWidth: 1, padding: 6, paddingLeft: space.lg, minHeight: 56 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stop: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  taskCard: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, alignItems: 'flex-start' },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
