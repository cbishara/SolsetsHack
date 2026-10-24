import { CheckCheck, Mic, Play, Reply } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Chip, T } from '../../components/ui';
import { dueLabel, timeOf } from '../../data/dates';
import { dumpToTasks } from '../../data/dump';
import { categoryById } from '../../data/select';
import { useStore } from '../../data/store';
import { dayInput, morningInput, tonightInput } from '../../features/digest/build';
import { whatsappPalette } from '../../features/digest/palettes';
import { daySummary, morningSummary, tonightQuestion, urgentAlert, voiceDump, type WaMessage } from '../../features/digest/whatsapp-copy';
import { useTheme } from '../../theme/theme';
import { font, space } from '../../theme/tokens';

type Scenario = 'manana' | 'dia' | 'pregunta' | 'alerta' | 'audio';
const SCENARIOS: { id: Scenario; label: string; note: string }[] = [
  { id: 'manana', label: 'Mañana', note: 'Llega a la hora que elegiste. Con los botones das feedback sin abrir la app.' },
  { id: 'dia', label: 'Fin del día', note: 'Lo que llegó, lo que terminaste y lo que queda. Respóndele con un audio para soltar lo que falte.' },
  { id: 'pregunta', label: 'Antes de dormir', note: 'Si elegiste que te pregunte, una respuesta define cómo te cuida esa noche.' },
  { id: 'alerta', label: 'Alerta', note: 'Acompaña a la alerta de la app. Si configuraste llamada, Sol llama si no respondes.' },
  { id: 'audio', label: 'Audio', note: 'Mandas un audio con pendientes y Sol te devuelve las tareas con fecha.' },
];

const DUMP = 'Mañana tengo que llamar a CertiSur por el certificado, comprar el regalo de Tomás esta semana y el lunes mandar el informe de tickets';

// The WhatsApp channel, shown in a faithful simulation of the chat. The copy
// lives in features/digest/whatsapp-copy.ts so server/ can send the same thing.
export default function WhatsAppPreview() {
  const { scheme } = useTheme();
  const w = whatsappPalette[scheme];
  const { state, sleep } = useStore();
  const [scenario, setScenario] = useState<Scenario>('manana');

  const messages = useMemo<WaMessage[]>(() => {
    if (scenario === 'manana') return morningSummary(morningInput(state, sleep));
    if (scenario === 'dia') return daySummary(dayInput(state));
    if (scenario === 'pregunta') return tonightQuestion(tonightInput(state));
    if (scenario === 'alerta') {
      const item = state.items.find((i) => i.outcome.kind === 'alerted') ?? state.items[0];
      return urgentAlert({
        time: timeOf(item.receivedAt), text: item.summary, who: item.direct ? item.from.name : `${item.from.name}, en ${item.channel}`,
        category: categoryById(state, item.categoryId)?.name ?? 'algo que no reconozco', callAfterMin: state.nightAlerts.call ? state.nightAlerts.callAfterMin : undefined,
      });
    }
    const { tasks } = dumpToTasks(DUMP, 'voice');
    return voiceDump({ at: '22:41', seconds: 14, tasks: tasks.map((t) => ({ title: t.title, due: (dueLabel(t) ?? 'sin fecha').toLowerCase() })) });
  }, [scenario, state, sleep]);

  const current = SCENARIOS.find((x) => x.id === scenario)!;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: w.bar }} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.md, gap: space.md }}>
        <Header close title="Así llega por WhatsApp" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.xs }}>
          {SCENARIOS.map((x) => <Chip key={x.id} label={x.label} selected={x.id === scenario} onPress={() => setScenario(x.id)} />)}
        </ScrollView>
        <T v="callout" style={{ color: w.barMuted }}>{current.note}</T>
      </View>

      <View style={[s.chatBar, { backgroundColor: w.bar, borderBottomColor: w.divider }]}>
        {/* Sol's WhatsApp profile photo: the avatar on black. */}
        <View style={[s.avatar, { backgroundColor: '#000000', overflow: 'hidden' }]}><SolOrb size={20} state="watching" /></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.chatName, { color: w.barInk }]}>Sol</Text>
          <Text style={[s.chatSub, { color: w.barMuted }]}>tu asistente · cuenta de empresa</Text>
        </View>
      </View>

      <ScrollView style={{ backgroundColor: w.wallpaper }} contentContainerStyle={s.thread} accessibilityLabel="Simulación del chat de WhatsApp con Sol">
        <View style={[s.datePill, { backgroundColor: w.pill }]}><Text style={[s.dateText, { color: w.pillInk }]}>HOY</Text></View>
        {messages.map((m, i) => <Bubble key={`${scenario}-${i}`} m={m} w={w} />)}
        <Text style={[s.sim, { color: w.meta }]}>Simulación con datos de ejemplo</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type WaColors = (typeof whatsappPalette)['day'];

