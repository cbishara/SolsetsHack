import { requestRecordingPermissionsAsync } from 'expo-audio';
import { router } from 'expo-router';
import { Bell, Check, FileText, Mic, MessageCircle, Moon, MoonStar, Phone, ShieldCheck, Sunrise, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SolOrb } from '../../components/sol-orb';
import { Button, Card, Chip, Field, Glass, IconTile, List, ListRow, T, tap, ToggleRow } from '../../components/ui';
import { WEEKDAYS_SHORT, cap } from '../../data/dates';
import { useStore } from '../../data/store';
import { askReminderPermission } from '../tasks/reminders';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';
import { StepShell } from './shell';
import { GOALS, type Draft, type StepNav } from './types';

const FROMS = ['22:00', '23:00', '00:00'];
const TOS = ['06:00', '07:00', '08:00'];

function Option({ on, icon: Icon, title, detail, onPress }: { on: boolean; icon: LucideIcon; title: string; detail: string; onPress: () => void }) {
  const { p } = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [ns.option, { backgroundColor: on ? `${p.sol}14` : p.card, borderColor: on ? p.sol : p.line }, pressed && { opacity: 0.85 }]}>
      <IconTile icon={Icon} color={on ? p.sol : p.muted} size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyStrong">{title}</T>
        <T v="callout" tone="muted">{detail}</T>
      </View>
      <View style={[ns.radio, { borderColor: on ? p.sol : p.line }]}>{on ? <View style={[ns.radioDot, { backgroundColor: p.sol }]} /> : null}</View>
    </Pressable>
  );
}

// 9. Night ------------------------------------------------------------------------

export function Night({ nav, draft }: { nav: StepNav; draft: Draft }) {
  const { state, dispatch } = useStore();
  const n = state.nightAlerts;
  const set = (patch: Partial<typeof n>) => dispatch({ type: 'setNightAlerts', patch });
  useEffect(() => {
    if (draft.goals.includes('guardia') && n.mode !== 'urgent') set({ mode: 'urgent' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const wakers = state.categories.filter((c) => c.status === 'active' && c.wakeAtNight).map((c) => c.name);
  return (
    <StepShell {...nav} title="¿Cómo te cuido de noche?" lead="Sol sigue leyendo lo que llega mientras duermes. Tú decides si puede despertarte." footer={<Button label="Continuar" onPress={nav.next} />}>
      <View style={{ gap: space.sm }}>
        <Option on={n.mode === 'urgent'} icon={MoonStar} title="Avísame solo si es urgente" detail={wakers.length ? `Por ${wakers.join(' o ')}. Lo demás espera al resumen.` : 'Por las categorías que marques. Lo demás espera al resumen.'} onPress={() => set({ mode: 'urgent' })} />
        <Option on={n.mode === 'quiet'} icon={Moon} title="No me interrumpas nunca" detail="Todo queda ordenado para la mañana." onPress={() => set({ mode: 'quiet' })} />
      </View>
      {n.mode === 'urgent' ? (
        <>
          <View style={{ gap: space.sm }}>
            <T v="h3">¿Qué noches?</T>
            <View style={ns.chips}>
              <Chip label="Todas" selected={n.when === 'always'} onPress={() => set({ when: 'always' })} />
              <Chip label="Ciertos días" selected={n.when === 'days'} onPress={() => set({ when: 'days' })} />
              <Chip label="Según mi calendario" selected={n.when === 'calendar'} onPress={() => set({ when: 'calendar' })} />
            </View>
            {n.when === 'days' ? (
              <View style={ns.chips}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => <Chip key={d} label={cap(WEEKDAYS_SHORT[d])} selected={n.days.includes(d)} onPress={() => set({ days: n.days.includes(d) ? n.days.filter((x) => x !== d) : [...n.days, d] })} />)}
              </View>
            ) : null}
            {n.when === 'calendar' ? (
              <View style={{ gap: space.sm }}>
                <Field value={n.keyword} onChangeText={(keyword) => set({ keyword })} placeholder="Palabra del evento: Guardia, Turno, De llamada" accessibilityLabel="Palabra que activa los avisos" />
                <T v="caption" tone="faint">{`Las noches con un evento que diga "${n.keyword || '…'}" en tu calendario, activo los avisos solo.`}</T>
              </View>
            ) : null}
            <T v="caption" tone="faint">Antes de dormir te pregunto si activo los avisos esa noche. Una respuesta y listo.</T>
          </View>
          <View style={{ gap: space.sm }}>
            <T v="h3">Horario</T>
            <View style={ns.chips}>{FROMS.map((t) => <Chip key={t} label={`Desde ${t}`} selected={n.from === t} onPress={() => set({ from: t })} />)}</View>
            <View style={ns.chips}>{TOS.map((t) => <Chip key={t} label={`Hasta ${t}`} selected={n.to === t} onPress={() => set({ to: t })} />)}</View>
          </View>
        </>
      ) : null}
    </StepShell>
  );
}

const ns = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, minHeight: 80 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});

