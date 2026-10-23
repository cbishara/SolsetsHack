import { BedDouble, Moon, Smartphone, Watch } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Header } from '../../components/header';
import { Card, Chip, List, ListRow, RowView, Screen, Section, Stack, T } from '../../components/ui';
import { useStore } from '../../data/store';
import type { Goal } from '../../data/types';
import { bedMinutes, durationLabel, SleepBars } from '../../features/learning/parts';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

const GOAL_LABEL: Partial<Record<Goal, string>> = {
  dormir_mas: 'Dormir 1 hora más por noche',
  menos_despertares: 'Despertarte menos en la noche',
  constancia: 'Acostarte a una hora más pareja',
};

const LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// Sueño y hábitos: nothing to fill in. Sol estimates from signals it already
// has, says so, and never scores or blames. No medical advice.
export default function Sueno() {
  const { p } = useTheme();
  const { state, sleep, lastNight, dispatch } = useStore();
  const [width, setWidth] = useState(0);

  const last = sleep[sleep.length - 1];
  const FEEL = { Bien: 'bien', 'Más o menos': 'regular', Mal: 'mal' } as const;
  const saved = state.sleepCheck?.[last.date];
  const feel = (Object.keys(FEEL) as (keyof typeof FEEL)[]).find((k) => FEEL[k] === saved) ?? null;
  const setFeel = (o: string | null) => { if (o) dispatch({ type: 'sleepCheck', date: last.date, value: FEEL[o as keyof typeof FEEL] }); };
  const first = sleep[0];
  const earlier = bedMinutes(first.bed) - bedMinutes(last.bed);
  const moreSleep = (last.hours - first.hours) * 60;
  const goal = state.profile.goals.map((g) => GOAL_LABEL[g]).find(Boolean);
  const baseline = (sleep[0].hours + sleep[1].hours + sleep[2].hours) / 3;
  const goalHours = state.profile.goals.includes('dormir_mas') ? Math.round((baseline + 1) * 10) / 10 : undefined;
  const lh = Math.floor(last.hours);
  const lm = Math.round((last.hours - lh) * 60);
  const woke = lastNight.filter((h) => h.wouldWake).length;

  const bars = sleep.map((n) => {
    const d = new Date(`${n.date}T12:00:00`);
    return { label: LETTERS[d.getDay()], hours: n.hours };
  });

  return (
    <Screen edges={['top']}>
      <Header title="Sueño y hábitos" />

      <Stack gap="xs">
        <T v="eyebrow" tone="muted">Anoche</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }} accessible accessibilityLabel={`Anoche dormiste cerca de ${lh} horas y ${lm} minutos`}>
          <T v="numeral">{lh}</T>
          <T v="h2" tone="muted" style={{ marginBottom: 8 }}>h</T>
          <T v="numeral" style={{ marginLeft: space.sm }}>{lm}</T>
          <T v="h2" tone="muted" style={{ marginBottom: 8 }}>min</T>
        </View>
        <T tone="muted">
          Te acostaste a las {last.bed} y despertaste a las {last.wake}. {last.woke ? `Te desperté ${last.woke} ${last.woke === 1 ? 'vez' : 'veces'} por la guardia.` : 'Nada te despertó.'}
        </T>
      </Stack>

      {goal ? (
        <Card tone="accentSoft">
          <T v="eyebrow" tone="accent">Tu meta</T>
          <T v="h3">{goal}</T>
          {earlier > 0 ? (
            <T v="callout" tone="muted">
              Te acuestas {durationLabel(earlier)} antes que hace una semana, y duermes cerca de {durationLabel(moreSleep)} más.
            </T>
          ) : (
            <T v="callout" tone="muted">Vamos de a poco. La meta se mide por semanas, no por una noche.</T>
          )}
        </Card>
      ) : null}

      <Section eyebrow="Últimas 7 noches" title="Horas dormidas">
        <Card>
          <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width ? <SleepBars data={bars} goal={goalHours} width={width} /> : <View style={{ height: 160 }} />}
          </View>
          {goalHours ? (
            <RowView gap="sm">
              <View style={{ width: 18, height: 0, borderTopWidth: 1.5, borderColor: p.calm, borderStyle: 'dashed' }} />
              <T v="caption" tone="muted">Tu meta: {String(goalHours).replace('.', ',')} h, una hora más que tu semana de partida</T>
            </RowView>
          ) : null}
        </Card>
        <RowView gap="sm" style={{ alignItems: 'flex-start' }}>
          <Smartphone size={16} color={p.muted} style={{ marginTop: 2 }} />
          <T v="callout" tone="muted" style={{ flex: 1 }}>
            Estimado con la última y la primera vez que usas el teléfono. No tienes que anotar nada. Si conectas un reloj, es más preciso.
          </T>
        </RowView>
      </Section>

      <Section eyebrow="Lo que noto sin que hagas nada" title="Señales de la semana">
        <List>
          <ListRow icon={Moon} title="Hiciste el cierre de la noche" detail="4 de 7 noches, siempre antes de las 23:30" />
          <ListRow icon={BedDouble} title="Dejaste el celular antes de dormir" detail="3 de 7 noches. Sigue igual, sin presión" />
          <ListRow icon={Watch} title="Despertares por la guardia" detail={`${woke} esta semana. Todos por algo urgente`} last />
        </List>
        <T v="caption" tone="faint">Datos de ejemplo. Son señales para ti, no tareas ni puntajes.</T>
      </Section>

      <Section eyebrow="Si quieres" title="¿Cómo dormiste?">
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {['Bien', 'Más o menos', 'Mal'].map((o) => (
            <Chip key={o} label={o} selected={feel === o} tone={o === 'Mal' ? 'urgent' : o === 'Bien' ? 'calm' : 'accent'} onPress={() => setFeel(feel === o ? null : o)} />
          ))}
        </View>
        <T v="callout" tone="muted">
          {feel ? 'Gracias. Lo cruzo con las horas para ver si los cambios te están sirviendo.' : 'Un toque y listo. Puedes saltártelo cuando quieras.'}
        </T>
      </Section>

      <T v="caption" tone="faint">
        Sol no da consejos médicos. Si duermes mal seguido o roncas fuerte, vale la pena consultarlo con un profesional.
      </T>
    </Screen>
  );
}
