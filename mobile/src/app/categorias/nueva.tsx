import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Header } from '../../components/header';
import { Button, Screen, T, tap } from '../../components/ui';
import { newId, useStore } from '../../data/store';
import { CategoryForm, type CategoryDraft } from '../../features/categories/category-form';
import { space } from '../../theme/tokens';

/** Create a category in plain words. Sol starts using it with the next message. */
export default function NuevaCategoria() {
  const { dispatch } = useStore();
  const [draft, setDraft] = useState<CategoryDraft>({ name: '', color: 'blue', icon: 'briefcase', description: '', action: 'task', wakeAtNight: false });
  const ready = draft.name.trim().length > 1 && draft.description.trim().length > 5;

  const create = () => {
    tap('success');
    dispatch({ type: 'addCategory', category: { ...draft, name: draft.name.trim(), id: newId('c'), origin: 'you', status: 'active', createdAt: new Date().toISOString() } });
    router.back();
  };

  return (
    <Screen padBottom={false}>
      <Header title="Nueva categoría" right={<Button small kind={ready ? 'sol' : 'secondary'} label="Crear" disabled={!ready} onPress={create} />} />
      <View style={{ gap: space.xs }}>
        <T v="title" accessibilityRole="header">Nueva categoría</T>
        <T tone="muted">Dile a Sol qué tipo de cosas son y qué hacer con ellas. Desde el próximo mensaje la usa.</T>
      </View>
      <CategoryForm value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
      <Button kind="sol" label="Crear categoría" disabled={!ready} onPress={create} />
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}
