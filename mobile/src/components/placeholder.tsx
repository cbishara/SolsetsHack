import { router } from 'expo-router';
import { Screen, T, Button } from './ui';

/** Temporary screen while a view is being built. */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <Screen edges={['top', 'bottom']}>
      <T v="title" accessibilityRole="header">{title}</T>
      <T tone="muted">{note ?? 'Esta vista se está diseñando.'}</T>
      {router.canGoBack() ? <Button kind="secondary" label="Volver" onPress={() => router.back()} /> : null}
    </Screen>
  );
}
