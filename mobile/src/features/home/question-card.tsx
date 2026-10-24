import { router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SolOrb } from '../../components/sol-orb';
import { Glass, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { AgentQuestion } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

/**
 * Sol's open questions, one at a time. Each answer says beforehand what Sol
 * will do with it, so answering is safe and takes one tap.
 */
export function QuestionCard({ questions }: { questions: AgentQuestion[] }) {
  const { p } = useTheme();
  const { dispatch } = useStore();
  const [skip, setSkip] = useState<string[]>([]);
  const [done, setDone] = useState<{ text: string } | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const open = questions.filter((q) => !q.answer && !skip.includes(q.id));
  const q = open[0];

  if (done) {
    return (
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
        <Glass style={[s.card, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={[s.ok, { backgroundColor: p.calmSoft }]}><Check size={16} color={p.calm} strokeWidth={3} /></View>
          <T v="callout" style={{ flex: 1 }}>{done.text}</T>
        </Glass>
      </Animated.View>
    );
  }
  if (!q) return null;

  const confirmAnswer = (i: number) => {
    tap('success');
    dispatch({ type: 'answer', id: q.id, index: i });
    setPick(null);
    setDone({ text: q.effects?.[i] ? `Listo. ${q.effects[i]}` : `Anotado: ${q.options[i]}.` });
    setTimeout(() => setDone(null), 2600);
  };
  // With a visible consequence, the first tap previews it and the second confirms. Without one, one tap.
  const choose = (i: number) => (q.effects?.[i] ? (tap(), setPick(i)) : confirmAnswer(i));

  return (
    <Animated.View key={q.id} entering={FadeIn.duration(220)}>
      <Glass style={s.card}>
        <View style={s.head}>
          <SolOrb size={16} state="watching" style={{ margin: -7 }} />
          <T v="captionStrong" tone="sol" style={{ flex: 1 }}>Sol pregunta</T>
          {open.length > 1 ? <T v="caption" tone="faint">{`1 de ${open.length}`}</T> : null}
        </View>
        <View style={{ gap: space.xs }}>
          <T v="h3">{q.text}</T>
          {q.context ? <T v="callout" tone="muted">{q.context}</T> : null}
        </View>
        {q.itemId ? (
          <Pressable accessibilityRole="link" onPress={() => { tap(); router.push(`/entrada/${q.itemId}`); }} hitSlop={8} style={s.link}>
            <T v="calloutStrong" tone="muted">Ver el mensaje original</T>
            <ChevronRight size={15} color={p.muted} />
          </Pressable>
        ) : null}
        <View style={s.options}>
          {q.options.map((o, i) => (
            <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: pick === i }} accessibilityLabel={o} accessibilityHint={q.effects?.[i]} onPress={() => choose(i)}
              style={({ pressed }) => [s.option, { backgroundColor: pick === i ? p.ink : pressed ? p.accentSoft : p.surface, borderColor: pick === i ? p.ink : p.line }]}>
              <T v="calloutStrong" style={{ color: pick === i ? p.bg : p.ink }}>{o}</T>
            </Pressable>
          ))}
        </View>
        {pick !== null && q.effects?.[pick] ? (
          <Animated.View entering={FadeIn.duration(160)} style={[s.preview, { backgroundColor: p.surface }]}>
            <T v="callout" style={{ flex: 1 }}>{q.effects[pick]}</T>
            <Pressable accessibilityRole="button" onPress={() => confirmAnswer(pick)} hitSlop={8} style={[s.confirm, { backgroundColor: p.sol }]}>
              <T v="calloutStrong" tone="onSol">Confirmar</T>
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => { tap(); setSkip([...skip, q.id]); }} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
            <T v="calloutStrong" tone="faint">Responder después</T>
          </Pressable>
        )}
      </Glass>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: { padding: space.xl, gap: space.lg, borderRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginTop: -space.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: { borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg, minHeight: 40, justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.md, padding: space.md, paddingLeft: space.lg },
  confirm: { borderRadius: radius.pill, paddingHorizontal: space.lg, minHeight: 38, justifyContent: 'center' },
  ok: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: space.md },
});