/** Renders WhatsApp's *bold* markup. */
function Rich({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return (
    <Text style={[s.body, { color }]}>
      {parts.map((part, i) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2
          ? <Text key={i} style={{ fontFamily: font.bold }}>{part.slice(1, -1)}</Text>
          : <Text key={i}>{part}</Text>,
      )}
    </Text>
  );
}

function Bubble({ m, w }: { m: WaMessage; w: WaColors }) {
  const mine = m.from === 'user';
  const bg = mine ? w.outgoing : w.incoming;
  return (
    <View style={[s.wrap, mine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
      <View style={[s.bubble, { backgroundColor: bg }, mine ? s.tailRight : s.tailLeft, m.buttons && s.withButtons]}>
        {m.kind === 'audio' ? (
          <View style={s.audio} accessibilityLabel={`Nota de voz de ${m.body}`}>
            <Play size={22} color={w.meta} fill={w.meta} />
            <View style={s.wave}>
              {[6, 12, 18, 9, 16, 22, 11, 7, 15, 20, 10, 14, 8, 18, 12, 6, 13, 9].map((h, i) => (
                <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: w.meta, opacity: i < 6 ? 1 : 0.5 }} />
              ))}
            </View>
            <View style={[s.mic, { backgroundColor: '#1DAA61' }]}><Mic size={14} color="#FFFFFF" /></View>
          </View>
        ) : (
          <Rich text={m.body} color={w.ink} />
        )}
        {m.footer ? <Text style={[s.footer, { color: w.meta }]}>{m.footer}</Text> : null}
        <View style={s.metaRow}>
          <Text style={[s.time, { color: w.meta }]}>{m.kind === 'audio' ? `${m.body}  ${m.at}` : m.at}</Text>
          {mine ? <CheckCheck size={15} color={w.check} /> : null}
        </View>
      </View>
      {m.buttons ? (
        <View style={{ gap: 2 }}>
          {m.buttons.map((b) => (
            <View key={b.id} style={[s.waButton, { backgroundColor: w.button }]} accessibilityRole="button" accessibilityLabel={b.title}>
              <Reply size={16} color={w.buttonInk} />
              <Text style={[s.waButtonText, { color: w.buttonInk }]}>{b.title}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  chatBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm + 2, marginTop: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chatName: { fontFamily: font.semibold, fontSize: 17 },
  chatSub: { fontFamily: font.regular, fontSize: 13 },
  thread: { padding: space.md, gap: space.sm, paddingBottom: space.section },
  datePill: { alignSelf: 'center', paddingHorizontal: space.md, paddingVertical: 4, borderRadius: 8, marginVertical: space.xs },
  dateText: { fontFamily: font.medium, fontSize: 12, letterSpacing: 0.4 },
  wrap: { maxWidth: '86%', gap: 2 },
  bubble: { paddingHorizontal: space.md - 2, paddingTop: space.sm - 2, paddingBottom: 4, borderRadius: 10, gap: 4 },
  withButtons: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  tailLeft: { borderTopLeftRadius: 2 },
  tailRight: { borderTopRightRadius: 2 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 22 },
  footer: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  time: { fontFamily: font.regular, fontSize: 11 },
  waButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 44, borderRadius: 6 },
  waButtonText: { fontFamily: font.medium, fontSize: 15 },
  audio: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 230, paddingVertical: 4 },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  mic: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sim: { fontFamily: font.regular, fontSize: 12, textAlign: 'center', marginTop: space.lg },
});

