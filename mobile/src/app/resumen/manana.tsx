import { router } from 'expo-router';
import { ChevronDown, ChevronUp, EyeOff, Moon, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Hero } from '../../components/brand';
import { Header } from '../../components/header';
import { Button, Card, LinkButton, Screen, Section, SourceTag, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import { DecisionCard } from '../../features/digest/decision-card';
import { byTime, partition, plural, sleepLine, topTasks, wokeSentence } from '../../features/digest/format';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';
import { dueText, feedbackOf } from '../../data/compat';

// Morning summary: read in under a minute. The order answers, in turn:
// did anything happen, how did I sleep, what did Sol decide (and was it
// right), and what matters today.
export default function ResumenManana() {
  const { p } = useTheme();
  const { state, lastNight, sleep, toggleTask } = useStore();
  const [showNoise, setShowNoise] = useState(false);
  const { woke, waited, noise } = partition(byTime(lastNight));
  const slept = sleepLine(sleep);
  const today = topTasks(state.tasks);
  const shadow = state.profile.agentMode === 'shadow';
  const rated = lastNight.filter((i) => feedbackOf(state)[i.id]).length;
  const toRate = woke.length + waited.length;

  return (
    <Screen edges={['top', 'bottom']} padBottom={false} style={{ paddingBottom: space.section }}>
      <Header close right={<LinkButton label="Ver en WhatsApp" onPress={() => router.push('/resumen/whatsapp')} />} />

      <Hero>
        <T v="eyebrow" tone="onHeroMuted">Buenos días, {state.profile.name}</T>
        <T v="title" tone="onHero" accessibilityRole="header">{wokeSentence(woke.length)}</T>
        <T tone="onHeroMuted">
          Revisé {plural(lastNight.length, 'mensaje', 'mensajes')} mientras dormías. {plural(waited.length, 'quedó', 'quedaron')} como tarea.
        </T>
        {slept ? (
          <View style={[s.sleep, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <Moon size={18} color={p.onHero} />
            <View style={{ flex: 1 }}>
              <T v="calloutStrong" tone="onHero">{slept.text}</T>
              <T v="caption" tone="onHeroMuted">{slept.detail}</T>
            </View>
          </View>
        ) : null}
      </Hero>

      {shadow ? (
        <Card tone="accentSoft" style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <EyeOff size={20} color={p.accent} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="calloutStrong" tone="accent">Modo prueba</T>
            <T v="callout">No silencié nada. Esto es lo que habría hecho. Marca si acerté: así aprendo y pronto puedo cuidarte de verdad.</T>
          </View>
        </Card>
      ) : null}

      {woke.length ? (
        <Section eyebrow="Te desperté" title={plural(woke.length, 'vez', 'veces')}>
          {woke.map((i) => <DecisionCard key={i.id} item={i} />)}
        </Section>
      ) : null}

      <Section eyebrow="Te esperó" title={`${plural(waited.length, 'cosa', 'cosas')}, ya con fecha`}>
        {waited.map((i) => <DecisionCard key={i.id} item={i} />)}
      </Section>

      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showNoise }}
          onPress={() => { tap(); setShowNoise((v) => !v); }}
          style={s.noiseHead}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodyStrong">{plural(noise.length, 'mensaje', 'mensajes')} sin importancia</T>
            <T v="callout" tone="muted">Conversación del grupo y repetidos. Ninguno te necesitaba.</T>
          </View>
          {showNoise ? <ChevronUp size={20} color={p.muted} /> : <ChevronDown size={20} color={p.muted} />}
        </Pressable>
        {showNoise
          ? noise.map((i) => (
              <View key={i.id} style={[s.noiseRow, { borderTopColor: p.line }]}>
                <T v="callout" style={{ flex: 1 }} numberOfLines={1}>{i.title ?? i.text}</T>
                <SourceTag source={i.source} label={i.from} />
              </View>
            ))
          : null}
      </Card>

      <Section eyebrow="Lo importante de hoy" title="Empieza por esto">
        <Card style={{ gap: 0, paddingVertical: space.sm }}>
          {today.map((t, i) => (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: t.done }}
              accessibilityLabel={t.title}
              onPress={() => { tap('light'); toggleTask(t.id); }}
              style={[s.task, i < today.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}
            >
              <View style={[s.check, { borderColor: p.accent, backgroundColor: t.done ? p.accent : 'transparent' }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="body" style={t.done ? { textDecorationLine: 'line-through', opacity: 0.55 } : undefined}>{t.title}</T>
                <T v="caption" tone="muted">{dueText(t)} · {t.sourceLabel}</T>
              </View>
            </Pressable>
          ))}
        </Card>
      </Section>

      <View style={{ gap: space.md }}>
        {toRate > rated ? (
          <T v="callout" tone="muted" style={{ textAlign: 'center' }}>
            Marcaste {rated} de {toRate}. Lo que no marques también me sirve.
          </T>
        ) : (
          <T v="callout" tone="calm" style={{ textAlign: 'center' }}>Marcaste todo. Gracias, así aprendo más rápido.</T>
        )}
        <Button kind="primary" label="Empezar el día" onPress={() => router.back()} />
        <Button kind="ghost" icon={Send} label="Así te llega por WhatsApp" onPress={() => router.push('/resumen/whatsapp')} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  sleep: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 14, marginTop: space.xs },
  noiseHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  noiseRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 56 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2 },
});
