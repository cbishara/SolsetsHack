import { router } from 'expo-router';
import { Mic, Send, Smartphone } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { Button, Card, List, ListRow, Screen, Section, T, ToggleRow } from '../../components/ui';
import { useStore } from '../../data/store';
import { TimeStepper } from '../../features/settings/time-stepper';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

// Sol on WhatsApp: the same agent where Rodrigo already lives. Summaries
// arrive there and voice notes become tasks, with no app to open.
export default function SolWhatsapp() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const { profile } = state;
  const set = (patch: Partial<typeof profile>) => dispatch({ type: 'setProfile', patch });

  return (
    <Screen edges={['top', 'bottom']} padBottom={false}>
      <Header title="Sol en WhatsApp" />

      <View style={{ gap: space.sm }}>
        <T v="title" accessibilityRole="header">Sol también te escribe por WhatsApp</T>
        <T tone="muted">Para que no tengas que abrir la app. Le escribes o le mandas un audio, y lo anota.</T>
      </View>

      <Card tone="surface">
        <View style={s.contact}>
          <View style={[s.icon, { backgroundColor: p.lime }]}><Smartphone size={20} color={p.onLime} strokeWidth={2.2} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodyStrong">Sol</T>
            <T v="callout" tone="muted">+56 9 0000 0000 · número de demo</T>
          </View>
        </View>
        <T v="caption" tone="muted">Guárdalo como contacto. Es un número de prueba, distinto al de tu trabajo.</T>
      </Card>

      <Section eyebrow="Resúmenes">
        <List>
          <ToggleRow
            title="Recibir los resúmenes por WhatsApp"
            detail={profile.whatsappDigest ? 'Llegan a WhatsApp y quedan en la app' : 'Solo en la app'}
            value={profile.whatsappDigest}
            onChange={(v) => set({ whatsappDigest: v })}
          />
          <TimeStepper label="Resumen de la mañana" detail="Qué pasó anoche y qué tienes hoy" value={profile.morningAt} onChange={(morningAt) => set({ morningAt })} />
          <TimeStepper label="Resumen de la noche" detail="Lo pendiente y cómo queda mañana" value={profile.eveningAt} onChange={(eveningAt) => set({ eveningAt })} last />
        </List>
        <Button kind="secondary" icon={Send} label="Ver cómo llegan los mensajes" onPress={() => router.push('/resumen/whatsapp')} />
      </Section>

      <Section eyebrow="Descargar pendientes">
        <List>
          <ListRow icon={Mic} title="Mándale un audio" detail={'"Mañana tengo que llamar al proveedor y pagar la luz." Sol lo transcribe, lo separa en tareas y les pone fecha.'} last />
        </List>
        <T v="caption" tone="faint">Sol te confirma lo que anotó en el mismo chat, para que lo corrijas si algo quedó mal.</T>
      </Section>

      <Section eyebrow="Lo que Sol no hace">
        <T v="callout" tone="muted">No responde a nadie por ti ni escribe en tus grupos. Solo te escribe a ti.</T>
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  contact: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
