import { router } from 'expo-router';
import {
  BedDouble, Brain, FileText, GraduationCap, Link2, ListFilter, MessageCircle, MoonStar, RotateCcw, Server, Sparkles, Tags,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useBackend } from '../../api/backend';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Avatar, Badge, Glass, List, ListRow, Progress, Screen, Section, Segmented, T, tap } from '../../components/ui';
import { activeCategories, tonight } from '../../data/select';
import { useStore } from '../../data/store';
import { confirm } from '../../features/settings/confirm';
import { categoryColors, radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/theme';

/**
 * Perfil y ajustes, opened from the avatar on every tab. Everything about how
 * Sol works for this person, in the order people look for it.
 */
export default function Perfil() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const backend = useBackend();
  const { profile, connections } = state;
  const day = Math.min(profile.pilot.days, Math.max(1, Math.ceil((Date.now() - new Date(profile.pilot.startedAt).getTime()) / 86_400_000)));
  const active = profile.agentMode === 'active';
  const open = state.questions.filter((q) => !q.answer).length;
  const suggested = state.categories.filter((c) => c.status === 'suggested').length;
  const wa = connections.find((c) => c.id === 'whatsapp');
  const others = connections.filter((c) => c.id !== 'whatsapp' && c.status !== 'off').map((c) => c.name);
  const t = tonight(state);
  const sum = state.summaries;
  const live = backend.status === 'connected';

  return (
    <Screen padBottom={false} glow="sol">
      <Header close />

      <View style={s.head}>
        <Avatar name={profile.fullName ?? profile.name} size={72} ring />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <T v="h2">{profile.fullName ?? profile.name}</T>
          {profile.role ? <T v="callout" tone="muted">{profile.role}</T> : null}
        </View>
      </View>

      <Glass style={s.pilot}>
        <View style={s.pilotHead}>
          <SolOrb size={18} state={active ? 'watching' : 'shadow'} style={{ margin: -8 }} />
          <T v="bodyStrong" style={{ flex: 1 }}>{active ? 'Sol trabaja en modo real' : `Modo prueba · día ${day} de ${profile.pilot.days}`}</T>
          <Badge label={active ? 'Activo' : 'Prueba'} tone={active ? 'calm' : 'sol'} />
        </View>
        {!active ? (
          <>
            <Progress value={day / profile.pilot.days} tone="sol" height={5} />
            <T v="caption" tone="muted">En prueba no silencio nada: te muestro qué habría hecho. Cuando confíes, pasas al modo real.</T>
          </>
        ) : null}
      </Glass>

      <Section title="Sol">
        <List>
          <ListRow icon={Brain} iconColor={categoryColors.pink} title="Lo que sabe de ti" value={`${state.memory.length + state.people.length}`} onPress={() => router.push('/perfil/memoria')} />
          <ListRow icon={Tags} iconColor={categoryColors.orange} title="Categorías" value={`${activeCategories(state).length}`}
            right={suggested ? <Badge label={`${suggested} nueva`} tone="sol" /> : undefined} onPress={() => router.push('/categorias')} />
          <ListRow icon={GraduationCap} iconColor={categoryColors.green} title="Aprendizaje" detail="Cómo va el piloto y qué aprendió"
            right={open ? <Badge label={`${open} ${open === 1 ? 'pregunta' : 'preguntas'}`} tone="sol" /> : undefined} onPress={() => router.push('/perfil/entrenamiento')} />
          <ListRow icon={ListFilter} iconColor={categoryColors.indigo} title="Reglas" value={`${state.rules.length}`} onPress={() => router.push('/perfil/reglas')} last />
        </List>
      </Section>

      <Section title="Tu rutina">
        <List>
          <ListRow icon={FileText} iconColor={p.sol} title="Resúmenes"
            detail={`${sum.morning.on ? `Mañana ${sum.morning.at}` : 'Sin resumen de mañana'} · ${sum.evening.on ? `Fin del día ${sum.evening.at}` : 'sin resumen del día'}`}
            onPress={() => router.push('/perfil/resumenes')} />
          <ListRow icon={MoonStar} iconColor={categoryColors.indigo} title="Noche y avisos" detail={t.on ? `Activos esta noche, ${t.from} a ${t.to}` : t.because}
            onPress={() => router.push('/perfil/noche')} />
          <ListRow icon={BedDouble} iconColor={categoryColors.teal} title="Sueño" detail="Estimado, sin registrar nada" onPress={() => router.push('/perfil/sueno')} last />
        </List>
      </Section>

      <Section title="Conexiones">
        <List>
          <ListRow icon={MessageCircle} iconColor={categoryColors.green} title="WhatsApp"
            detail={wa?.status === 'connected' ? `${state.chats.filter((c) => c.on).length} chats vigilados` : 'Sin conectar'}
            right={wa?.status === 'needs_attention' ? <Badge label="Revisar" tone="urgent" /> : undefined} onPress={() => router.push('/perfil/whatsapp')} />
          <ListRow icon={Link2} iconColor={categoryColors.blue} title="Correo y calendario" detail={others.length ? others.join(', ') : 'Sin conectar'} onPress={() => router.push('/perfil/conexiones')} last />
        </List>
      </Section>

      <Section title="Datos de la app">
        <Segmented options={[{ id: 'example', label: 'Ejemplo' }, { id: 'server', label: 'Servidor en vivo' }]} value={state.dataSource}
          onChange={(source) => { dispatch({ type: 'setDataSource', source }); if (source === 'server') void backend.refresh(); }} />
        <T v="caption" tone="muted">
          {state.dataSource === 'server'
            ? live ? 'La bandeja y sus tareas vienen de lo que clasificó el servidor.' : 'El servidor no responde: la bandeja queda como estaba hasta que vuelva.'
            : 'Ves los datos de ejemplo de una persona inventada. El chat, tus respuestas y los avisos de la noche igual se sincronizan con el servidor.'}
        </T>
        <List>
          <ListRow icon={Server} iconColor={live ? p.calm : p.muted} title="Servidor" detail={live ? 'Conectado' : backend.status === 'connecting' ? 'Conectando…' : 'Sin conexión'}
            onPress={() => router.push('/perfil/servidor')} />
          <ListRow icon={Sparkles} iconColor={p.sol} title="Ver la bienvenida otra vez"
            onPress={() => confirm('Ver la bienvenida otra vez', 'Vuelves al inicio como alguien nuevo, con los datos de ejemplo.', () => {
              dispatch({ type: 'reset', onboarded: false });
              router.replace('/onboarding');
            })} />
          <ListRow icon={RotateCcw} iconTone="muted" title="Reiniciar datos de ejemplo" last
            onPress={() => confirm('Reiniciar datos de ejemplo', 'Se borran tus cambios en esta demo.', () => { tap('success'); dispatch({ type: 'reset', onboarded: true }); }, 'Reiniciar')} />
        </List>
      </Section>

      <T v="caption" tone="faint" style={{ textAlign: 'center', marginBottom: space.xxxl }}>Soltra 0.1 · Todos los datos son sintéticos. Ninguna persona ni mensaje es real.</T>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { alignItems: 'center', gap: space.md, marginTop: -space.lg },
  pilot: { padding: space.lg, gap: space.md, borderRadius: radius.lg },
  pilotHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
