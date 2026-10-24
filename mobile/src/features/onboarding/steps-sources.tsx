import { Calendar, Check, Mail, MessageCircle, Users, User, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Switch, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Badge, Button, Card, IconTile, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { ConnectionId } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';
import { useReduceMotion } from './motion';
import { StepShell } from './shell';
import type { StepNav } from './types';

// 4. Connect sources -------------------------------------------------------

const SOURCES: { id: ConnectionId; name: string; icon: LucideIcon; color: string; how: string; promise: string }[] = [
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366', how: 'Escaneas un código, como en WhatsApp Web', promise: 'Leo los chats que elijas. No respondo por ti.' },
  { id: 'gmail', name: 'Correo', icon: Mail, color: categoryColors.red, how: 'Inicias sesión con Google o Microsoft', promise: 'Leo tus correos para sacar tareas y plazos. Nunca envío nada.' },
  { id: 'calendar', name: 'Calendario', icon: Calendar, color: categoryColors.blue, how: 'Inicias sesión con Google o Microsoft', promise: 'Veo tus eventos para ordenar tu día y saber qué noches cuidarte.' },
];

type Phase = 'off' | 'qr' | 'connecting' | 'on';

export function Connect({ nav }: { nav: StepNav }) {
  const { dispatch } = useStore();
  const [phase, setPhase] = useState<Record<string, Phase>>({ whatsapp: 'off', gmail: 'off', calendar: 'off' });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    // Start from zero: only what gets connected here counts as connected.
    SOURCES.forEach((src) => dispatch({ type: 'setConnection', id: src.id, patch: { status: 'off' } }));
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [dispatch]);

  const connect = (id: ConnectionId) => {
    setPhase((s) => ({ ...s, [id]: 'connecting' }));
    timers.current.push(
      setTimeout(() => {
        setPhase((s) => ({ ...s, [id]: 'on' }));
        dispatch({ type: 'setConnection', id, patch: { status: 'connected' } });
        tap('success');
      }, 1100),
    );
  };

  const count = Object.values(phase).filter((v) => v === 'on').length;

  return (
    <StepShell
      {...nav}
      title="Conecta lo que te llega"
      lead="Sol trabaja con lo que ya usas. Mientras más conectes, mejor te cuida."
      footer={
        <>
          <Button label={count ? 'Continuar' : 'Conecta al menos una'} disabled={!count} onPress={nav.next} />
          <T v="caption" tone="muted" style={{ textAlign: 'center' }}>En esta demo las conexiones son simuladas, con datos de ejemplo.</T>
        </>
      }
    >
      <View style={{ gap: space.md }}>
        {SOURCES.map((src) => (
          <SourceCard
            key={src.id}
            {...src}
            phase={phase[src.id]}
            onPress={() => (src.id === 'whatsapp' && phase.whatsapp === 'off' ? setPhase((s) => ({ ...s, whatsapp: 'qr' })) : connect(src.id))}
          />
        ))}
      </View>
    </StepShell>
  );
}

function SourceCard({ name, icon: Icon, color, how, promise, phase, onPress }: { name: string; icon: LucideIcon; color: string; how: string; promise: string; phase: Phase; onPress: () => void }) {
  const { p } = useTheme();
  const on = phase === 'on';
  return (
    <Card tone={on ? 'calmSoft' : 'card'} style={{ gap: space.md }}>
      <View style={cs.head}>
        <IconTile icon={Icon} color={color} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{name}</T>
          <T v="callout" tone="muted">{promise}</T>
        </View>
        {on ? <Check size={22} color={p.calm} strokeWidth={2.8} accessibilityLabel="Conectado" /> : null}
      </View>
      {phase === 'qr' ? <FakeQr /> : null}
      {phase === 'off' ? <Button kind="secondary" label={`Conectar ${name}`} onPress={onPress} /> : null}
      {phase === 'qr' ? (
        <>
          <T v="callout" tone="muted">En tu teléfono abre WhatsApp, Dispositivos vinculados, Vincular un dispositivo, y escanea este código.</T>
          <Button label="Ya lo escaneé" onPress={onPress} />
        </>
      ) : null}
      {phase === 'connecting' ? (
        <View style={cs.connecting} accessibilityLiveRegion="polite">
          <ActivityIndicator color={p.sol} />
          <T v="callout" tone="muted">Conectando…</T>
        </View>
      ) : null}
      {on ? <T v="caption" tone="calm">Conectado. {how === 'Escaneas un código, como en WhatsApp Web' ? 'Solo veo lo que llega desde ahora; el historial lo leo aparte.' : 'Listo para leer.'}</T> : null}
      {phase === 'off' ? <T v="caption" tone="faint">{how}</T> : null}
    </Card>
  );
}

