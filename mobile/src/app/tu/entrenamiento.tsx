import { router } from 'expo-router';
import { CircleHelp, Mail, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react-native';
import { View } from 'react-native';
import { Hero } from '../../components/brand';
import { Header } from '../../components/header';
import { Button, Card, Chip, Divider, List, ListRow, Progress, RowView, Screen, Section, Stack, T } from '../../components/ui';
import { useStore } from '../../data/store';
import { PHASES, SOURCE_LABEL, shortDate, StageLine, Stat, st } from '../../features/learning/parts';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

const fmt = (n: number) => n.toLocaleString('es-CL');

// Entrenamiento: how Sol learns and how far it can be trusted. Trust is earned
// with visible numbers, the one that matters most being urgencies missed.
export default function Entrenamiento() {
  const { p } = useTheme();
  const { state, dispatch, training } = useStore();
  const { pilot, read, categories } = training;
  const active = state.profile.agentMode === 'active';
  const phase = active ? 'trusted' : training.phase;
  const ready = pilot.nights >= pilot.target && pilot.missed === 0;
  const open = state.questions.filter((q) => !q.answer);
  const answered = state.questions.filter((q) => q.answer);
  const learnedRules = state.rules.filter((r) => r.origin === 'feedback');
  const recentMemory = [...state.memory].sort((a, b) => b.learnedAt.localeCompare(a.learnedAt)).slice(0, 3);
  const left = Math.max(0, pilot.target - pilot.nights);

  const headline = active
    ? 'Estoy en modo real. Solo te despierto por lo urgente y, ante la duda, igual te despierto.'
    : ready
      ? 'Pasé la prueba. Cuando quieras, me dejas a cargo.'
      : `Estoy aprendiendo contigo. Me faltan ${left} ${left === 1 ? 'noche' : 'noches'} de prueba.`;

  return (
    <Screen edges={['top']}>
      <Header title="Entrenamiento" />

      <Stack gap="lg">
        <Stack gap="xs">
          <T v="eyebrow" tone="muted">{PHASES.find((x) => x.id === phase)?.label}</T>
          <T v="title" accessibilityRole="header">{headline}</T>
        </Stack>
        <StageLine phase={phase} />
      </Stack>

      <Hero>
        <RowView gap="sm">
          <ShieldCheck size={18} color={p.sol} />
          <T v="eyebrow" tone="onHeroMuted">Modo prueba</T>
        </RowView>
        <T v="h2" tone="onHero">Noche {Math.min(pilot.nights, pilot.target)} de {pilot.target}</T>
        <T v="callout" tone="onHeroMuted">
          Mientras dura la prueba no silencio nada. Te muestro qué habría hecho y tú me corriges.
        </T>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${pilot.nights} de ${pilot.target} noches completas`}>
          {Array.from({ length: pilot.target }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < pilot.nights ? p.sol : 'rgba(255,255,255,0.22)' }} />
          ))}
        </View>
      </Hero>

      <Section eyebrow="Cómo voy" title="Lo que me dice tu feedback">
        <Card>
          <View style={st.stats}>
            <Stat lead value={String(pilot.missed)} label="Urgencias que dejé pasar" tone={pilot.missed ? 'urgent' : 'calm'} />
            <Stat value={`${Math.round(pilot.agreement * 100)}%`} label={`De acuerdo contigo, en ${pilot.rated} decisiones`} />
          </View>
          <Divider />
          <View style={st.stats}>
            <Stat value={String(pilot.tooMany)} label="Te habría despertado de más" />
            <Stat value={String(pilot.nights)} label="Noches revisadas" />
          </View>
          <T v="callout" tone="muted">
            Lo que manda es la primera cifra. Para dejarme a cargo necesito {pilot.target} noches seguidas sin dejar pasar nada urgente.
          </T>
        </Card>

        {active ? (
          <Card tone="calmSoft">
            <T v="bodyStrong">Estás en modo real</T>
            <T v="callout" tone="muted">Si algo no te convence, vuelve al modo prueba. No pierdes nada de lo aprendido.</T>
            <Button kind="secondary" label="Volver al modo prueba" onPress={() => dispatch({ type: 'setProfile', patch: { agentMode: 'shadow' } })} />
          </Card>
        ) : ready ? (
          <Card tone="accentSoft">
            <T v="bodyStrong">¿Me dejas a cargo?</T>
            <T v="callout" tone="muted">
              En modo real silencio lo que puede esperar y solo te despierto por lo urgente. Ante la duda, igual te despierto.
            </T>
            <Button label="Pasar a modo real" onPress={() => dispatch({ type: 'setProfile', patch: { agentMode: 'active' } })} />
          </Card>
        ) : (
          <Card tone="surface">
            <T v="bodyStrong">Todavía no te propongo el modo real</T>
            <T v="callout" tone="muted">
              {pilot.missed
                ? 'Hace poco dejé pasar algo que debió despertarte. Vuelvo a contar desde cero.'
                : `Faltan ${left} ${left === 1 ? 'noche' : 'noches'}. Cada mañana, marca en el resumen si acerté. Toma menos de un minuto.`}
            </T>
            <Progress value={pilot.nights / pilot.target} />
          </Card>
        )}
      </Section>

      <Section eyebrow="Preguntas para ti" title={open.length ? `Tengo ${open.length} ${open.length === 1 ? 'duda' : 'dudas'}` : 'No tengo dudas por ahora'}>
        {open.length ? (
          <T v="callout" tone="muted">Cuando no entiendo algo, te pregunto en vez de adivinar.</T>
        ) : null}
        {open.map((q) => (
          <Card key={q.id}>
            <RowView gap="sm">
              <CircleHelp size={18} color={p.accent} />
              <T v="bodyStrong" style={{ flex: 1 }}>{q.text}</T>
            </RowView>
            {q.context ? <T v="callout" tone="muted">{q.context}</T> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {q.options.map((o) => (
                <Chip key={o} label={o} onPress={() => dispatch({ type: 'answer', id: q.id, answer: o })} />
              ))}
            </View>
          </Card>
        ))}
        {answered.length ? (
          <List>
            {answered.map((q, i) => (
              <ListRow key={q.id} title={q.text} detail={`Ya me lo dijiste: ${q.answer}`} last={i === answered.length - 1} />
            ))}
          </List>
        ) : null}
      </Section>

      <Section eyebrow="Lo último que aprendí" title="Aprendo de tus correcciones">
        <List>
          {learnedRules.map((r) => (
            <ListRow key={r.id} icon={Sparkles} title={r.text} detail="Regla nueva, salió de tu feedback" onPress={() => router.push('/tu/reglas')} />
          ))}
          {recentMemory.map((m, i) => (
            <ListRow key={m.id} title={m.text} detail={`${SOURCE_LABEL[m.source]}, ${shortDate(m.learnedAt)}`} last={i === recentMemory.length - 1} />
          ))}
        </List>
        {!learnedRules.length ? (
          <T v="callout" tone="muted">Cuando me corrijas en el resumen de la mañana, la corrección aparece aquí como regla.</T>
        ) : null}
        <Button kind="ghost" label="Ver todo lo que sé de ti" onPress={() => router.push('/tu/memoria')} />
      </Section>

      <Section eyebrow="Lo que leí al empezar" title={`Tus últimos ${read.months} meses`}>
        <Card>
          <View style={st.stats}>
            <View style={{ flex: 1, gap: 4 }}>
              <RowView gap="xs"><MessageCircle size={15} color={p.muted} /><T v="caption" tone="muted">WhatsApp</T></RowView>
              <T v="h2" style={{ fontVariant: ['tabular-nums'] }}>{fmt(read.messages)}</T>
              <T v="caption" tone="muted">mensajes</T>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <RowView gap="xs"><Mail size={15} color={p.muted} /><T v="caption" tone="muted">Correo</T></RowView>
              <T v="h2" style={{ fontVariant: ['tabular-nums'] }}>{fmt(read.emails)}</T>
              <T v="caption" tone="muted">correos</T>
            </View>
          </View>
        </Card>
        <List>
          {categories.map((c, i) => (
            <ListRow key={c.id} title={c.label} detail={c.example} value={fmt(c.count)} last={i === categories.length - 1} />
          ))}
        </List>
        <T v="caption" tone="faint">Datos de ejemplo. Con eso propuse tus primeras reglas y tú las confirmaste.</T>
        <Button kind="secondary" label="Ver y editar tus reglas" onPress={() => router.push('/tu/reglas')} />
      </Section>
    </Screen>
  );
}
