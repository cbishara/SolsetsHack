import { router, useLocalSearchParams } from 'expo-router';
import { Tags, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import { Header } from '../../components/header';
import { Button, EmptyState, List, ListRow, Screen, Section, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import { CategoryForm } from '../../features/categories/category-form';
import { ItemRow } from '../../features/inbox/item-row';
import { confirm } from '../../features/settings/confirm';
import { space } from '../../theme/tokens';

/** One category. Changes apply as you make them, like Settings. */
export default function Categoria() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const c = state.categories.find((x) => x.id === id);
  if (!c) {
    return (
      <Screen padBottom={false}>
        <Header />
        <EmptyState icon={Tags} title="Esta categoría ya no existe" />
      </Screen>
    );
  }
  const items = state.items.filter((i) => i.categoryId === c.id || (c.status === 'suggested' && state.questions.some((q) => q.categoryId === c.id && q.itemId === i.id))).slice(0, 5);
  const suggested = c.status === 'suggested';
  const question = state.questions.find((q) => q.categoryId === c.id && !q.answer);

  return (
    <Screen padBottom={false}>
      <Header title={suggested ? 'Propuesta de Sol' : 'Categoría'} />
      <View style={{ gap: space.xs }}>
        <T v="title" accessibilityRole="header">{c.name || 'Sin nombre'}</T>
        <T tone="muted">{suggested ? 'Sol la propone porque vio varios mensajes parecidos. Ajústala y acéptala, o descártala.' : c.origin === 'you' ? 'La creaste tú.' : 'Sol la creó a partir de tu historial.'}</T>
      </View>

      {suggested ? (
        <Button kind="sol" label="Aceptar categoría" onPress={() => {
          tap('success');
          const i = question?.actions?.indexOf(c.action) ?? -1;
          if (question && i >= 0) dispatch({ type: 'answer', id: question.id, index: i });
          dispatch({ type: 'updateCategory', id: c.id, patch: { status: 'active' } });
          if (question?.itemId && i < 0) dispatch({ type: 'categorize', id: question.itemId, categoryId: c.id });
          router.back();
        }} />
      ) : null}

      <CategoryForm value={c} onChange={(patch) => dispatch({ type: 'updateCategory', id: c.id, patch })} />

      <Section title={suggested ? 'Lo que vio Sol' : 'Lo último que llegó aquí'} count={items.length}>
        {items.length ? (
          <List>
            {items.map((i, n) => <ItemRow key={i.id} item={i} category={suggested ? undefined : c} onPress={() => router.push(`/entrada/${i.id}`)} compact last={n === items.length - 1} />)}
          </List>
        ) : <T v="callout" tone="muted">Todavía no llega nada a esta categoría.</T>}
      </Section>

      <List>
        <ListRow icon={Trash2} iconTone="urgent" titleTone="urgent" title={suggested ? 'Descartar propuesta' : 'Eliminar categoría'}
          detail={suggested ? undefined : 'Lo que tenía queda en la bandeja, por confirmar'}
          onPress={() => confirm(suggested ? 'Descartar propuesta' : 'Eliminar categoría', suggested ? 'Sol no la volverá a proponer por ahora.' : `Lo que estaba en "${c.name}" queda por confirmar.`, () => {
            dispatch({ type: 'removeCategory', id: c.id });
            router.back();
          }, suggested ? 'Descartar' : 'Eliminar')} last />
      </List>
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}
