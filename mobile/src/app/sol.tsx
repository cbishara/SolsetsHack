import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowUp, CalendarDays, Check, Mic, MicOff, MessageSquareText, PhoneOff, RotateCcw, Sparkles, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBackend } from '../api/backend';
import { SolOrb } from '../components/sol-orb';
import { Glass, GlowBackdrop, T, tap } from '../components/ui';
import { dayLabel, dueLabel, keyOf, timeOf } from '../data/dates';
import { calendarById } from '../data/select';
import { newId, useStore } from '../data/store';
import type { ChatMessage } from '../data/types';
import { suggestions, think } from '../features/sol/brain';
import { ShapeButton } from '../features/sol/voice-controls';
import { useVoice, type Turn } from '../features/sol/use-voice';
import { useTheme } from '../theme/theme';
import { categoryColors, radius, space } from '../theme/tokens';

/** Cards under a reply: what Sol did in that turn, with undo. */
function Cards({ m }: { m: ChatMessage }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const tasks = (m.tasks ?? []).map((id) => state.tasks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const events = (m.events ?? []).map((id) => state.events.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
  if (!tasks.length && !events.length) return null;
  const created = tasks.length && tasks.every((t) => Date.now() - new Date(t.createdAt).getTime() < 10 * 60_000 && (t.source === 'you' || t.source === 'voice'));
  return (
    <Glass style={s.cards}>
      {events.map((e) => (
        <Pressable key={e.id} accessibilityRole="button" onPress={() => { tap(); router.push(`/evento/${e.id}`); }} style={s.cardRow}>
          <View style={[s.bar, { backgroundColor: categoryColors[calendarById(state, e.calendarId)?.color ?? 'gray'] }]} />
          <View style={{ flex: 1 }}>
            <T v="calloutStrong" numberOfLines={1}>{e.title}</T>
            <T v="caption" tone="muted">{`${dayLabel(keyOf(new Date(e.start)))}, ${timeOf(e.start)} a ${timeOf(e.end)}`}</T>
          </View>
          <CalendarDays size={15} color={p.faint} />
        </Pressable>
      ))}
      {tasks.map((t) => (
        <Pressable key={t.id} accessibilityRole="button" onPress={() => { tap(); router.push(`/tarea/${t.id}`); }} style={s.cardRow}>
          <View style={[s.check, created ? { backgroundColor: p.calmSoft } : { borderWidth: 1.5, borderColor: p.faint }]}>{created ? <Check size={12} color={p.calm} strokeWidth={3} /> : null}</View>
          <T v="callout" numberOfLines={1} style={{ flex: 1 }}>{t.title}</T>
          <T v="caption" tone="muted">{dueLabel(t) ?? 'Sin fecha'}</T>
        </Pressable>
      ))}
      {created ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); dispatch({ type: 'removeTasks', ids: tasks.map((t) => t.id) }); }} hitSlop={8} style={{ alignSelf: 'flex-start', paddingTop: 2 }}>
          <T v="captionStrong" tone="faint">Deshacer</T>
        </Pressable>
      ) : null}
    </Glass>
  );
}

