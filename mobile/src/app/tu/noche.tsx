import { BellRing, ListChecks, Moon, Sun } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { Button, Card, List, Screen, Section, T, ToggleRow } from '../../components/ui';
import { useStore } from '../../data/store';
import { ChoiceCard } from '../../features/settings/choice-card';
import { hoursBetween } from '../../features/settings/format';
import { TimeStepper } from '../../features/settings/time-stepper';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

// Night mode: when it turns on, and what Sol does while you sleep.
export default function ModoNoche() {
  const { p, scheme, night, setNight, setManual } = useTheme();
  const { state, setNightStyle } = useStore();
  const style = state.profile.nightStyle;
  const isNight = scheme === 'night';

  return (
    <Screen edges={['top', 'bottom']} padBottom={false}>
      <Header title="Modo noche" />

      <Card tone="surface">
        <View style={s.now}>
          {isNight ? <Moon size={22} color={p.accent} /> : <Sun size={22} color={p.accent} />}
          <T v="h3" style={{ flex: 1 }}>{isNight ? 'El modo noche está activo' : 'Estás en modo día'}</T>
        </View>
        <T v="callout" tone="muted">
          {isNight
            ? 'La app se oscurece y baja el brillo para no despertarte la cabeza.'
            : night.scheduled
              ? `Se activa solo a las ${night.start}.`
              : 'Lo activas tú cuando te vas a dormir.'}
        </T>
        <Button
          kind={isNight ? 'secondary' : 'primary'}
          icon={isNight ? Sun : Moon}
          label={isNight ? 'Volver al modo día' : 'Activar el modo noche ahora'}
          onPress={() => setManual(isNight ? 'day' : 'night')}
        />
        {night.manual ? <Button kind="ghost" label="Seguir mi horario" onPress={() => setManual(null)} /> : null}
      </Card>

      <Section eyebrow="Horario">
        <List>
          <ToggleRow
            title="Activar según mi horario"
            detail={night.scheduled ? `Noche de ${hoursBetween(night.start, night.end)}` : 'Apagado: solo a mano'}
            value={night.scheduled}
            onChange={(scheduled) => setNight({ ...night, scheduled })}
            last={!night.scheduled}
          />
          {night.scheduled ? (
            <>
              <TimeStepper label="Empieza" detail="Hora de cerrar el día" value={night.start} onChange={(start) => setNight({ ...night, start })} />
              <TimeStepper label="Termina" detail="Hora de tu alarma" value={night.end} onChange={(end) => setNight({ ...night, end })} last />
            </>
          ) : null}
        </List>
        <T v="caption" tone="faint">Si tus turnos cambian, Sol puede seguir el calendario de turnos. Lo confirmas cada noche.</T>
      </Section>

      <Section eyebrow="Mientras duermes" title="¿Qué hace Sol de noche?">
        <View style={{ gap: space.md }} accessibilityRole="radiogroup">
          <ChoiceCard
            icon={BellRing}
            title="Despiértame solo si es urgente"
            detail="Sol vigila tus chats. Si se cae algo importante, te avisa con una notificación y, si no la ves en 3 minutos, te llama. Lo demás espera a la mañana."
            selected={style === 'wake_if_urgent'}
            onPress={() => setNightStyle('wake_if_urgent')}
          />
          <ChoiceCard
            icon={ListChecks}
            title="No me despiertes, déjame todo ordenado"
            detail="Sol no te interrumpe por nada. Antes de dormir te muestra lo pendiente, y en la mañana lo que llegó, ordenado."
            selected={style === 'summary_only'}
            onPress={() => setNightStyle('summary_only')}
          />
        </View>
        <T v="caption" tone="faint">Mientras Sol está en modo prueba, no silencia nada: solo te muestra qué habría hecho.</T>
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  now: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
