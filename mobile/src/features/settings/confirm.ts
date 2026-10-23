import { Alert, Platform } from 'react-native';

/** Native confirm on the phone, window.confirm on the web preview. */
export function confirm(title: string, message: string, action: () => void, cta = 'Continuar') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) action();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: cta, onPress: action },
  ]);
}
