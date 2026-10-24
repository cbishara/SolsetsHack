import { router } from 'expo-router';
import { Bell, BellRing, Check, ClipboardCheck, Moon, Phone, ShieldCheck, Sun, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Hero } from '../../components/brand';
import { Button, Card, Chip, List, ListRow, T, tap, ToggleRow } from '../../components/ui';
import { useStore } from '../../data/store';
import type { NightStyle } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';
import { StepShell } from './shell';
import { GOALS, type Draft, type StepNav } from './types';

// 9. The night ----------------------------------------------------------------

const STYLES: { id: NightStyle; title: string; detail: string; icon: LucideIcon }[] = [
  { id: 'wake_if_urgent', title: 'Despiértame solo si es urgente', detail: 'Vigilo por ti. Lo que puede esperar queda para la mañana.', icon: BellRing },
  { id: 'summary_only', title: 'No me despiertes, déjame todo ordenado', detail: 'Antes de dormir te muestro lo pendiente y cómo se aborda mañana.', icon: ClipboardCheck },
];

const STARTS = ['21:30', '22:00', '22:30', '23:00'];
const ENDS = ['06:00', '06:30', '07:00', '07:30'];
const MORNINGS = ['06:30', '07:00', '07:30', '08:00'];

export function Night({ nav, draft }: { nav: StepNav; draft: Draft }) {
  const { p, night, setNight } = useTheme();
  const { state, dispatch } = useStore();
  const [style, setStyle] = useState<NightStyle>(draft.goals.includes('guardia') ? 'wake_if_urgent' : state.profile.nightStyle);
  const { morningAt, whatsappDigest } = state.profile;

  const save = () => {
    dispatch({ type: 'setProfile', patch: { nightStyle: style } });
    nav.next();
  };

  return (
    <StepShell
      {...nav}
      eyebrow="Tu noche"
      title="¿Cómo quieres que te cuide de noche?"
      lead="Cada persona descansa distinto. Esto lo puedes cambiar cualquier día."
      footer={<Button label="Continuar" onPress={save} />}
    >
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {STYLES.map(({ id, title, detail, icon: Icon }) => {
          const on = style === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${title}. ${detail}`}
              onPress={() => { tap(); setStyle(id); }}
              style={({ pressed }) => [ns.option, { backgroundColor: on ? p.accentSoft : p.card, borderColor: on ? p.accent : p.line }, pressed && { opacity: 0.85 }]}
            >
              <View style={[ns.icon, { backgroundColor: on ? p.accent : p.surface }]}><Icon size={20} color={on ? p.onAccent : p.muted} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{title}</T>
                <T v="callout" tone="muted">{detail}</T>
              </View>
              <View style={[ns.radio, { borderColor: on ? p.accent : p.line }]}>{on ? <View style={[ns.radioDot, { backgroundColor: p.accent }]} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      <TimePicker
        icon={Moon}
        title="Modo noche desde"
        detail="La app se oscurece y empiezo a cuidar tu descanso."
        options={STARTS}
        value={night.start}
        onChange={(start) => setNight({ ...night, scheduled: true, start, manual: null })}
      />
      <TimePicker
        icon={Sun}
        title="Hasta"
        options={ENDS}
        value={night.end}
        onChange={(end) => setNight({ ...night, scheduled: true, end, manual: null })}
      />
      <TimePicker
        icon={Bell}
        title="Resumen de la mañana a las"
        detail="Lo que pasó de noche y lo importante del día."
        options={MORNINGS}
        value={morningAt}
        onChange={(m) => dispatch({ type: 'setProfile', patch: { morningAt: m } })}
      />
      <List>
        <ToggleRow
          title="También por WhatsApp"
          detail="Te mando los resúmenes al chat, sin abrir la app."
          value={whatsappDigest}
          onChange={(v) => dispatch({ type: 'setProfile', patch: { whatsappDigest: v } })}
          last
        />
      </List>
    </StepShell>
  );
}

function TimePicker({ icon: Icon, title, detail, options, value, onChange }: {
  icon: LucideIcon; title: string; detail?: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const { p } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={ns.pickerHead}>
        <Icon size={18} color={p.accent} />
        <T v="bodyStrong">{title}</T>
      </View>
      {detail ? <T v="callout" tone="muted">{detail}</T> : null}
      <View style={ns.chips}>
        {options.map((o) => <Chip key={o} label={o} selected={o === value} onPress={() => onChange(o)} />)}
      </View>
    </View>
  );
}

const ns = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1.5, minHeight: 80 },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});

// 10. Permissions ---------------------------------------------------------------

export function Permissions({ nav, draft, setDraft }: { nav: StepNav; draft: Draft; setDraft: (d: Draft) => void }) {
  const { state } = useStore();
  const wakes = state.profile.nightStyle === 'wake_if_urgent';
  const items: { key: 'notifications' | 'call'; icon: LucideIcon; title: string; why: string }[] = [
    {
      key: 'notifications', icon: Bell, title: 'Notificaciones',
      why: wakes
        ? 'Para avisarte cuando algo es urgente y para el resumen de la mañana. Nada de publicidad.'
        : 'Solo para el resumen de la noche y el de la mañana. Nada de publicidad.',
    },
    ...(wakes
      ? [{ key: 'call' as const, icon: Phone, title: 'Llamada de respaldo', why: 'Si algo es urgente y no tocas "Lo vi" en 3 minutos, te llamo. Una llamada pasa el modo No molestar; una notificación a veces no.' }]
      : []),
  ];
  const allOn = items.every((i) => draft.permissions[i.key]);
  return (
    <StepShell
      {...nav}
      onSkip={nav.next}
      eyebrow="Antes de pedirte permiso"
      title={wakes ? 'Para despertarte, necesito poder avisarte' : 'Para tus resúmenes, necesito avisarte'}
      lead="Te explico para qué es cada uno. Si dices que no, igual funciona, pero con menos alcance."
      footer={<Button label={allOn ? 'Continuar' : 'Seguir sin activar todo'} kind={allOn ? 'primary' : 'secondary'} onPress={nav.next} />}
    >
      <View style={{ gap: space.md }}>
        {items.map(({ key, icon: Icon, title, why }) => {
          const on = draft.permissions[key];
          return <PermissionCard key={key} icon={Icon} title={title} why={why} on={on} onAllow={() => setDraft({ ...draft, permissions: { ...draft.permissions, [key]: true } })} />;
        })}
      </View>
      <T v="caption" tone="muted">En Expo Go el permiso es simulado. En la app instalada se usa el aviso del sistema.</T>
    </StepShell>
  );
}

function PermissionCard({ icon: Icon, title, why, on, onAllow }: { icon: LucideIcon; title: string; why: string; on: boolean; onAllow: () => void }) {
  const { p } = useTheme();
  return (
    <Card tone={on ? 'calmSoft' : 'card'}>
      <View style={ps.head}>
        <View style={[ps.icon, { backgroundColor: on ? p.card : p.accentSoft }]}><Icon size={20} color={on ? p.calm : p.accent} /></View>
        <T v="bodyStrong" style={{ flex: 1 }}>{title}</T>
        {on ? <Check size={22} color={p.calm} strokeWidth={2.8} accessibilityLabel="Permitido" /> : null}
      </View>
      <T v="callout" tone="muted">{why}</T>
      {on ? <T v="caption" tone="calm">Permitido.</T> : <Button kind="secondary" label={`Permitir ${title.toLowerCase()}`} onPress={() => { tap('success'); onAllow(); }} />}
    </Card>
  );
}

const ps = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});

// 11. The trial period ------------------------------------------------------------

export function Pilot({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { training } = useStore();
  const nights = training.pilot.target;
  return (
    <StepShell
      {...nav}
      eyebrow="Modo prueba"
      title="Primero me gano tu confianza"
      lead="Las primeras 5 noches no silencio nada. Cada mañana te muestro qué habría hecho y tú me dices si acerté."
      footer={<Button label="Entendido" onPress={nav.next} />}
    >
      <Card tone="accentSoft" style={{ gap: space.lg }}>
        <View style={pl.nights} accessibilityLabel={`${nights} noches de prueba. La primera es esta noche.`}>
          {Array.from({ length: nights }, (_, n) => (
            <View key={n} style={{ alignItems: 'center', gap: space.xs, flex: 1 }}>
              <View style={[pl.night, { backgroundColor: n === 0 ? p.accent : p.card, borderColor: p.accent }]}>
                <Moon size={18} color={n === 0 ? p.onAccent : p.accent} />
              </View>
              <T v="caption" tone={n === 0 ? 'accent' : 'muted'}>{n === 0 ? 'Hoy' : String(n + 1)}</T>
            </View>
          ))}
          <View style={{ alignItems: 'center', gap: space.xs, flex: 1 }}>
            <View style={[pl.night, { backgroundColor: p.sol, borderColor: p.sol }]}>
              <ShieldCheck size={18} color={p.onSol} />
            </View>
            <T v="caption" tone="ink">Confías</T>
          </View>
        </View>
      </Card>
      <View style={{ gap: space.md }}>
        {[
          ['Mientras tanto te sigue llegando todo', 'Nada se silencia. Duermes igual que siempre, pero ya ves cómo trabajo.'],
          ['Cada mañana, un toque', '"Bien", "Debió despertarme" o "No debió despertarme". Con eso aprendo.'],
          ['Cuando no me equivoque con nada urgente', 'Te propongo pasar a modo real. Una equivocación grave reinicia la cuenta.'],
        ].map(([t, d], n) => (
          <View key={t} style={pl.point}>
            <View style={[pl.num, { backgroundColor: p.surface }]}><T v="calloutStrong" tone="accent">{n + 1}</T></View>
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
  nights: { flexDirection: 'row', justifyContent: 'space-between' },
  night: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

// 12. Ready -------------------------------------------------------------------

export function Done({ nav, draft }: { nav: StepNav; draft: Draft }) {
  const { night } = useTheme();
  const { state, dispatch } = useStore();
  const connected = state.connections.filter((c) => c.status === 'connected').map((c) => c.name);
  const chats = state.chats.filter((c) => c.on).length;
  const goals = GOALS.filter((g) => draft.goals.includes(g.id)).map((g) => g.title);
  const finish = () => {
    if (draft.goals.length) dispatch({ type: 'setProfile', patch: { goals: draft.goals, agentMode: 'shadow' } });
    dispatch({ type: 'finishOnboarding' });
    tap('success');
    router.replace('/');
  };
  return (
    <StepShell {...nav} title="Listo. Desde ahora yo me acuerdo." footer={<Button kind="primary" label="Ir a mi día" onPress={finish} />}>
      <Hero>
        <T v="eyebrow" tone="onHeroMuted">Esta noche empieza la prueba</T>
        <T v="h2" tone="onHero">
          {state.profile.nightStyle === 'wake_if_urgent'
            ? `De ${night.start} a ${night.end} vigilo tus chats y tu correo. Si algo es urgente, te despierto.`
            : `A las ${night.start} te dejo todo ordenado para mañana. No te despierto.`}
        </T>
        <T v="callout" tone="onHeroMuted">Resumen de la mañana a las {state.profile.morningAt}{state.profile.whatsappDigest ? ', también por WhatsApp' : ''}.</T>
      </Hero>
      <List>
        <ListRow title="Lo que quieres lograr" detail={goals.join(' · ') || 'Sin elegir'} />
        <ListRow title="Fuentes conectadas" detail={connected.join(', ')} value={String(connected.length)} />
        <ListRow title="Chats de WhatsApp vigilados" value={String(chats)} />
        <ListRow title="Reglas" detail="Las confirmaste tú" value={String(state.rules.length)} last />
      </List>
    </StepShell>
  );
}
