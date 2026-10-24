import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '../../components/tab-bar';
import { useStore } from '../../data/store';

export default function TabsLayout() {
  const { state } = useStore();
  if (!state.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="bandeja" options={{ title: 'Bandeja' }} />
      <Tabs.Screen name="tareas" options={{ title: 'Tareas' }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda' }} />
    </Tabs>
  );
}
