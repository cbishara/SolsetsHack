import { CalendarClock, Check, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, SourceTag, T } from '../../components/ui';
import { useStore } from '../../data/store';
import type { FeedbackValue, Handled } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';
import { dueText, hhmm } from './format';

const WHY_WAKE = ['Era un sistema crítico', 'Es fin de mes', 'Lo pidió mi jefa', 'Otro motivo'];
const WHY_WAIT = ['Podía esperar', 'Ya lo veía otra persona', 'No es mi área', 'Otro motivo'];

/**
 * One decision the agent made overnight, with one-tap feedback. A "wrong"
 * tap opens an optional why; picking a reason becomes a named rule
 * (onboarding ADR: check or X, optional reason).
 */
export function DecisionCard({ item }: { item: Handled }) {
  const { p } = useTheme();
  const { state, rate, dispatch } = useStore();
  const [askWhy, setAskWhy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const woke = item.wouldWake;
  const value = state.feedback[item.id];
  const wrong: FeedbackValue = woke ? 'should_not_have_woken' : 'should_have_woken';
  const task = item.taskId ? state.tasks.find((t) => t.id === item.taskId) : undefined;

  const mark = (v: FeedbackValue) => {
    rate(item.id, v);
    setSaved(null);
    setAskWhy(v !== 'right');
  };

  const pick = (reason: string) => {
    if (reason !== 'Otro motivo') {
      dispatch({
        type: 'addRule',
        rule: {
          id: `fb-${item.id}-${Date.now()}`,
          text: woke ? `"${item.text}" puede esperar (${reason.toLowerCase()})` : `Despertarme si: "${item.text}" (${reason.toLowerCase()})`,
          kind: woke ? 'wait' : 'wake',
          origin: 'feedback',
          confirmed: true,
          examples: 1,
        },
      });
    }
    setSaved(reason);
    setAskWhy(false);
  };

  return (
    <Card tone={woke ? 'urgentSoft' : 'card'} style={{ gap: space.sm }}>
      <View style={s.meta}>
        {woke ? (
          <View style={s.inline}>
            <TriangleAlert size={15} color={p.urgent} strokeWidth={2.4} />
            <T v="calloutStrong" tone="urgent">Urgente</T>
          </View>
        ) : null}
        <T v="caption" tone="muted">
          {hhmm(item.at)}{woke && item.seenAt ? `, lo viste a las ${hhmm(item.seenAt)}` : ''}
        </T>
        <View style={{ flex: 1 }} />
        <SourceTag source={item.source} label={item.group ?? item.from} />
      </View>

      <T v="bodyStrong">{item.text}</T>
      <T v="callout" tone="muted">{item.reason}</T>

      {task ? (
        <View style={s.inline}>
          <CalendarClock size={14} color={p.accent} />
          <T v="caption" tone="accent">Quedó como tarea para {dueText(task.due.label)}</T>
        </View>
      ) : null}

      <View style={s.actions} accessibilityLabel="¿Acerté?">
        <Chip label="Bien" icon={Check} tone="calm" selected={value === 'right'} onPress={() => mark('right')} />
        <Chip label={woke ? 'No debió despertarme' : 'Debió despertarme'} tone="urgent" selected={value === wrong} onPress={() => mark(wrong)} />
      </View>

      {askWhy ? (
        <View style={[s.why, { borderTopColor: p.line }]}>
          <T v="bodyStrong">{woke ? 'Entonces esto podía esperar.' : 'Entonces esto debió despertarte.'}</T>
          <T v="callout" tone="muted">¿Por qué? Es opcional, pero me ayuda a aprender.</T>
          <View style={s.actions}>
            {(woke ? WHY_WAIT : WHY_WAKE).map((r) => <Chip key={r} label={r} onPress={() => pick(r)} />)}
            <Chip label="Saltar" onPress={() => { setAskWhy(false); setSaved(''); }} />
          </View>
        </View>
      ) : null}
      {saved ? <T v="callout" tone="calm">Lo anoté como regla nueva. La vas a ver antes de dormir.</T> : null}
      {saved === '' ? <T v="callout" tone="muted">Listo, igual me sirve como ejemplo.</T> : null}
      {value === 'right' ? <T v="caption" tone="calm">Gracias, sigo así.</T> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  why: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, marginTop: space.xs, gap: space.xs },
});
