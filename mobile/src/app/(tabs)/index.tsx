import { DataBadge } from '../../features/backend/data-badge';
import { View } from 'react-native';
import { Wordmark } from '../../components/brand';
import { SolOrb } from '../../components/sol-orb';
import { Badge, Screen, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { EveningCard, Important, MorningHero, Watching, Week } from '../../features/today/day-sections';
import { greeting, momentOf } from '../../features/today/moment';
import { NightView } from '../../features/today/night-view';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

// Synthetic: messages Sol has read today across WhatsApp and email.
const REVIEWED_TODAY = 38;

/**
 * Hoy. By day Sol works as a secretary: what matters, the week, and proof it
 * is watching. At night the screen changes purpose: guard status or a free
 * night, with very little light.
 */
export default function Hoy() {
  const { scheme } = useTheme();
  const { state } = useStore();
  const moment = momentOf(scheme, state.profile.eveningAt);
  const need = state.tasks.filter((t) => t.important && !t.done).length;

  return (
    <Screen glow={moment === 'night' ? 'sol' : 'neutral'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark size={22} />
        <DataBadge />
      </View>

      {moment === 'night' ? (
        <NightView name={state.profile.name} />
      ) : (
        <>
          <SolOrb size={64} state="watching" style={{ alignSelf: 'flex-start', marginLeft: -30, marginVertical: -30 }} />
          <View style={{ gap: space.xs, marginTop: -space.lg }}>
            <T v="title" accessibilityRole="header">{greeting()}, {state.profile.name}</T>
            <T tone="muted">
              Revisé {REVIEWED_TODAY} mensajes hoy.{' '}
              {need ? 'Lo demás ya está ordenado.' : 'Nada te necesita ahora.'}
            </T>
          </View>
          {moment === 'morning' ? <MorningHero /> : null}
          {moment === 'evening' ? <EveningCard /> : null}
          <Important />
          <Week />
          <Watching />
        </>
      )}
    </Screen>
  );
}
