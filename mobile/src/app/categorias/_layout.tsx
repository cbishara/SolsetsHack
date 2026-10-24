import { Stack } from 'expo-router';
import { useTheme } from '../../theme/theme';

export default function CategoriasLayout() {
  const { p } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />;
}
