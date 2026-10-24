import { InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold, useFonts } from '@expo-google-fonts/inter-tight';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackendProvider } from '../api/backend';
import { StoreProvider, useStore } from '../data/store';
import { ThemeProvider, useTheme } from '../theme/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { p } = useTheme();
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="sol" options={{ presentation: 'modal' }} />
        <Stack.Screen name="alerta" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="guardia" options={{ presentation: 'modal' }} />
        <Stack.Screen name="resumen/manana" options={{ presentation: 'modal' }} />
        <Stack.Screen name="resumen/noche" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

/** The theme reads and saves the night schedule from the store. */
function Themed() {
  const { state, dispatch, ready } = useStore();
  if (!ready) return null;
  return (
    <ThemeProvider initial={state.night} onChange={(night) => dispatch({ type: 'setNight', night })}>
      <BackendProvider>
        <Navigator />
      </BackendProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold });
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Themed />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
