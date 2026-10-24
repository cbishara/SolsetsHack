import { router } from 'expo-router';
import { BookOpen, Brain, ListFilter, Mail, MessageCircle, Tags, ThumbsUp } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Badge, Button, Glass, IconTile, List, ListRow, Screen, Section, Stat, T, tap } from '../../components/ui';
import { relative } from '../../data/dates';
import { useStore } from '../../data/store';
import { QuestionCard } from '../../features/home/question-card';
import { confirm } from '../../features/settings/confirm';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

const fmt = (n: number) => n.toLocaleString('es-CL');

/**
 * Aprendizaje: how far Sol can be trusted, with the numbers that matter
 * (urgencies it would have missed first), what it learned and from where,
 * and the switch to real mode once the person trusts it.
 */
export default function Aprendizaje() {
  const { p } = useTheme();
  const { state, dispatch, training } = useStore();
  const { pilot, read } = training;
  const { profile } = state;
  const active = profile.agentMode === 'active';
  const day = Math.min(profile.pilot.days, Math.max(1, Math.ceil((Date.now() - new Date(profile.pilot.startedAt).getTime()) / 86_400_000)));
  const rated = state.items.filter((i) => i.feedback).length + pilot.rated;
  const open = state.questions.filter((q) => !q.answer);
  const ready = day >= profile.pilot.days && pilot.missed === 0;

  const learned = [
    ...state.categories.filter((c) => c.origin === 'you' || (c.status === 'active' && c.createdAt > profile.pilot.startedAt)).map((c) => ({ id: c.id, icon: Tags, color: categoryColors[c.color], text: `Categoría "${c.name}"`, detail: c.origin === 'you' ? 'La creaste tú' : 'La aceptaste', at: c.createdAt })),
    ...state.rules.filter((r) => r.origin === 'feedback').map((r) => ({ id: r.id, icon: ThumbsUp, color: p.calm, text: r.text, detail: 'Aprendido de tu corrección', at: profile.pilot.startedAt })),
    ...state.memory.slice(0, 4).map((m) => ({ id: m.id, icon: Brain, color: categoryColors.pink, text: m.text, detail: 'Lo que sé de ti', at: m.learnedAt })),
    ...state.questions.filter((q) => q.answer && q.answeredAt).map((q) => ({ id: q.id, icon: BookOpen, color: p.sol, text: q.text, detail: `Respondiste: ${q.answer}`, at: q.answeredAt! })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  const goLive = () => confirm('Pasar al modo real', 'Desde ahora silencio lo que no es urgente. Igual te aviso si no estoy seguro, y puedes volver al modo prueba cuando quieras.', () => {
    tap('success');
    dispatch({ type: 'setProfile', patch: { agentMode: 'active' } });
  }, 'Pasar a modo real');

  return (
    <Screen padBottom={false} glow="sol">
      <Header title="Aprendizaje" />

      <Glass style={s.hero}>
        <View style={s.head}>
          <SolOrb size={22} state={active ? 'watching' : 'shadow'} style={{ margin: -10 }} />
          <View style={{ flex: 1 }}>
            <T v="h3">{active ? 'Modo real' : `Modo prueba · día ${day} de ${profile.pilot.days}`}</T>
            <T v="caption" tone="muted">{active ? 'Silencio lo que no es urgente. Ante la duda, te aviso.' : 'No silencio nada: te muestro qué habría hecho y tú me corriges.'}</T>
          </View>
          <Badge label={active ? 'Activo' : 'Prueba'} tone={active ? 'calm' : 'sol'} />
        </View>
        {!active ? (
          <View style={s.days} accessibilityLabel={`Día ${day} de ${profile.pilot.days}`}>
            {Array.from({ length: profile.pilot.days }, (_, i) => (
              <View key={i} style={[s.dayDot, { backgroundColor: i < day ? p.sol : p.surface }]} />
            ))}
          </View>
        ) : null}
        <View style={[s.stats, { borderTopColor: p.glassLine }]}>
          <Stat value={`${Math.round(pilot.agreement * 100)}%`} label="Coincido contigo" tone="calm" />
          <Stat value={pilot.missed} label="Urgencias sin avisar" tone={pilot.missed ? 'urgent' : 'ink'} />
          <Stat value={pilot.tooMany} label="Avisos de más" />
        </View>
        <T v="caption" tone="faint">{`Con ${rated} decisiones que revisaste. Lo más importante: que no se me pase ninguna urgencia.`}</T>
        {!active ? (
          <Button kind={ready ? 'sol' : 'secondary'} label={ready ? 'Pasar al modo real' : 'Pasar al modo real antes'} onPress={goLive} />
        ) : (
          <Button kind="ghost" label="Volver al modo prueba" onPress={() => { tap(); dispatch({ type: 'setProfile', patch: { agentMode: 'shadow' } }); }} />
        )}
      </Glass>

      {open.length ? (
        <Section title="Me ayudarías respondiendo" count={open.length}>
          <QuestionCard questions={open} />
        </Section>
      ) : null}

      {learned.length ? (
        <Section title="Lo último que aprendí">
          <List>
            {learned.map((l, i) => (
              <ListRow key={l.id} title={l.text} numberOfLines={2} detail={`${l.detail} · ${relative(l.at)}`} leading={<IconTile icon={l.icon} color={l.color} size={32} />} last={i === learned.length - 1} />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title="Para empezar, leí">
        <List>
          <ListRow icon={MessageCircle} iconColor="#25D366" title={`${fmt(read.messages)} mensajes de WhatsApp`} detail={`De los chats que elegiste, últimos ${read.months} meses`} />
          <ListRow icon={Mail} iconColor={categoryColors.blue} title={`${fmt(read.emails)} correos`} detail="Para reconocer remitentes, plazos y avisos automáticos" last />
        </List>
        <T v="caption" tone="faint">De ahí salieron tus categorías iniciales. No guardo los mensajes completos: solo lo que me sirve para clasificar.</T>
      </Section>

      <List>
        <ListRow icon={Tags} iconColor={categoryColors.orange} title="Categorías" onPress={() => router.push('/categorias')} />
        <ListRow icon={ListFilter} iconColor={categoryColors.indigo} title="Reglas" value={`${state.rules.length}`} onPress={() => router.push('/perfil/reglas')} last />
      </List>
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { padding: space.xl, gap: space.lg, borderRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  days: { flexDirection: 'row', gap: 4 },
  dayDot: { flex: 1, height: 6, borderRadius: 3 },
  stats: { flexDirection: 'row', gap: space.md, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