/** A simulated QR so the step looks like the real thing. */
function FakeQr() {
  const { p } = useTheme();
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    let seed = 7;
    for (let y = 0; y < 21; y++)
      for (let x = 0; x < 21; x++) {
        seed = (seed * 9301 + 49297) % 233280;
        const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        if (!finder && seed / 233280 > 0.52) out.push([x, y]);
      }
    return out;
  }, []);
  const finder = (x: number, y: number) => (
    <>
      <Rect x={x} y={y} width={7} height={7} fill={p.ink} />
      <Rect x={x + 1} y={y + 1} width={5} height={5} fill="#FFFFFF" />
      <Rect x={x + 2} y={y + 2} width={3} height={3} fill={p.ink} />
    </>
  );
  return (
    <View style={[cs.qr, { borderColor: p.line }]} accessibilityLabel="Código QR de ejemplo">
      <Svg width={168} height={168} viewBox="-1 -1 23 23">
        <Rect x={-1} y={-1} width={23} height={23} fill="#FFFFFF" />
        {cells.map(([x, y], i) => <Rect key={i} x={x} y={y} width={1} height={1} fill={p.scheme === 'night' ? '#0B1230' : p.ink} />)}
        {finder(0, 0)}
        {finder(14, 0)}
        {finder(0, 14)}
      </Svg>
    </View>
  );
}

const cs = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  connecting: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52 },
  qr: { alignSelf: 'center', padding: space.md, backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1 },
});

// 5. Which chats ------------------------------------------------------------

