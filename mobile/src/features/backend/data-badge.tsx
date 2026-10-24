import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useBackend } from '../../api/backend';
import { Badge } from '../../components/ui';

/** Tells the truth about the data on screen: live from the server, or example data. Tap to see why. */
export function DataBadge() {
  const { status } = useBackend();
  const live = status === 'connected';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={live ? 'Conectado al servidor. Ver conexiones' : 'Datos de ejemplo. Ver conexiones'}
      onPress={() => router.push('/perfil/conexiones')} hitSlop={8}>
      <Badge label={live ? 'En vivo' : status === 'error' ? 'Sin servidor' : 'Datos de ejemplo'} tone={live ? 'calm' : status === 'error' ? 'urgent' : 'neutral'} />
    </Pressable>
  );
}