// 10. Summaries --------------------------------------------------------------------

export function Summaries({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const sum = state.summaries;
  const wa = sum.morning.channels.includes('whatsapp');
  const setWa = (v: boolean) => dispatch({ type: 'setSummaries', patch: { morning: { ...sum.morning, channels: v ? ['app', 'whatsapp'] : ['app'] }, evening: { ...sum.evening, channels: v ? ['app', 'whatsapp'] : ['app'] } } });
  return (
    <StepShell {...nav} title="Dos resúmenes al día" lead="En la mañana, qué pasó de noche y qué tienes hoy. Al terminar el día, qué hiciste, qué queda y un momento para soltar lo que tengas en la cabeza." footer={<Button label="Continuar" onPress={nav.next} />}>
      <View style={{ gap: space.sm }}>
        <View style={sm.head}><Sunrise size={18} color={p.sol} /><T v="h3">En la mañana</T></View>
        <View style={ns.chips}>{['06:30', '07:00', '07:30', '08:00'].map((t) => <Chip key={t} label={t} selected={sum.morning.at === t} onPress={() => dispatch({ type: 'setSummaries', patch: { morning: { ...sum.morning, at: t, on: true } } })} />)}</View>
      </View>
      <View style={{ gap: space.sm }}>
        <View style={sm.head}><FileText size={18} color={categoryColors.indigo} /><T v="h3">Al terminar el día</T></View>
        <View style={ns.chips}>{['17:30', '18:30', '19:00', '20:00'].map((t) => <Chip key={t} label={t} selected={sum.evening.at === t} onPress={() => dispatch({ type: 'setSummaries', patch: { evening: { ...sum.evening, at: t, on: true } } })} />)}</View>
      </View>
      <List>
        <ToggleRow icon={MessageCircle} iconColor="#25D366" title="También por WhatsApp" detail="Te llegan al chat con Sol y le respondes ahí mismo, con texto o audio." value={wa} onChange={setWa} last />
      </List>
    </StepShell>
  );
}

const sm = StyleSheet.create({ head: { flexDirection: 'row', alignItems: 'center', gap: space.sm } });

// 11. The Sol button -----------------------------------------------------------------

/** Practice the one gesture that matters: tap to write, hold to talk. */
export function SolButton({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const [tapped, setTapped] = useState(false);
  const [held, setHeld] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const Step = ({ done, n, title, detail }: { done: boolean; n: number; title: string; detail: string }) => (
    <View style={sb.step}>
      <View style={[sb.check, { backgroundColor: done ? p.calm : p.surface }]}>{done ? <Check size={14} color={p.bg} strokeWidth={3} /> : <T v="captionStrong">{n}</T>}</View>
      <View style={{ flex: 1 }}>
        <T v="bodyStrong">{title}</T>
        <T v="callout" tone="muted">{detail}</T>
      </View>
    </View>
  );
  return (
    <StepShell {...nav} onSkip={nav.next} title="Sol está siempre a un toque" lead="Abajo a la derecha, en todas las pantallas. Pruébalo aquí:"
      footer={<Button label={tapped && held ? 'Continuar' : 'Seguir sin probar'} kind={tapped && held ? 'primary' : 'secondary'} onPress={nav.next} />}>
      <View style={sb.steps}>
        <Step done={tapped} n={1} title="Toca para escribirle o preguntarle" detail={'"¿Qué tengo mañana?", "Resume lo de hoy".'} />
        <Step done={held} n={2} title="Mantén presionado para hablarle" detail={'"Mañana llamar al dentista y el viernes pagar la luz". Lo anota con fecha.'} />
      </View>

      <Glass style={sb.stage}>
        {holding ? (
          <Animated.View entering={FadeIn.duration(150)} style={sb.bubble}><Mic size={15} color={p.sol} /><T v="callout">Te escucho… suelta para enviar</T></Animated.View>
        ) : held ? (
          <Animated.View entering={FadeIn.duration(150)} style={sb.bubble}><T v="callout">Eso es. Así le dictas lo que tengas pendiente.</T></Animated.View>
        ) : tapped ? (
          <Animated.View entering={FadeIn.duration(150)} style={sb.bubble}><T v="callout">Así se abre el chat. Ahora mantenlo presionado.</T></Animated.View>
        ) : (
          <T v="callout" tone="muted" style={{ textAlign: 'center' }}>Prueba con este botón</T>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Botón de Sol de práctica"
          accessibilityHint="Toca, y después mantén presionado"
          onPressIn={() => { timer.current = setTimeout(() => { tap('success'); holdingRef.current = true; setHolding(true); }, 300); }}
          onPressOut={() => {
            if (timer.current) clearTimeout(timer.current);
            if (holdingRef.current) { holdingRef.current = false; setHolding(false); setHeld(true); }
            else { tap('light'); setTapped(true); }
          }}
          style={[sb.fab, { borderColor: holding ? p.sol : p.glassLine, backgroundColor: p.surface, transform: [{ scale: holding ? 1.08 : 1 }] }]}
        >
          <SolOrb size={32} state={holding ? 'waking' : 'watching'} />
        </Pressable>
      </Glass>
    </StepShell>
  );
}

const sb = StyleSheet.create({
  steps: { gap: space.lg },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stage: { borderRadius: radius.xl, padding: space.xl, alignItems: 'center', gap: space.xl, minHeight: 220, justifyContent: 'center' },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fab: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

// 12. Permissions ---------------------------------------------------------------------

export function Permissions({ nav, draft, setDraft }: { nav: StepNav; draft: Draft; setDraft: (d: Draft) => void }) {
  const { state } = useStore();
  const wakes = state.nightAlerts.mode === 'urgent';
  const [mic, setMic] = useState(false);
  const ask = async (key: 'notifications' | 'mic') => {
    if (key === 'notifications') {
      const ok = Platform.OS === 'web' ? true : await askReminderPermission();
      setDraft({ ...draft, permissions: { ...draft.permissions, notifications: ok } });
    } else {
      const ok = (await requestRecordingPermissionsAsync().catch(() => ({ granted: false }))).granted;
      setMic(ok);
    }
    tap('success');
  };
  return (
    <StepShell {...nav} onSkip={nav.next} title={wakes ? 'Para avisarte, necesito tu permiso' : 'Dos permisos, y para qué sirven'} lead="Te explico cada uno. Si dices que no, Sol igual funciona, con menos alcance."
      footer={<Button label="Continuar" kind={draft.permissions.notifications ? 'primary' : 'secondary'} onPress={nav.next} />}>
      <View style={{ gap: space.md }}>
        <PermissionCard icon={Bell} title="Notificaciones" on={draft.permissions.notifications} onAllow={() => void ask('notifications')}
          why={wakes ? 'Para avisarte de algo urgente, tus recordatorios y los resúmenes. Nada de publicidad.' : 'Para tus recordatorios y los resúmenes. Nada de publicidad.'} />
        <PermissionCard icon={Mic} title="Micrófono" on={mic} onAllow={() => void ask('mic')} why="Para que le hables a Sol. Solo graba mientras lo usas." />
        {wakes ? (
          <Card>
            <View style={ps.head}><IconTile icon={Phone} color={categoryColors.green} size={40} /><T v="bodyStrong" style={{ flex: 1 }}>Llamada de respaldo</T></View>
            <T v="callout" tone="muted">Si algo es urgente y no lo ves, Sol te llama desde su número. Guárdalo como contacto favorito para que pase el No molestar.</T>
          </Card>
        ) : null}
      </View>
    </StepShell>
  );
}

function PermissionCard({ icon, title, why, on, onAllow }: { icon: LucideIcon; title: string; why: string; on: boolean; onAllow: () => void }) {
  const { p } = useTheme();
  return (
    <Card tone={on ? 'calmSoft' : 'card'}>
      <View style={ps.head}>
        <IconTile icon={icon} color={on ? p.calm : p.sol} size={40} />
        <T v="bodyStrong" style={{ flex: 1 }}>{title}</T>
        {on ? <Check size={22} color={p.calm} strokeWidth={2.8} accessibilityLabel="Permitido" /> : null}
      </View>
      <T v="callout" tone="muted">{why}</T>
      {on ? <T v="caption" tone="calm">Permitido.</T> : <Button kind="secondary" label={`Permitir ${title.toLowerCase()}`} onPress={onAllow} />}
    </Card>
  );
}

const ps = StyleSheet.create({ head: { flexDirection: 'row', alignItems: 'center', gap: space.md } });

// 13. Trial ------------------------------------------------------------------------------

export function Pilot({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { state } = useStore();
  const days = state.profile.pilot.days;
  return (
    <StepShell {...nav} title="Primero me gano tu confianza" lead={`Los primeros ${days} días no silencio nada. Te muestro qué habría hecho y tú me corriges con un toque.`} footer={<Button label="Entendido" onPress={nav.next} />}>
      <Glass style={pl.card}>
        <View style={pl.days} accessibilityLabel={`${days} días de prueba`}>
          {Array.from({ length: days }, (_, i) => <View key={i} style={[pl.day, { backgroundColor: i === 0 ? p.sol : p.surface }]} />)}
        </View>
        <View style={pl.legend}>
          <T v="captionStrong" tone="sol">Hoy</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><ShieldCheck size={14} color={p.calm} /><T v="captionStrong" tone="calm">Modo real</T></View>
        </View>
      </Glass>
      <View style={{ gap: space.md }}>
        {[
          ['Te sigue llegando todo', 'Nada se silencia. Ves en la bandeja lo que habría hecho con cada cosa.'],
          ['Cada mañana, un toque', '"Bien", "Debió avisarme" o "No era para avisar". Con eso aprendo.'],
          ['Cuando confíes, pasas al modo real', 'Te muestro los números: cuánto coincido contigo y si se me pasó algo urgente.'],
        ].map(([t, d], i) => (
          <View key={t} style={pl.point}>
            <View style={[pl.num, { backgroundColor: p.surface }]}><T v="calloutStrong" tone="sol">{i + 1}</T></View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="bodyStrong">{t}</T>
              <T v="callout" tone="muted">{d}</T>
            </View>
          </View>
        ))}
      </View>
    </StepShell>
  );
}

const pl = StyleSheet.create({
  card: { padding: space.xl, gap: space.md, borderRadius: radius.xl },
  days: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

// 14. Ready -------------------------------------------------------------------------------

export function Done({ nav, draft }: { nav: StepNav; draft: Draft }) {
  const { state, dispatch } = useStore();
  const connected = state.connections.filter((c) => c.status === 'connected').map((c) => c.name);
  const chats = state.chats.filter((c) => c.on).length;
  const goals = GOALS.filter((g) => draft.goals.includes(g.id)).map((g) => g.title);
  const n = state.nightAlerts;
  const wakers = state.categories.filter((c) => c.status === 'active' && c.wakeAtNight).map((c) => c.name);
  const finish = () => {
    dispatch({ type: 'setProfile', patch: { goals: draft.goals.length ? draft.goals : state.profile.goals, agentMode: 'shadow', pilot: { ...state.profile.pilot, startedAt: new Date().toISOString() } } });
    dispatch({ type: 'finishOnboarding' });
    tap('success');
    router.replace('/');
  };
  return (
    <StepShell {...nav} title="Listo. Desde ahora yo me acuerdo." footer={<Button kind="primary" label="Ir a mi inicio" onPress={finish} />}>
      <Glass style={dn.card}>
        <View style={{ alignItems: 'center' }}><SolOrb size={64} state="calm" /></View>
        <T v="h3" style={{ textAlign: 'center' }}>
          {n.mode === 'urgent'
            ? `De noche, de ${n.from} a ${n.to}, solo te aviso por ${wakers.join(' o ') || 'lo urgente'}.`
            : 'De noche no te interrumpo: todo queda para la mañana.'}
        </T>
        <T v="callout" tone="muted" style={{ textAlign: 'center' }}>{`Resumen de la mañana a las ${state.summaries.morning.at} y del día a las ${state.summaries.evening.at}${state.summaries.morning.channels.includes('whatsapp') ? ', también por WhatsApp' : ''}.`}</T>
      </Glass>
      <List>
        <ListRow title="Lo que quieres lograr" detail={goals.join(' · ') || 'Sin elegir'} />
        <ListRow title="Fuentes conectadas" detail={connected.join(', ') || 'Ninguna'} value={String(connected.length)} />
        <ListRow title="Chats que lee Sol" value={String(chats)} />
        <ListRow title="Categorías" value={String(state.categories.filter((c) => c.status === 'active').length)} last />
      </List>
      <T v="caption" tone="faint" style={{ textAlign: 'center' }}>Todo se puede cambiar en tu perfil, arriba a la derecha.</T>
    </StepShell>
  );
}

const dn = StyleSheet.create({ card: { padding: space.xl, gap: space.md, borderRadius: radius.xl } });
