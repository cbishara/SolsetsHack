import { Stack } from 'expo-router';
import { useTheme } from '../../theme/theme';

/** Profile and settings: a sheet with its own navigation, like iOS Settings. */
export default function PerfilLayout() {
  const { p } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />;
}