/** Sol's orb, breathing with the voice level while it listens. */
function ListeningOrb({ level, phase }: { level: number; phase: string }) {
  const scale = useSharedValue(1);
  useEffect(() => { scale.value = withSpring(1 + level * 0.18, { duration: 260, dampingRatio: 0.7 }); }, [level, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <SolOrb size={180} state={phase === 'muted' ? 'shadow' : phase === 'speaking' ? 'watching' : 'calm'} />
    </Animated.View>
  );
}

/**
 * Sol. Ask about your day, get a summary, unload what is on your mind, by text
 * or by voice. Answers come from the agent through server/ when it is
 * connected, and from the app's own data while it is not.
 */
export default function Sol() {
  const { p } = useTheme();
  const { voice: voiceParam } = useLocalSearchParams<{ voice?: string }>();
  const { state, dispatch } = useStore();
  const backend = useBackend();
  const [draft, setDraft] = useState('');
  const [voiceMode, setVoiceMode] = useState(voiceParam === '1');
  const [showText, setShowText] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const voiceRef = useRef(voiceMode);
  voiceRef.current = voiceMode;
  const messages = state.chat;
  const name = state.profile.name;

  const scrollDown = () => requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));

  /** One turn: local answer at once, the agent's answer replaces it if it comes. */
  const respond = useCallback(async (text: string, via: 'text' | 'voice'): Promise<string> => {
    const reply = think(state, text, via);
    reply.actions?.forEach((a) => dispatch(a));
    const solId = newId('m');
    dispatch({ type: 'addChat', message: { id: solId, role: 'sol', text: reply.text, at: new Date().toISOString(), tasks: reply.tasks?.map((t) => t.id), events: reply.events } });
    scrollDown();
    if (backend.status === 'connected') {
      try {
        const agent = await backend.chat(text);
        if (agent) { dispatch({ type: 'updateChat', id: solId, patch: { text: agent } }); return agent; }
      } catch { /* the local answer stays */ }
    }
    return reply.text;
  }, [state, dispatch, backend]);

  const sendText = async (raw = draft) => {
    const text = raw.trim();
    if (!text) return;
    tap('light');
    setDraft('');
    dispatch({ type: 'addChat', message: { id: newId('m'), role: 'you', text, at: new Date().toISOString(), via: 'text' } });
    setThinking(true);
    scrollDown();
    await respond(text, 'text');
    setThinking(false);
  };

  const voice = useVoice(useCallback(async (turn: Turn) => {
    const meId = newId('m');
    const label = `Nota de voz · 0:${String(Math.min(59, turn.seconds)).padStart(2, '0')}`;
    dispatch({ type: 'addChat', message: { id: meId, role: 'you', text: turn.text ?? label, at: new Date().toISOString(), via: 'voice', pending: !turn.text } });
    let text = turn.text;
    if (!text && turn.uri) {
      try { text = await backend.transcribe(turn.uri, Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a'); } catch { text = null; }
      if (text) dispatch({ type: 'updateChat', id: meId, patch: { text, pending: false } });
    }
    if (!text) {
      dispatch({ type: 'updateChat', id: meId, patch: { pending: false } });
      const msg = backend.status === 'connected'
        ? 'Guardé tu nota de voz, pero el servidor todavía no transcribe audio. Mientras, usa el micrófono del teclado y lo anoto igual.'
        : 'Guardé tu nota de voz. Para entenderla necesito el servidor conectado; mientras, usa el micrófono del teclado y lo anoto igual.';
      dispatch({ type: 'addChat', message: { id: newId('m'), role: 'sol', text: msg, at: new Date().toISOString() } });
      voice.setPhase('idle');
      return;
    }
    const answer = await respond(text, 'voice');
    if (voiceRef.current) voice.speak(answer, () => { if (voiceRef.current) void voice.listen(); });
    else voice.setPhase('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respond, backend, dispatch]));
  useEffect(() => {
    if (voiceMode && voice.phase === 'idle') void voice.listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

  const endVoice = () => {
    voiceRef.current = false;
    if (voice.phase === 'listening' || voice.phase === 'muted') void voice.finish(true);
    else voice.hush();
    setVoiceMode(false);
  };

  const close = () => { voice.hush(); if (voice.phase === 'listening') void voice.finish(false); router.canGoBack() ? router.back() : router.replace('/'); };
  const lastSol = [...messages].reverse().find((m) => m.role === 'sol');
  const lastYou = [...messages].reverse().find((m) => m.role === 'you');
  const status = { listening: 'Te escucho…', muted: 'Micrófono silenciado', thinking: 'Pensando…', speaking: 'Sol habla · toca el círculo para interrumpir', idle: 'Toca el círculo para hablar', denied: 'Necesito permiso para usar el micrófono' }[voice.phase];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <GlowBackdrop glow="solStrong" height={voiceMode ? 760 : 560} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            <View style={{ width: 44 }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => { tap(); close(); }} hitSlop={8}>
              <Glass radius={radius.pill} style={s.closePill}>
                <X size={16} color={p.ink} />
                <T v="calloutStrong">Cerrar</T>
              </Glass>
            </Pressable>
            {messages.length && !voiceMode ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Nueva conversación" onPress={() => { tap(); dispatch({ type: 'clearChat' }); }} hitSlop={8} style={s.reset}>
                <RotateCcw size={18} color={p.muted} />
              </Pressable>
            ) : <View style={{ width: 44 }} />}
          </View>

          {voiceMode ? (
            <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={s.voice}>
              <View style={s.voiceCenter}>
                <Pressable accessibilityRole="button" accessibilityLabel={voice.phase === 'speaking' ? 'Interrumpir a Sol' : voice.phase === 'listening' ? 'Enviar' : 'Hablar'}
                  onPress={() => {
                    tap('light');
                    if (voice.phase === 'speaking') { voice.hush(); void voice.listen(); }
                    else if (voice.phase === 'listening') void voice.finish(true);
                    else if (voice.phase === 'idle' || voice.phase === 'denied') void voice.listen();
                  }}>
                  <ListeningOrb level={voice.level} phase={voice.phase} />
                </Pressable>
                <T v="callout" tone="muted" style={{ textAlign: 'center' }}>{status}</T>
                <View style={s.liveWrap}>
                  {voice.phase === 'listening' && voice.live ? (
                    <T v="h2" style={{ textAlign: 'center' }}>{voice.live}</T>
                  ) : showText ? (
                    <>
                      {lastYou ? <T v="body" tone="muted" style={{ textAlign: 'center' }}>{lastYou.text}</T> : null}
                      {lastSol ? <T v="h3" style={{ textAlign: 'center' }}>{lastSol.text}</T> : null}
                    </>
                  ) : voice.phase === 'speaking' && lastSol ? (
                    <T v="h3" style={{ textAlign: 'center' }} numberOfLines={5}>{lastSol.text}</T>
                  ) : null}
                </View>
              </View>
              <View style={s.controls}>
                <ShapeButton icon={voice.phase === 'muted' ? MicOff : Mic} label={voice.phase === 'muted' ? 'Silenciado' : 'Silenciar'} on={voice.phase === 'muted'} onPress={voice.mute} />
                <ShapeButton icon={MessageSquareText} label="Ver texto" on={showText} onPress={() => setShowText(!showText)} />
                <ShapeButton icon={PhoneOff} label="Terminar" tone="end" width={72} onPress={endVoice} />
              </View>
            </Animated.View>
          ) : (
            <>
              <ScrollView ref={scroll} contentContainerStyle={s.thread} keyboardShouldPersistTaps="handled" onContentSizeChange={scrollDown} showsVerticalScrollIndicator={false}>
                {!messages.length ? (
                  <Animated.View entering={FadeIn.duration(260)} style={s.empty}>
                    <SolOrb size={130} state="watching" />
                    <View style={{ gap: space.sm, alignItems: 'center', marginTop: -space.lg }}>
                      <T v="title" style={{ textAlign: 'center' }} accessibilityRole="header">{`¿En qué te ayudo, ${name}?`}</T>
                      <T tone="muted" style={{ textAlign: 'center', maxWidth: 320 }}>Pregúntame por tu día, pídeme un resumen o cuéntame lo que tengas pendiente. Lo ordeno yo.</T>
                    </View>
                  </Animated.View>
                ) : null}
                {messages.map((m) => (
                  <Animated.View key={m.id} entering={FadeInDown.duration(220)} style={m.role === 'you' ? s.youWrap : s.solWrap}>
                    {m.role === 'you' ? (
                      <View style={[s.you, { backgroundColor: p.sol }]}>
                        {m.via === 'voice' ? <Mic size={13} color={p.onSol} style={{ marginBottom: 2 }} /> : null}
                        <T v="body" tone="onSol">{m.pending ? 'Transcribiendo…' : m.text}</T>
                      </View>
                    ) : (
                      <View style={s.sol}>
                        <SolOrb size={20} state="watching" style={{ margin: -9, marginTop: -6 }} />
                        <View style={{ flex: 1, gap: space.sm }}>
                          <T v="body">{m.text}</T>
                          <Cards m={m} />
                        </View>
                      </View>
                    )}
                  </Animated.View>
                ))}
                {thinking ? (
                  <View style={s.sol}>
                    <SolOrb size={20} state="waking" style={{ margin: -9, marginTop: -6 }} />
                    <T v="callout" tone="faint">Sol está pensando…</T>
                  </View>
                ) : null}
              </ScrollView>

              {!messages.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.suggest} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
                  {suggestions(state).map((x) => (
                    <Pressable key={x} accessibilityRole="button" onPress={() => void sendText(x)}>
                      <Glass style={s.suggestCard}>
                        <Sparkles size={18} color={p.sol} />
                        <T v="calloutStrong" numberOfLines={3}>{x}</T>
                      </Glass>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View style={s.composerWrap}>
                <Glass strong radius={28} style={s.composer}>
                  <TextInput value={draft} onChangeText={setDraft} placeholder="Pregúntale o cuéntale algo a Sol" placeholderTextColor={p.faint} multiline
                    selectionColor={p.sol} style={[s.input, { color: p.ink }]} accessibilityLabel="Mensaje para Sol" onSubmitEditing={() => void sendText()} blurOnSubmit={false} />
                  {draft.trim() ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Enviar" onPress={() => void sendText()} style={[s.round, { backgroundColor: p.sol }]}>
                      <ArrowUp size={20} color={p.onSol} strokeWidth={2.6} />
                    </Pressable>
                  ) : (
                    <Pressable accessibilityRole="button" accessibilityLabel="Hablar con Sol" onPress={() => { tap('success'); setVoiceMode(true); }} style={[s.round, { backgroundColor: p.sol }]}>
                      <Mic size={20} color={p.onSol} strokeWidth={2.4} />
                    </Pressable>
                  )}
                </Glass>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
  closePill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: space.lg },
  reset: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  thread: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xl, gap: space.lg, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingTop: space.xxl },
  youWrap: { alignItems: 'flex-end' },
  solWrap: { alignItems: 'stretch' },
  you: { maxWidth: '84%', borderRadius: 22, borderBottomRightRadius: 6, paddingHorizontal: space.lg, paddingVertical: space.md },
  sol: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingRight: space.lg },
  cards: { padding: space.md, gap: space.sm, borderRadius: radius.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  bar: { width: 3, height: 28, borderRadius: 2 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  suggest: { gap: space.sm, paddingHorizontal: space.xl, paddingBottom: space.md },
  suggestCard: { width: 156, minHeight: 104, padding: space.lg, gap: space.md, borderRadius: radius.lg, justifyContent: 'space-between' },
  composerWrap: { paddingHorizontal: space.lg, paddingBottom: space.sm, width: '100%', maxWidth: 640, alignSelf: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingLeft: space.lg, paddingRight: 6, paddingVertical: 6, minHeight: 56 },
  input: { flex: 1, fontFamily: 'InterTight_400Regular', fontSize: 17, lineHeight: 23, maxHeight: 140, paddingTop: 12, paddingBottom: 10 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  voice: { flex: 1, justifyContent: 'space-between', paddingBottom: space.xl },
  voiceCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl },
  liveWrap: { minHeight: 120, gap: space.md, paddingHorizontal: space.md, maxWidth: 520 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: space.xxl, alignItems: 'flex-start' },
});
