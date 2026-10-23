import { Check } from 'lucide-react-native';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { T } from '../../components/ui';
import type { MemoryItem, TrainingPhase } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { font, radius, space } from '../../theme/tokens';

export const PHASES: { id: TrainingPhase; label: string }[] = [
  { id: 'connect', label: 'Conectar' },
  { id: 'reading', label: 'Leer historial' },
  { id: 'proposing', label: 'Proponer reglas' },
  { id: 'pilot', label: 'Piloto' },
  { id: 'trusted', label: 'Confiable' },
];

/** Stage line: done stages filled, the current one ringed, the rest quiet. */
export function StageLine({ phase }: { phase: TrainingPhase }) {
  const { p } = useTheme();
  const current = PHASES.findIndex((x) => x.id === phase);
  return (
    <View
      style={st.stages}
      accessibilityRole="progressbar"
      accessibilityLabel={`Etapa ${current + 1} de ${PHASES.length}: ${PHASES[current]?.label}`}
    >
      {PHASES.map((ph, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <View key={ph.id} style={st.stage}>
            <View style={st.track}>
              <View style={[st.bar, { backgroundColor: i === 0 ? 'transparent' : done || now ? p.accent : p.line }]} />
              <View
                style={[
                  st.node,
                  { borderColor: done || now ? p.accent : p.line, backgroundColor: done ? p.accent : p.card },
                  now && { borderWidth: 3 },
                ]}
              >
                {done ? <Check size={12} color={p.onAccent} strokeWidth={3} /> : null}
              </View>
              <View style={[st.bar, { backgroundColor: i === PHASES.length - 1 ? 'transparent' : done ? p.accent : p.line }]} />
            </View>
            <T v="caption" tone={now ? 'accent' : done ? 'ink' : 'faint'} style={{ textAlign: 'center' }} numberOfLines={2}>
              {ph.label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

/** A labeled number. `lead` makes it the one that matters most on the screen. */
export function Stat({ value, label, tone = 'ink', lead }: { value: string; label: string; tone?: 'ink' | 'calm' | 'urgent' | 'accent'; lead?: boolean }) {
  return (
    <View style={{ gap: 2, flex: 1 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <T v={lead ? 'title' : 'h2'} tone={tone} style={{ fontVariant: ['tabular-nums'] }}>{value}</T>
      <T v="caption" tone="muted">{label}</T>
    </View>
  );
}

export const SOURCE_LABEL: Record<MemoryItem['source'], string> = {
  onboarding: 'Me lo contaste al empezar',
  chat: 'Lo dijiste en el chat',
  email: 'Lo vi en tu correo',
  whatsapp: 'Lo vi en WhatsApp',
  calendar: 'Lo vi en tu calendario',
};

export function shortDate(iso: string) {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

/** Cross-platform confirm (Alert does not render on web). */
export function confirmAction(title: string, message: string, ok: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: ok, style: 'destructive', onPress: onOk },
  ]);
}

/** "23:05" → minutes after 18:00, so 23:05 and 00:48 compare on one axis. */
export const bedMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return ((h + 24 - 18) % 24) * 60 + m;
};

export function durationLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Simple bars of hours per night. The last bar is accent; the goal is a dashed line. */
export function SleepBars({ data, goal, width }: { data: { label: string; hours: number }[]; goal?: number; width: number }) {
  const { p } = useTheme();
  const h = 160;
  const top = 24;
  const bottom = 24;
  const max = Math.max(8, ...data.map((d) => d.hours), goal ?? 0);
  const gap = 10;
  const bw = (width - gap * (data.length - 1)) / data.length;
  const y = (v: number) => top + (h - top - bottom) * (1 - v / max);
  const summary = data.map((d) => `${d.label} ${d.hours.toFixed(1).replace('.', ',')} horas`).join('; ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Horas dormidas por noche: ${summary}${goal ? `. Meta ${goal} horas` : ''}`}>
      <Svg width={width} height={h}>
        {goal ? <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={p.calm} strokeWidth={1.5} strokeDasharray="5 5" /> : null}
        {data.map((d, i) => {
          const x = i * (bw + gap);
          const last = i === data.length - 1;
          return (
            <Rect key={i} x={x} y={y(d.hours)} width={bw} height={h - bottom - y(d.hours)} rx={6}
              fill={last ? p.accent : p.accentSoft} stroke={last ? 'none' : p.accent} strokeOpacity={0.25} />
          );
        })}
        {data.map((d, i) =>
          i === 0 || i === data.length - 1 ? (
            <SvgText key={`v${i}`} x={i * (bw + gap) + bw / 2} y={y(d.hours) - 6} fontSize={12} fontFamily={font.semibold}
              fill={i === data.length - 1 ? p.ink : p.muted} textAnchor="middle">
              {d.hours.toFixed(1).replace('.', ',')}
            </SvgText>
          ) : null,
        )}
        {data.map((d, i) => (
          <SvgText key={`l${i}`} x={i * (bw + gap) + bw / 2} y={h - 6} fontSize={12} fontFamily={font.medium} fill={p.muted} textAnchor="middle">
            {d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export const st = StyleSheet.create({
  stages: { flexDirection: 'row' },
  stage: { flex: 1, alignItems: 'center', gap: space.xs + 2 },
  track: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  bar: { flex: 1, height: 2 },
  node: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: space.lg },
});
