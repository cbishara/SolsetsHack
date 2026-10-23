import { router } from 'expo-router';
import {
  Brain, BookOpenCheck, Link2, ListFilter, MessageCircle, Moon, RotateCcw, Sparkles, BedDouble,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Hero } from '../../components/brand';
import { Badge, List, ListRow, Progress, Screen, Section, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { confirm } from '../../features/settings/confirm';
import { GOAL_LABEL } from '../../features/settings/labels';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

// "Tú": everything Sol knows and how it works for you. Sol itself is the
// button bottom right; this tab is its control center.
export default function Tu() {
  const { p, scheme, night } = useTheme();
  const { state, dispatch, training } = useStore();
  const { profile, connections, rules, memory } = state;
  const { nights, target } = training.pilot;
  const connected = connections.filter((c) => c.status === 'connected').length;
  const learned = rules.filter((r) => r.origin === 'feedback').length;
  const open = state.questions.filter((q) => !q.answer).length;
  const trusted = profile.agentMode === 'active';

  return (
    <Screen>
      <T v="title" accessibilityRole="header">Tú</T>

      <Hero>
        <View style={s.profileHead}>
          <View style={[s.avatar, { backgroundColor: p.lime }]}>
            <T v="h2" tone="onLime">{profile.name.charAt(0)}</T>
          </View>
          <View style={{ flex: 1 }}>
            <T v="h2" tone="onHero">{profile.name}</T>
            <T v="callout" tone="onHeroMuted">Sol sabe {memory.length} cosas de ti</T>
          </View>
        </View>
        {profile.about ? <T tone="onHero">{profile.about}</T> : null}
        <View style={s.goals}>
          {profile.goals.map((g) => (
            <View key={g} style={[s.goal, { borderColor: p.onHeroMuted }]}>
              <T v="caption" tone="onHero">{GOAL_LABEL[g]}</T>
            </View>
          ))}
        </View>
      </Hero>

      <Section eyebrow="Cómo aprende Sol">
        <List>
          <ListRow
            icon={BookOpenCheck}
            title="Entrenamiento"
            detail={trusted ? 'Sol ya trabaja en modo real' : `Noche ${nights} de ${target} en modo prueba`}
            right={open ? <Badge label={`${open} ${open === 1 ? 'pregunta' : 'preguntas'}`} tone="accent" /> : undefined}
            onPress={() => router.push('/tu/entrenamiento')}
            last={!trusted}
          />
          {!trusted ? (
            <View style={[s.pilot, { borderBottomColor: p.line }]}>
              <Progress value={nights / target} tone="calm" />
              <T v="caption" tone="muted">Cuando pasen {target} noches sin dejar pasar nada urgente, te propongo el modo real.</T>
            </View>
          ) : null}
          <ListRow icon={Brain} title="Memoria" detail="Lo que Sol sabe de ti, y de dónde lo sacó" value={String(memory.length)} onPress={() => router.push('/tu/memoria')} />
          <ListRow icon={ListFilter} title="Reglas" detail={learned ? `${rules.length} reglas, ${learned} aprendidas de ti` : `${rules.length} reglas`} onPress={() => router.push('/tu/reglas')} last />
        </List>
      </Section>

      <Section eyebrow="Tu descanso">
        <List>
          <ListRow icon={BedDouble} title="Sueño y hábitos" detail="Sin registrar nada: Sol lo estima" onPress={() => router.push('/tu/sueno')} />
          <ListRow
            icon={Moon}
            title="Modo noche"
            detail={night.manual === 'night' ? 'Activado a mano' : night.scheduled ? `De ${night.start} a ${night.end}` : 'Solo a mano'}
            right={scheme === 'night' ? <Badge label="Ahora" tone="calm" /> : undefined}
            onPress={() => router.push('/tu/noche')}
            last
          />
        </List>
      </Section>

      <Section eyebrow="Conexiones">
        <List>
          <ListRow icon={Link2} title="Conexiones" detail={`${connected} de ${connections.length} conectadas, todo al día`} onPress={() => router.push('/tu/conexiones')} />
          <ListRow icon={MessageCircle} title="Sol en WhatsApp" detail={profile.whatsappDigest ? `Resúmenes a las ${profile.morningAt} y ${profile.eveningAt}` : 'Resúmenes solo en la app'} onPress={() => router.push('/tu/whatsapp')} last />
        </List>
      </Section>

      <Section eyebrow="Demo">
        <List>
          <ListRow
            icon={Sparkles}
            title="Ver el onboarding otra vez"
            detail="Vuelve a empezar como alguien nuevo"
            onPress={() => confirm('Ver el onboarding otra vez', 'Vuelves al inicio con los datos de ejemplo.', () => {
              dispatch({ type: 'reset', onboarded: false });
              router.replace('/onboarding');
            })}
          />
          <ListRow
            icon={RotateCcw}
            iconTone="muted"
            title="Reiniciar datos de ejemplo"
            detail="Deshace tus cambios en esta demo"
            onPress={() => confirm('Reiniciar datos de ejemplo', 'Se borran tus cambios en esta demo.', () => dispatch({ type: 'reset', onboarded: true }), 'Reiniciar')}
            last
          />
        </List>
        <T v="caption" tone="faint">Todos los datos son de ejemplo. Ninguna persona ni mensaje es real.</T>
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  goal: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
  pilot: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: -space.xs },
});
