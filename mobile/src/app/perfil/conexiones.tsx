import { Calendar, CircleCheck, CircleAlert, CirclePause, Hash, Mail, MessageCircle, MessagesSquare, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { ServerCard } from '../../features/backend/server-card';
import { Badge, Button, Card, List, Screen, Section, T, tap, ToggleRow } from '../../components/ui';
import { useStore } from '../../data/store';
import type { Connection, ConnectionId } from '../../data/types';
import { ago } from '../../features/settings/format';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

const ICON: Record<ConnectionId, typeof Mail> = { whatsapp: MessageCircle, gmail: Mail, calendar: Calendar, outlook: Mail, slack: Hash };
const READS: Record<ConnectionId, string> = {
  whatsapp: 'Lee los chats que elijas. No responde por ti.',
  gmail: 'Lee correos nuevos para sacar tareas y urgencias. No envía nada.',
  calendar: 'Lee tus turnos y eventos para saber cuándo te toca guardia.',
  outlook: 'Lee correos nuevos.',
  slack: 'Leería los canales que elijas.',
};

// Connections: what Sol watches, and proof that it is watching.
export default function Conexiones() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const { connections, chats } = state;
  const ok = connections.filter((c) => c.status === 'connected');
  const whatsappOn = connections.find((c) => c.id === 'whatsapp')?.status === 'connected';

  return (
    <Screen edges={['top', 'bottom']} padBottom={false}>
      <Header title="Conexiones" />

      <Card tone={ok.length ? 'calmSoft' : 'surface'}>
        <View style={s.statusHead}>
          <ShieldCheck size={22} color={p.calm} strokeWidth={2.2} />
          <T v="h3" style={{ flex: 1 }}>{ok.length ? 'Todo conectado y al día' : 'Sol no está mirando nada'}</T>
        </View>
        <T v="callout" tone="muted">
          {ok.length
            ? `Sol revisa ${listOf(ok.map((c) => (c.id === 'whatsapp' ? c.name : c.name.toLowerCase())))} cada pocos minutos. Si una conexión se cae, te aviso antes de dormir.`
            : 'Conecta al menos una fuente para que Sol pueda ordenar tus cosas.'}
        </T>
      </Card>

      <ServerCard />

      <Section eyebrow="Fuentes">
        <View style={{ gap: space.md }}>
          {connections.map((c, i) => (
            <SourceCard key={c.id} c={c} minutesAgo={i + 1} onToggle={() => dispatch({ type: 'setConnection', id: c.id, patch: { status: c.status === 'connected' ? 'off' : 'connected' } })} />
          ))}
        </View>
        <T v="caption" tone="faint">En esta demo, conectar y desconectar es simulado.</T>
      </Section>

      {whatsappOn ? (
        <Section eyebrow="WhatsApp" title="Chats que Sol vigila">
          <T v="callout" tone="muted">Sol lee solo los chats que marques acá. Los demás no los abre. Nunca escribe en tu nombre.</T>
          <List>
            {chats.map((chat, i) => (
              <ToggleRow
                key={chat.id}
                title={chat.name}
                detail={chat.kind === 'grupo' ? 'Grupo' : 'Persona'}
                value={chat.on}
                onChange={() => dispatch({ type: 'toggleChat', id: chat.id })}
                last={i === chats.length - 1}
              />
            ))}
          </List>
          <View style={s.note}>
            <MessagesSquare size={16} color={p.muted} />
            <T v="caption" tone="muted" style={{ flex: 1 }}>{chats.filter((x) => x.on).length} chats vigilados. Puedes cambiarlo cuando quieras.</T>
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}

const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] ?? '');

// Demo data is static, so the last check is shown as recent: in the real app it comes from server/.
function SourceCard({ c, onToggle, minutesAgo }: { c: Connection; onToggle: () => void; minutesAgo: number }) {
  const { p } = useTheme();
  const Icon = ICON[c.id];
  const on = c.status === 'connected';
  const attention = c.status === 'needs_attention';
  const StatusIcon = on ? CircleCheck : attention ? CircleAlert : CirclePause;
  return (
    <View style={[s.source, { backgroundColor: p.card, borderColor: p.line }]}>
      <View style={s.sourceHead}>
        <View style={[s.icon, { backgroundColor: on ? p.accentSoft : p.surface }]}>
          <Icon size={20} color={on ? p.accent : p.muted} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{c.name}</T>
          <T v="callout" tone="muted" numberOfLines={1}>{c.detail}</T>
        </View>
        <Badge label={on ? 'Conectado' : attention ? 'Revisar' : 'Apagado'} tone={on ? 'calm' : attention ? 'urgent' : 'neutral'} />
      </View>
      <T v="callout">{READS[c.id]}</T>
      <View style={s.sourceFoot}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <StatusIcon size={15} color={on ? p.calm : p.muted} />
          <T v="caption" tone="muted">{on ? `Revisado ${ago(new Date(Date.now() - minutesAgo * 60000).toISOString())}` : 'Sol no lo está mirando'}</T>
        </View>
        {on ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Desconectar ${c.name}`} onPress={() => { tap(); onToggle(); }} hitSlop={10}
            style={({ pressed }) => [s.quiet, { opacity: pressed ? 0.5 : 1 }]}>
            <T v="calloutStrong" tone="muted">Desconectar</T>
          </Pressable>
        ) : (
          <Button label="Conectar" onPress={onToggle} style={s.smallBtn} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  source: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, padding: space.lg, gap: space.md },
  sourceHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sourceFoot: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  smallBtn: { minHeight: 44, paddingHorizontal: space.lg },
  quiet: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
