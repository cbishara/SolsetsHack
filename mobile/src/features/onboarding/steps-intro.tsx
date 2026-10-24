import { Check, Mic } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wordmark } from '../../components/brand';
import { SolOrb } from '../../components/sol-orb';
import { Button, GlowBackdrop, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { Goal } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { font, radius, space } from '../../theme/tokens';
import { StepShell } from './shell';
import { GOALS, type Draft, type StepNav } from './types';

// 1. Welcome --------------------------------------------------------------

export function Welcome({ next }: { next: () => void }) {
  const { p } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top', 'bottom']}>
      <GlowBackdrop glow="sol" height={620} />
      <View style={w.page}>
        <Wordmark size={22} />
        <View style={w.orb}>
          <SolOrb size={132} state="calm" />
        </View>
        <View style={{ gap: space.md }}>
          <T v="calloutStrong" tone="sol">Conoce a Sol, tu asistente</T>
          <T accessibilityRole="header" style={[w.big, { color: p.ink }]}>Todo lo que te llega, ordenado.</T>
          <T v="h3" tone="muted">Sol lee tu correo, tu WhatsApp y tu calendario, y lo convierte en un día claro.</T>
          <View style={w.points}>
            {['Ordena lo que llega en tus categorías', 'Te avisa solo lo urgente, también de noche', 'Te cierra el día para que puedas desconectarte'].map((t) => (
              <View key={t} style={w.point}>
                <Check size={17} color={p.calm} strokeWidth={2.6} />
                <T v="callout" tone="ink">{t}</T>
              </View>
            ))}
          </View>
        </View>
        <View style={{ gap: space.sm }}>
          <Button kind="primary" label="Empezar" onPress={next} />
          <T v="caption" tone="faint" style={{ textAlign: 'center' }}>Toma unos 3 minutos. Todo se puede cambiar después.</T>
        </View>
      </View>
    </SafeAreaView>
  );
}

const w = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.md, gap: space.xl, justifyContent: 'space-between', width: '100%', maxWidth: 640, alignSelf: 'center' },
  orb: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  big: { fontFamily: font.bold, fontSize: 40, lineHeight: 44, letterSpacing: -1.6 },
  points: { gap: space.sm, marginTop: space.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

// 2. Goals ----------------------------------------------------------------

export function Goals({ nav, draft, setDraft }: { nav: StepNav; draft: Draft; setDraft: (d: Draft) => void }) {
  const { p } = useTheme();
  const toggle = (id: Goal) =>
    setDraft({ ...draft, goals: draft.goals.includes(id) ? draft.goals.filter((g) => g !== id) : [...draft.goals, id] });
  return (
    <StepShell
      {...nav}
      title="¿Qué quieres que Sol haga por ti?"
      lead="Elige todas las que quieras. Con esto ajusto lo que te pregunto y cómo trabajo."
      footer={<Button label={draft.goals.length ? 'Continuar' : 'Elige al menos una'} disabled={!draft.goals.length} onPress={nav.next} />}
    >
      <View style={{ gap: space.sm }}>
        {GOALS.map((g) => {
          const on = draft.goals.includes(g.id);
          return (
            <Pressable
              key={g.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${g.title}. ${g.detail}`}
              onPress={() => { tap(); toggle(g.id); }}
              style={({ pressed }) => [
                gs.option,
                { backgroundColor: on ? `${p.sol}14` : p.card, borderColor: on ? p.sol : p.line },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{g.title}</T>
                <T v="callout" tone="muted">{g.detail}</T>
              </View>
              <View style={[gs.box, { borderColor: on ? p.sol : p.line, backgroundColor: on ? p.sol : 'transparent' }]}>
                {on ? <Check size={16} color={p.onSol} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </StepShell>
  );
}

const gs = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, minHeight: 72 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

// 3. About ----------------------------------------------------------------

export function About({ nav, draft }: { nav: StepNav; draft: Draft }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const [text, setText] = useState(state.profile.about && state.onboarded ? state.profile.about : '');

  const save = () => {
    const about = text.trim();
    if (about) {
      dispatch({ type: 'setProfile', patch: { about } });
      about
        .split(/\.\s+/)
        .map((sentence) => sentence.trim().replace(/\.$/, ''))
        .filter((sentence) => sentence.length > 8)
        .forEach((sentence, i) =>
          dispatch({
            type: 'addMemory',
            item: {
              id: `ob-${Date.now()}-${i}`,
              category: /trabaj|turno|guardia|oficina|jefe/i.test(sentence) ? 'trabajo' : /hijo|pareja|vivo|familia/i.test(sentence) ? 'vida' : 'preferencias',
              text: sentence,
              source: 'onboarding',
              learnedAt: new Date().toISOString(),
            },
          }),
        );
    }
    nav.next();
  };

  const hint = draft.goals.includes('guardia')
    ? 'Por ejemplo: a qué te dedicas, qué cosas no pueden esperar y quién te escribe de noche.'
    : 'Por ejemplo: a qué te dedicas, quiénes son las personas importantes y qué te quita el sueño.';

  return (
    <StepShell
      {...nav}
      onSkip={nav.next}
      title="Cuéntame un poco de ti"
      lead={`Opcional, 30 segundos. Así no parto de cero. ${hint}`}
      footer={<Button label={text.trim() ? 'Guardar y seguir' : 'Seguir sin contar'} kind={text.trim() ? 'primary' : 'secondary'} onPress={save} />}
    >
      <View style={[ab.box, { backgroundColor: p.surface, borderColor: p.line }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Escríbelo como te salga"
          placeholderTextColor={p.faint}
          style={[ab.input, { color: p.ink }]}
          accessibilityLabel="Cuéntame de ti"
        />
        <View style={ab.row}>
          <Mic size={16} color={p.faint} />
          <T v="caption" tone="muted" style={{ flex: 1 }}>Puedes dictarlo con el micrófono del teclado. Lo guardo en lo que Sol sabe de ti, y puedes verlo o borrarlo cuando quieras.</T>
        </View>
      </View>
    </StepShell>
  );
}

const ab = StyleSheet.create({
  box: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md },
  input: { fontFamily: font.regular, fontSize: 17, lineHeight: 25, minHeight: 150, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mic: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.pill },
});
