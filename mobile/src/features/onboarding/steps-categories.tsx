import { Moon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, CATEGORY_ICONS, Chip, IconTile, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { CategoryAction } from '../../data/types';
import { QuestionCard } from '../home/question-card';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';
import { StepShell } from './shell';
import type { StepNav } from './types';

const SHORT: { id: CategoryAction; label: string }[] = [
  { id: 'alert', label: 'Avisarme' },
  { id: 'task', label: 'Tarea' },
  { id: 'calendar', label: 'Agenda' },
  { id: 'digest', label: 'Resumen' },
  { id: 'ignore', label: 'Silenciar' },
];

// 7. Categories ------------------------------------------------------------------

/**
 * The categories Sol found in the history, each with what Sol will do with it.
 * The person adjusts in one tap per category; everything stays editable later.
 */
export function Categories({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const list = state.categories.filter((c) => c.status === 'active');
  const set = (id: string, action: CategoryAction) => { tap(); dispatch({ type: 'updateCategory', id, patch: { action, wakeAtNight: action === 'alert' ? state.categories.find((c) => c.id === id)!.wakeAtNight : false } }); };
  return (
    <StepShell
      {...nav}
      title="Así ordené lo que te llega"
      lead="Cada categoría decide qué hago con lo que llega. Ajusta lo que no te sirva; la luna marca lo que puede despertarte."
      footer={<Button label={`Usar estas ${list.length} categorías`} onPress={nav.next} />}
    >
      <View style={{ gap: space.md }}>
        {list.map((c) => (
          <View key={c.id} style={[s.card, { backgroundColor: p.card, borderColor: p.line }]}>
            <View style={s.head}>
              <IconTile icon={CATEGORY_ICONS[c.icon]} color={categoryColors[c.color]} size={34} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{c.name}</T>
                <T v="caption" tone="muted" numberOfLines={2}>{c.description}</T>
              </View>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: c.wakeAtNight }} accessibilityLabel={`${c.name} puede despertarte`} hitSlop={10}
                onPress={() => { tap(); dispatch({ type: 'updateCategory', id: c.id, patch: { wakeAtNight: !c.wakeAtNight, action: !c.wakeAtNight ? 'alert' : c.action } }); }}
                style={[s.moon, { backgroundColor: c.wakeAtNight ? `${p.sol}26` : p.surface }]}>
                <Moon size={16} color={c.wakeAtNight ? p.sol : p.faint} fill={c.wakeAtNight ? p.sol : 'transparent'} />
              </Pressable>
            </View>
            <View style={s.actions}>
              {SHORT.map((a) => <Chip key={a.id} label={a.label} selected={c.action === a.id} tone={a.id === 'alert' ? 'sol' : 'accent'} onPress={() => set(c.id, a.id)} />)}
            </View>
          </View>
        ))}
      </View>
      <T v="caption" tone="faint">Después puedes crear las tuyas, por ejemplo "Pedidos de clientes", y describírselas a Sol con tus palabras.</T>
    </StepShell>
  );
}

// 8. Questions -------------------------------------------------------------------

export function Questions({ nav }: { nav: StepNav }) {
  const { state } = useStore();
  const open = state.questions.filter((q) => !q.answer);
  return (
    <StepShell
      {...nav}
      onSkip={nav.next}
      skipLabel="Después"
      title={open.length ? 'Hay cosas que no me calzan' : 'Respondiste todo'}
      lead="Cuando no estoy seguro, no adivino: te pregunto así, y antes de responder ves qué voy a hacer."
      footer={<Button label={open.length ? 'Seguir y responder después' : 'Continuar'} kind={open.length ? 'secondary' : 'primary'} onPress={nav.next} />}
    >
      {open.length ? <QuestionCard questions={open} /> : <T tone="muted">Las próximas preguntas te llegan al inicio y en Aprendizaje.</T>}
    </StepShell>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  moon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
