import { BellRing, Check, CircleHelp, ClipboardList, EyeOff, Moon, X, type LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { Rule, RuleKind } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';
import { useReduceMotion } from './motion';
import { StepShell } from './shell';
import type { StepNav } from './types';

const KIND: Record<RuleKind, { label: string; icon: LucideIcon; tone: 'urgent' | 'accent' | 'muted' }> = {
  wake: { label: 'Te despierto si', icon: BellRing, tone: 'urgent' },
  wait: { label: 'Espera a la mañana', icon: Moon, tone: 'accent' },
  task: { label: 'Lo convierto en tarea', icon: ClipboardList, tone: 'accent' },
  ignore: { label: 'No te lo muestro', icon: EyeOff, tone: 'muted' },
};

/** What an X can turn a rule into, besides dropping it. */
const ALTERNATIVE: Record<RuleKind, { kind: RuleKind; label: string }> = {
  wake: { kind: 'wait', label: 'Que espere a la mañana' },
  wait: { kind: 'wake', label: 'Mejor despiértame' },
  task: { kind: 'ignore', label: 'No lo conviertas en tarea' },
  ignore: { kind: 'wait', label: 'Muéstramelo en la mañana' },
};

// 7. Proposed rules ---------------------------------------------------------

export function Rules({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const reduce = useReduceMotion();
  // Snapshot the proposals once, so editing them does not reshuffle the deck.
  const [deck] = useState(() => state.rules.filter((r) => r.origin === 'onboarding'));
  const [i, setI] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const finished = i >= deck.length;
  const kept = state.rules.length;

  const advance = (dir: 1 | -1) => {
    setAdjusting(false);
    if (reduce) return setI((n) => n + 1);
    Animated.timing(slide, { toValue: dir, duration: 200, useNativeDriver: true }).start(() => {
      slide.setValue(0);
      setI((n) => n + 1);
    });
  };

  const accept = (r: Rule) => {
    tap('light');
    dispatch({ type: 'setRule', id: r.id, patch: { confirmed: true } });
    advance(1);
  };
  const change = (r: Rule) => {
    tap();
    dispatch({ type: 'setRule', id: r.id, patch: { kind: ALTERNATIVE[r.kind].kind, confirmed: true, origin: 'you' } });
    advance(1);
  };
  const drop = (r: Rule) => {
    tap();
    dispatch({ type: 'removeRule', id: r.id });
    advance(-1);
  };

  if (finished) {
    return (
      <StepShell
        {...nav}
        eyebrow="Reglas"
        title={`Quedaron ${kept} reglas`}
        lead="Las puedes cambiar cuando quieras desde Tú, Reglas. Y cada mañana me puedes corregir con un toque."
        footer={<Button label="Continuar" onPress={nav.next} />}
      >
        <View style={[rl.summary, { backgroundColor: p.card, borderColor: p.line }]}>
          {(['wake', 'wait', 'task', 'ignore'] as RuleKind[]).map((k) => {
            const list = state.rules.filter((r) => r.kind === k);
            if (!list.length) return null;
            const { label, icon: Icon, tone } = KIND[k];
            return (
              <View key={k} style={{ gap: space.xs }}>
                <View style={rl.kind}>
                  <Icon size={16} color={p[tone === 'muted' ? 'muted' : tone]} />
                  <T v="eyebrow" tone={tone === 'muted' ? 'muted' : tone}>{label}</T>
                </View>
                {list.map((r) => <T key={r.id} v="callout">{r.text}</T>)}
              </View>
            );
          })}
        </View>
      </StepShell>
    );
  }

  const r = deck[i];
  const live = state.rules.find((x) => x.id === r.id) ?? r;
  const { label, icon: Icon, tone } = KIND[live.kind];
  const translateX = slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [-360, 0, 360] });
  const rotate = slide.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] });

  return (
    <StepShell
      {...nav}
      eyebrow={`Regla ${i + 1} de ${deck.length}`}
      title="Te propongo estas reglas"
      lead="Las saqué de tu historial. Dime si así está bien."
      footer={
        adjusting ? (
          <>
            <Button label={ALTERNATIVE[live.kind].label} onPress={() => change(live)} />
            <Button kind="danger" label="Descartar esta regla" onPress={() => drop(live)} />
            <Button kind="ghost" label="Volver" onPress={() => setAdjusting(false)} />
          </>
        ) : (
          <View style={rl.decide}>
            <Button kind="secondary" icon={X} label="No así" onPress={() => { tap(); setAdjusting(true); }} style={{ flex: 1 }} accessibilityLabel="No, ajustar o descartar esta regla" />
            <Button icon={Check} label="Sí, así" onPress={() => accept(live)} style={{ flex: 1 }} accessibilityLabel="Sí, aceptar esta regla" />
          </View>
        )
      }
    >
      <View style={rl.deck}>
        {deck[i + 1] ? <View style={[rl.peek, { backgroundColor: p.surface, borderColor: p.line }]} /> : null}
        <Animated.View style={{ transform: [{ translateX }, { rotate }], opacity: slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }) }}>
          <View style={[rl.card, { backgroundColor: p.card, borderColor: p.line }]} accessible accessibilityLabel={`${label}: ${live.text}`}>
            <View style={rl.kind}>
              <Icon size={18} color={p[tone === 'muted' ? 'muted' : tone]} />
              <T v="eyebrow" tone={tone === 'muted' ? 'muted' : tone}>{label}</T>
            </View>
            <T v="h2">{live.text}</T>
            {live.examples ? (
              <T v="callout" tone="muted">Lo vi {live.examples} {live.examples === 1 ? 'vez' : 'veces'} en tu historial.</T>
            ) : null}
            {adjusting ? <T v="callout" tone="accent">¿Cómo la prefieres?</T> : null}
          </View>
        </Animated.View>
      </View>
      <View style={rl.dots} accessibilityElementsHidden>
        {deck.map((d, n) => (
          <View key={d.id} style={[rl.dot, { backgroundColor: n < i ? p.accent : n === i ? p.ink : p.line }]} />
        ))}
      </View>
    </StepShell>
  );
}

