import { router, useLocalSearchParams } from 'expo-router';
import {
  BellRing, CalendarPlus, ChevronRight, CircleCheck, ExternalLink, FileText, Paperclip, ThumbsDown, ThumbsUp, Users, VolumeX,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Avatar, CategoryTag, Chip, EmptyState, Glass, List, ListRow, Screen, Section, T, tap } from '../../components/ui';
import { cap, dayLabel, keyOf, timeOf } from '../../data/dates';
import { categoryById } from '../../data/select';
import { taskFromItem, useStore } from '../../data/store';
import type { FeedbackValue, Item } from '../../data/types';
import { CategoryPicker } from '../../features/inbox/category-picker';
import { sourceLabel } from '../../features/inbox/labels';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

const when = (iso: string) => `${dayLabel(keyOf(new Date(iso)))}, ${timeOf(iso)}`;

/** The original, as it arrived: a chat bubble with the messages around it, or the email itself. */
function Original({ item }: { item: Item }) {
  const { p } = useTheme();
  if (item.source === 'email' || item.source === 'calendar') {
    return (
      <View style={[s.mail, { backgroundColor: p.card, borderColor: p.line }]}>
        <View style={s.mailHead}>
          <MailLine label="De" value={`${item.from.name}${item.from.handle ? ` <${item.from.handle}>` : ''}`} />
          <MailLine label="Para" value="Tú" />
          <MailLine label="Fecha" value={when(item.receivedAt)} />
        </View>
        <View style={[s.mailBody, { borderTopColor: p.line }]}>
          {item.subject ? <T v="bodyStrong">{item.subject}</T> : null}
          <T v="body" tone="muted" selectable>{item.body}</T>
          {item.attachments?.map((a) => (
            <View key={a.name} style={[s.attach, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Paperclip size={15} color={p.muted} />
              <T v="calloutStrong" numberOfLines={1} style={{ flex: 1 }}>{a.name}</T>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={[s.chat, { backgroundColor: p.card, borderColor: p.line }]}>
      <View style={[s.chatHead, { borderBottomColor: p.line }]}>
        {item.direct ? <Avatar name={item.channel} size={28} /> : <View style={[s.group, { backgroundColor: p.surface }]}><Users size={14} color={p.muted} /></View>}
        <T v="calloutStrong" numberOfLines={1} style={{ flex: 1 }}>{item.channel}</T>
        <T v="caption" tone="faint">WhatsApp</T>
      </View>
      <View style={{ padding: space.md, gap: space.sm }}>
        {item.thread?.map((m, i) => (
          <View key={i} style={[s.bubble, { backgroundColor: p.surface, opacity: 0.6 }, m.mine && s.mine]}>
            {!item.direct ? <T v="captionStrong" tone="muted">{m.from}</T> : null}
            <T v="callout">{m.body}</T>
            <T v="micro" tone="faint" style={{ alignSelf: 'flex-end' }}>{`${dayLabel(keyOf(new Date(m.at)))} ${timeOf(m.at)}`}</T>
          </View>
        ))}
        <View style={[s.bubble, { backgroundColor: p.surface, borderColor: p.glassLine, borderWidth: StyleSheet.hairlineWidth }]}>
          {!item.direct ? <T v="captionStrong" style={{ color: categoryColors.teal }}>{item.from.name}</T> : null}
          <T v="body" selectable>{item.body}</T>
          <T v="micro" tone="faint" style={{ alignSelf: 'flex-end' }}>{timeOf(item.receivedAt)}</T>
        </View>
      </View>
    </View>
  );
}

function MailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <T v="callout" tone="faint" style={{ width: 48 }}>{label}</T>
      <T v="callout" numberOfLines={2} style={{ flex: 1 }}>{value}</T>
    </View>
  );
}

const FEEDBACK: { id: FeedbackValue; label: string; icon: typeof ThumbsUp }[] = [
  { id: 'right', label: 'Bien hecho', icon: ThumbsUp },
  { id: 'should_have_woken', label: 'Debió avisarme', icon: BellRing },
  { id: 'should_not_have_woken', label: 'No era para avisar', icon: ThumbsDown },
];

/**
 * One item in full. Sol's reading on top, the original underneath so the person
 * can check it, then what to do with it. Trust comes from seeing both.
 */
export default function Entrada() {
  const { p } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const item = state.items.find((i) => i.id === id);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!item) return;
    if (item.outcome.kind === 'alerted' && !item.outcome.seenAt) dispatch({ type: 'updateItem', id: item.id, patch: { read: true, outcome: { kind: 'alerted', seenAt: new Date().toISOString() } } });
    else if (!item.read) dispatch({ type: 'updateItem', id: item.id, patch: { read: true } });
  }, [item, dispatch]);

  if (!item) {
    return (
      <Screen padBottom={false}>
        <Header />
        <EmptyState icon={FileText} title="Este mensaje ya no está" detail="Puede que lo hayan borrado de la bandeja." />
      </Screen>
    );
  }

  const category = categoryById(state, item.categoryId);
  const person = state.people.find((x) => x.name === item.from.name);
  const task = item.outcome.kind === 'task' ? state.tasks.find((t) => t.id === (item.outcome as { taskId: string }).taskId) : undefined;
  const event = item.outcome.kind === 'event' ? state.events.find((e) => e.id === (item.outcome as { eventId: string }).eventId) : undefined;

  const outcome = (() => {
    switch (item.outcome.kind) {
      case 'alerted': return { icon: BellRing, tone: 'urgent' as const, text: `Te avisé a las ${timeOf(item.receivedAt)}${item.outcome.seenAt ? ` y lo viste a las ${timeOf(item.outcome.seenAt)}` : ''}.` };
      case 'task': return { icon: CircleCheck, tone: 'calm' as const, text: task ? `Lo dejé como tarea: ${task.title}.` : 'Lo dejé como tarea.' };
      case 'event': return { icon: CalendarPlus, tone: 'calm' as const, text: event ? `Lo agregué a tu agenda: ${event.title}, ${dayLabel(keyOf(new Date(event.start)))} ${timeOf(event.start)}.` : 'Lo agregué a tu agenda.' };
      case 'digest': return { icon: FileText, tone: 'muted' as const, text: 'No te interrumpí: queda en el resumen.' };
      case 'ignored': return { icon: VolumeX, tone: 'muted' as const, text: 'Lo silencié: no pedía nada.' };
    }
  })();
  const OutcomeIcon = outcome.icon;

  const makeTask = () => {
    const t = taskFromItem(item);
    tap('success');
    dispatch({ type: 'itemToTask', id: item.id, task: t });
    router.push(`/tarea/${t.id}`);
  };

  const openApp = async () => {
    const url = item.source === 'whatsapp' ? 'whatsapp://' : 'message://';
    if (await Linking.canOpenURL(url).catch(() => false)) void Linking.openURL(url);
  };

  return (
    <Screen padBottom={false} glow="sol">
      <Header title={sourceLabel(item.source)} />

      <View style={s.sender}>
        <Avatar name={item.from.name} size={52} color={person?.importance === 'high' ? p.sol : undefined} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h3" numberOfLines={1}>{item.from.name}</T>
          <T v="callout" tone="muted" numberOfLines={1}>{[person?.relation, item.direct ? null : item.channel].filter(Boolean).join(' · ') || (item.from.handle ?? sourceLabel(item.source))}</T>
          <T v="caption" tone="faint">{cap(when(item.receivedAt))}</T>
        </View>
      </View>

      <Glass style={s.reading}>
        <View style={s.readingHead}>
          <SolOrb size={16} state="watching" style={{ margin: -7 }} />
          <T v="captionStrong" tone="sol" style={{ flex: 1 }}>Lo que entendí</T>
          {item.confidence < 0.75 ? <T v="caption" tone="faint">Confianza media</T> : null}
        </View>
        <T v="h3">{item.summary}</T>
        {item.context ? <T v="body" tone="muted">{item.context}</T> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Cambiar categoría" onPress={() => { tap(); setPicking(true); }} style={[s.catRow, { borderTopColor: p.glassLine }]}>
          <T v="callout" tone="muted" style={{ width: 82 }}>Categoría</T>
          <View style={{ flex: 1 }}>{category ? <CategoryTag name={category.name} color={category.color} /> : <T v="calloutStrong" tone="sol">Elegir una</T>}</View>
          <ChevronRight size={16} color={p.faint} />
        </Pressable>
        <View style={[s.catRow, { borderTopColor: p.glassLine }]}>
          <T v="callout" tone="muted" style={{ width: 82 }}>Qué hice</T>
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            <OutcomeIcon size={16} color={p[outcome.tone]} style={{ marginTop: 2 }} />
            <T v="callout" style={{ flex: 1 }}>{outcome.text}</T>
          </View>
        </View>
        {item.night ? (
          <View style={[s.catRow, { borderTopColor: p.glassLine }]}>
            <T v="callout" tone="muted" style={{ width: 82 }}>De noche</T>
            <T v="callout" style={{ flex: 1 }}>{item.night.reason}</T>
          </View>
        ) : null}
      </Glass>

      <Section title="Mensaje original">
        <Original item={item} />
        {Platform.OS !== 'web' && item.source !== 'calendar' ? (
          <Pressable accessibilityRole="link" onPress={() => { tap(); void openApp(); }} style={s.open} hitSlop={8}>
            <ExternalLink size={15} color={p.muted} />
            <T v="calloutStrong" tone="muted">{item.source === 'whatsapp' ? 'Abrir WhatsApp' : 'Abrir el correo'}</T>
          </Pressable>
        ) : null}
      </Section>

      <Section title="Acciones">
        <List>
          {task ? <ListRow icon={CircleCheck} iconColor={p.calm} title="Ver la tarea" detail={task.title} onPress={() => router.push(`/tarea/${task.id}`)} /> : null}
          {!task ? <ListRow icon={CircleCheck} iconColor={p.calm} title="Crear una tarea" detail="Con este mensaje adjunto" onPress={makeTask} /> : null}
          {event ? <ListRow icon={CalendarPlus} iconColor={categoryColors.indigo} title="Ver en la agenda" detail={event.title} onPress={() => router.push(`/evento/${event.id}`)} /> : null}
          {item.outcome.kind !== 'ignored' ? (
            <ListRow icon={VolumeX} iconTone="muted" title="Silenciar" detail="No necesito hacer nada con esto"
              onPress={() => { tap(); dispatch({ type: 'updateItem', id: item.id, patch: { outcome: { kind: 'ignored' }, review: 'none' } }); }} last />
          ) : (
            <ListRow icon={FileText} iconTone="muted" title="Dejar en el resumen" detail="Que vuelva a aparecer"
              onPress={() => { tap(); dispatch({ type: 'updateItem', id: item.id, patch: { outcome: { kind: 'digest' } } }); }} last />
          )}
        </List>
      </Section>

      <Section title="¿Lo manejé bien?">
        <View style={s.feedback}>
          {FEEDBACK.map((f) => (
            <Chip key={f.id} label={f.label} icon={f.icon} selected={item.feedback === f.id} tone={f.id === 'right' ? 'calm' : 'accent'}
              onPress={() => dispatch({ type: 'rate', id: item.id, value: f.id })} />
          ))}
        </View>
        <T v="caption" tone="faint">{item.feedback ? 'Gracias. Lo uso como ejemplo para las próximas.' : 'Tu respuesta me entrena: la uso como ejemplo en lo que llegue después.'}</T>
      </Section>

      <View style={{ height: space.xxl }} />
      <CategoryPicker visible={picking} onClose={() => setPicking(false)} value={item.categoryId}
        onPick={(cid) => { tap('success'); dispatch({ type: 'categorize', id: item.id, categoryId: cid }); }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  sender: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  reading: { padding: space.xl, gap: space.md, borderRadius: radius.xl },
  readingHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 40 },
  mail: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  mailHead: { padding: space.lg, gap: 6 },
  mailBody: { padding: space.lg, gap: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  attach: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, borderWidth: 1, padding: space.md },
  chat: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  group: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 16, borderTopLeftRadius: 6, padding: space.md, paddingBottom: space.sm, gap: 3, maxWidth: '88%', alignSelf: 'flex-start' },
  mine: { alignSelf: 'flex-end', borderTopLeftRadius: 16, borderTopRightRadius: 6 },
  open: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  feedback: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
