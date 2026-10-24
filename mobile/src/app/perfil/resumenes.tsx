import { router } from 'expo-router';
import { FileText, MessageCircle, Smartphone, Sunrise } from 'lucide-react-native';
import { View } from 'react-native';
import { Header } from '../../components/header';
import { Chip, List, ListRow, Screen, Section, T, ToggleRow } from '../../components/ui';
import { useStore } from '../../data/store';
import type { Channel, SummarySettings } from '../../data/types';
import { TimeStepper } from '../../features/settings/time-stepper';
import { useTheme } from '../../theme/theme';
import { categoryColors, space } from '../../theme/tokens';

const CHANNELS: { id: Channel; label: string; icon: typeof Smartphone }[] = [
  { id: 'app', label: 'En la app', icon: Smartphone },
  { id: 'whatsapp', label: 'Por WhatsApp', icon: MessageCircle },
];

/**
 * Resúmenes: one in the morning (what happened overnight and today's plan) and
 * one at the end of the work day (what got done, what moves to tomorrow, and a
 * moment to unload the rest). The person picks the hour and the channel.
 */
export default function Resumenes() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const sum = state.summaries;
  const set = (key: keyof SummarySettings, patch: Partial<SummarySettings['morning']>) =>
    dispatch({ type: 'setSummaries', patch: { [key]: { ...sum[key], ...patch } } });
  const toggle = (key: keyof SummarySettings, ch: Channel) => {
    const has = sum[key].channels.includes(ch);
    const channels = has ? sum[key].channels.filter((c) => c !== ch) : [...sum[key].channels, ch];
    if (channels.length) set(key, { channels });
  };

  const block = (key: keyof SummarySettings, title: string, detail: string, Icon: typeof Sunrise, color: string, preview: () => void) => (
    <Section title={title}>
      <List>
        <ToggleRow icon={Icon} iconColor={color} title={`Recibir ${title.toLowerCase()}`} detail={detail} value={sum[key].on} onChange={(on) => set(key, { on })} last={!sum[key].on} />
        {sum[key].on ? <TimeStepper label="Hora" value={sum[key].at} onChange={(at) => set(key, { at })} last /> : null}
      </List>
      {sum[key].on ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {CHANNELS.map((c) => <Chip key={c.id} label={c.label} icon={c.icon} selected={sum[key].channels.includes(c.id)} onPress={() => toggle(key, c.id)} />)}
        </View>
      ) : null}
      <List>
        <ListRow title="Ver cómo se ve" icon={FileText} iconColor={p.muted} onPress={preview} last />
      </List>
    </Section>
  );

  return (
    <Screen padBottom={false}>
      <Header title="Resúmenes" />
      <T tone="muted">Sol te deja todo ordenado dos veces al día. Elige a qué hora y dónde llegan.</T>
      {block('morning', 'Resumen de la mañana', 'Qué pasó de noche y qué tienes hoy', Sunrise, p.sol, () => router.push('/resumen/manana'))}
      {block('evening', 'Resumen del día', 'Qué se hizo, qué queda para mañana y un momento para soltar lo que tengas en la cabeza', FileText, categoryColors.indigo, () => router.push('/resumen/noche'))}
      <Section title="Por WhatsApp">
        <List>
          <ListRow icon={MessageCircle} iconColor={categoryColors.green} title="Ver cómo llegan los mensajes" detail="Puedes responderle a Sol ahí mismo: corregir, agregar o descargar lo que falte" onPress={() => router.push('/resumen/whatsapp')} last />
        </List>
      </Section>
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}