export function Chats({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  // Everything starts unselected: Sol suggests, the person chooses.
  useEffect(() => {
    dispatch({ type: 'setChats', chats: state.chats.map((c) => ({ ...c, on: false })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);
  const watched = state.chats.filter((c) => c.on).length;
  const ordered = [...state.chats].sort((a, b) => Number(!!b.suggested) - Number(!!a.suggested));
  const pending = state.chats.filter((c) => c.suggested && !c.on);
  return (
    <StepShell
      {...nav}
      title="¿Qué chats lee Sol?"
      lead="Solo leo los que marques. Te sugiero algunos por sus nombres, sin abrir ninguno."
      footer={<Button label={watched ? `Leer ${watched} ${watched === 1 ? 'chat' : 'chats'}` : 'Elige al menos uno'} disabled={!watched} onPress={nav.next} />}
    >
      {pending.length ? <Button kind="secondary" small label={`Marcar los ${pending.length} sugeridos`} onPress={() => { tap('success'); pending.forEach((c) => dispatch({ type: 'toggleChat', id: c.id })); }} style={{ alignSelf: 'flex-start' }} /> : null}
      <View style={[ch.list, { backgroundColor: p.card, borderColor: p.line }]}>
        {ordered.map((c, i) => (
          <Pressable
            key={c.id}
            accessibilityRole="switch"
            accessibilityState={{ checked: c.on }}
            accessibilityLabel={`${c.name}, ${c.kind}${c.reason ? `. ${c.reason}` : ''}`}
            onPress={() => { tap(); dispatch({ type: 'toggleChat', id: c.id }); }}
            style={[ch.row, i < ordered.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}
          >
            <View style={[ch.avatar, { backgroundColor: c.kind === 'grupo' ? '#25D36622' : p.surface }]}>
              {c.kind === 'grupo' ? <Users size={18} color="#25D366" /> : <User size={18} color={p.muted} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="body">{c.name}</T>
              <T v="caption" tone={c.reason ? 'sol' : 'muted'}>{c.reason ?? (c.kind === 'grupo' ? `Grupo${c.members ? ` · ${c.members} personas` : ''}` : 'Chat personal')}</T>
            </View>
            {/* The whole row toggles; the switch only shows the state. */}
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Switch value={c.on} trackColor={{ true: p.calm, false: p.surface }} ios_backgroundColor={p.surface} />
            </View>
          </Pressable>
        ))}
      </View>
      <T v="callout" tone="muted">Puedes cambiarlo cuando quieras en Perfil, WhatsApp.</T>
    </StepShell>
  );
}

const ch = StyleSheet.create({
  list: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64 },
  avatar: { width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});

// 6. Reading the history ----------------------------------------------------

const fmt = (n: number) => n.toLocaleString('es-CL');

export function Reading({ nav }: { nav: StepNav }) {
  const { p } = useTheme();
  const { training } = useStore();
  const reduce = useReduceMotion();
  const total = training.read.messages + training.read.emails;
  const progress = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const [count, setCount] = useState(reduce ? total : 0);
  const [shown, setShown] = useState(reduce ? training.categories.length : 0);
  const done = shown >= training.categories.length && count >= total;
  const appear = useRef(training.categories.map(() => new Animated.Value(reduce ? 1 : 0))).current;

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      appear.forEach((a) => a.setValue(1));
      setCount(total);
      setShown(training.categories.length);
      return;
    }
    const id = progress.addListener(({ value }) => {
      setCount(Math.round(value * total));
      setShown(Math.min(training.categories.length, Math.floor(value * (training.categories.length + 0.6))));
    });
    Animated.timing(progress, { toValue: 1, duration: 4200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setShown(training.categories.length));
    return () => progress.removeListener(id);
  }, [reduce, progress, total, training.categories.length, appear]);

  useEffect(() => {
    appear.forEach((a, i) => {
      if (i < shown) Animated.timing(a, { toValue: 1, duration: reduce ? 0 : 260, useNativeDriver: true }).start();
    });
    if (done) tap('success');
  }, [shown, appear, reduce, done]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <StepShell
      {...nav}
      title={done ? 'Ya entendí lo que te llega' : 'Estoy leyendo tu historial'}
      lead={`Los últimos ${training.read.months} meses de tus chats y tu correo. Así aprendo qué te importa y qué no, sin preguntarte todo.`}
      footer={<Button label={done ? 'Ver las categorías que te propongo' : 'Leyendo…'} disabled={!done} onPress={nav.next} />}
    >
      <Card style={{ gap: space.md }}>
        <View accessibilityLiveRegion="polite" accessibilityLabel={`Leí ${fmt(count)} de ${fmt(total)} mensajes y correos`}>
          <T v="numeral">{fmt(count)}</T>
          <T v="callout" tone="muted">
            mensajes y correos leídos · {fmt(training.read.messages)} de WhatsApp y {fmt(training.read.emails)} correos
          </T>
        </View>
        <View style={[rd.track, { backgroundColor: p.card }]}>
          <Animated.View style={[rd.fill, { width, backgroundColor: p.sol }]} />
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
        <T v="h3">Lo que encontré</T>
        {training.categories.map((c, i) => (
          <Animated.View
            key={c.id}
            style={{ opacity: appear[i], transform: [{ translateY: appear[i].interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : 10, 0] }) }] }}
          >
            <View style={[rd.cat, { backgroundColor: p.card, borderColor: p.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{c.label}</T>
                <T v="callout" tone="muted" numberOfLines={1}>{c.example}</T>
              </View>
              <Badge label={fmt(c.count)} tone={i === 0 ? 'urgent' : 'accent'} />
            </View>
          </Animated.View>
        ))}
      </View>
      {done ? <T v="callout" tone="calm">Todo quedó mapeado. Con esto te propongo tus categorías.</T> : null}
    </StepShell>
  );
}

const rd = StyleSheet.create({
  track: { height: 8, borderRadius: 8, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 8 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
});