const rl = StyleSheet.create({
  deck: { minHeight: 200 },
  peek: { position: 'absolute', left: 14, right: 14, top: 14, bottom: -10, borderRadius: radius.xl, borderWidth: 1 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: space.xxl, gap: space.md, minHeight: 190 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  decide: { flexDirection: 'row', gap: space.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summary: { borderRadius: radius.lg, borderWidth: 1, padding: space.xl, gap: space.lg },
});

// 8. Questions ---------------------------------------------------------------

export function Questions({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const qs = state.questions.slice(0, 2);
  const answered = qs.filter((q) => q.answer).length;
  return (
    <StepShell
      {...nav}
      onSkip={nav.next}
      skipLabel="Después"
      eyebrow="Si no entiendo algo, te pregunto"
      title="Dos cosas que no me calzan"
      lead="Cuando algo no me queda claro, no adivino: te pregunto así, con un toque. Las próximas te llegan en Tú, Entrenamiento."
      footer={<Button label={answered === qs.length ? 'Continuar' : `Responder después (${qs.length - answered})`} kind={answered === qs.length ? 'primary' : 'secondary'} onPress={nav.next} />}
    >
      <View style={{ gap: space.md }}>
        {qs.map((q) => (
          <Card key={q.id} tone={q.answer ? 'calmSoft' : 'card'} style={{ gap: space.md }}>
            <View style={qs_.head}>
              {q.answer ? <Check size={20} color={p.calm} strokeWidth={2.8} /> : <CircleHelp size={20} color={p.accent} />}
              <T v="bodyStrong" style={{ flex: 1 }}>{q.text}</T>
            </View>
            {q.context ? <T v="callout" tone="muted">{q.context}</T> : null}
            <View style={qs_.options}>
              {q.options.map((o) => (
                <Chip key={o} label={o} selected={q.answer === o} tone={q.answer === o ? 'calm' : 'accent'} onPress={() => dispatch({ type: 'answer', id: q.id, answer: o })} />
              ))}
            </View>
            {q.answer ? <T v="caption" tone="calm">Anotado. Desde ahora lo tengo en cuenta.</T> : null}
          </Card>
        ))}
      </View>
    </StepShell>
  );
}

const qs_ = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
