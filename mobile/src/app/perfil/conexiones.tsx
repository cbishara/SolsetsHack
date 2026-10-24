import { router } from 'expo-router';
import { Calendar, CircleAlert, Hash, Mail, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { Badge, Button, Glass, IconTile, List, ListRow, Screen, Section, T, tap, ToggleRow } from '../../components/ui';
import { relative } from '../../data/dates';
import { useStore } from '../../data/store';
import type { Connection, ConnectionId } from '../../data/types';
import { confirm } from '../../features/settings/confirm';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

const LOOK: Record<ConnectionId, { icon: typeof Mail; color: string; reads: string }> = {
  whatsapp: { icon: MessageCircle, color: '#25D366', reads: 'Solo los chats que elijas. No responde por ti.' },
  gmail: { icon: Mail, color: categoryColors.red, reads: 'Correos nuevos, para sacar tareas, plazos y urgencias. No envía nada ni borra.' },
  calendar: { icon: Calendar, color: categoryColors.blue, reads: 'Tus eventos y turnos. Puede agregar lo que saque de un correo o mensaje.' },
  outlook: { icon: Mail, color: categoryColors.blue, reads: 'Correos y calendario de Microsoft 365.' },
  slack: { icon: Hash, color: categoryColors.pink, reads: 'Los canales y mensajes directos que elijas.' },
};

/** Where responsibilities arrive, whether Sol is reading each one, and what it reads. */
export default function Conexiones() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const on = state.connections.filter((c) => c.status === 'connected');
  const attention = state.connections.filter((c) => c.status === 'needs_attention');
  const set = (id: ConnectionId, patch: Partial<Connection>) => dispatch({ type: 'setConnection', id, patch });

  const toggle = (c: Connection) => {
    if (c.id === 'whatsapp') return router.push('/perfil/whatsapp');
    if (c.status === 'connected') {
      confirm(`Desconectar ${c.name}`, 'Sol deja de leer esta fuente. Lo que ya ordenó se mantiene.', () => set(c.id, { status: 'off' }), 'Desconectar');
    } else {
      tap('success');
      set(c.id, { status: 'connected', lastCheck: new Date().toISOString(), detail: c.detail === 'No conectado' ? 'Conectado' : c.detail });
    }
  };

  return (
    <Screen padBottom={false}>
      <Header title="Conexiones" />

      <Glass style={s.status}>
        <View style={s.head}>
          <IconTile icon={attention.length ? CircleAlert : ShieldCheck} color={attention.length ? p.urgent : p.calm} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3">{attention.length ? `${attention.length} ${attention.length === 1 ? 'conexión necesita' : 'conexiones necesitan'} atención` : on.length ? 'Todo conectado y al día' : 'Sol no está leyendo nada'}</T>
            <T v="callout" tone="muted">{on.length ? `Reviso ${on.map((c) => c.name).join(', ')} cada pocos minutos. Si una se cae, te aviso antes de que empiece la noche.` : 'Conecta al menos una fuente para que Sol pueda ordenar tus cosas.'}</T>
          </View>
        </View>
      </Glass>

      {state.connections.map((c) => {
        const look = LOOK[c.id];
        const ok = c.status === 'connected';
        return (
          <View key={c.id} style={[s.card, { backgroundColor: p.card, borderColor: c.status === 'needs_attention' ? p.urgent : p.line }]}>
            <View style={s.head}>
              <IconTile icon={look.icon} color={look.color} size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{c.name}</T>
                <T v="caption" tone="muted" numberOfLines={1}>{ok ? `${c.account ?? c.detail} · revisado ${relative(c.lastCheck ?? new Date().toISOString())}` : c.status === 'needs_attention' ? c.detail : 'Sin conectar'}</T>
              </View>
              {ok ? <Badge label="Al día" tone="calm" /> : c.status === 'needs_attention' ? <Badge label="Revisar" tone="urgent" /> : null}
            </View>
            <T v="callout" tone="muted">{look.reads}</T>
            {c.id === 'whatsapp' ? (
              <Button small kind="secondary" label={ok ? 'Administrar' : 'Conectar'} onPress={() => router.push('/perfil/whatsapp')} />
            ) : (
              <Button small kind={ok ? 'ghost' : 'secondary'} label={ok ? 'Desconectar' : c.status === 'needs_attention' ? 'Volver a conectar' : 'Conectar'} onPress={() => toggle(c)} style={{ alignSelf: 'flex-start' }} />
            )}
          </View>
        );
      })}

      {state.connections.find((c) => c.id === 'calendar')?.status === 'connected' ? (
        <Section title="Calendarios">
          <List>
            {state.calendars.map((cal, i) => (
              <ToggleRow key={cal.id} title={cal.name} detail={cal.account} value={cal.visible} onChange={() => dispatch({ type: 'toggleCalendar', id: cal.id })} last={i === state.calendars.length - 1} />
            ))}
          </List>
        </Section>
      ) : null}

      <List>
        <ListRow title="Servidor y datos de la app" detail="Para el equipo y la demostración" onPress={() => router.push('/perfil/servidor')} last />
      </List>
      <T v="caption" tone="faint">Conectar Gmail, Calendar u Outlook en esta versión es una demostración. WhatsApp se conecta de verdad con el servidor en vivo.</T>
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  status: { padding: space.xl, borderRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  card: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, padding: space.lg, gap: space.md },
});
