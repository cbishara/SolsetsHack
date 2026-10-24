import { router, useLocalSearchParams } from 'expo-router';
import { Bell, CalendarDays, Clock, MapPin, Pencil, StickyNote, Trash2, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Avatar, Button, EmptyState, Glass, List, ListRow, Screen, T, tap } from '../../components/ui';
import { cap, dayLabel, keyOf, reminderLabel, timeOf } from '../../data/dates';
import { calendarById, nightAlertsFor } from '../../data/select';
import { useStore } from '../../data/store';
import { EventComposer } from '../../features/agenda/event-composer';
import { confirm } from '../../features/settings/confirm';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

/** One event: when, where, who, and where it came from. Edit or delete it here. */
export default function Evento() {
  const { p } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const event = state.events.find((e) => e.id === id);
  if (!event) {
    return (
      <Screen padBottom={false}>
        <Header />
        <EmptyState icon={CalendarDays} title="Este evento ya no está" />
      </Screen>
    );
  }
  const cal = calendarById(state, event.calendarId);
  const color = categoryColors[cal?.color ?? 'gray'];
  const item = event.itemId ? state.items.find((i) => i.id === event.itemId) : undefined;
  const startKey = keyOf(new Date(event.start));
  const endKey = keyOf(new Date(event.end));
  const when = event.allDay
    ? `${cap(dayLabel(startKey))}, todo el día`
    : `${cap(dayLabel(startKey))}, ${timeOf(event.start)} a ${timeOf(event.end)}${endKey !== startKey ? ` del ${dayLabel(endKey).toLowerCase()}` : ''}`;
  const triggersNight = state.nightAlerts.when === 'calendar' && event.calendarId === state.nightAlerts.calendarId
    && event.title.toLowerCase().includes(state.nightAlerts.keyword.toLowerCase()) && nightAlertsFor(state, startKey).on;

  return (
    <Screen padBottom={false}>
      <Header right={<Button small kind="secondary" label="Editar" icon={Pencil} onPress={() => setEditing(true)} />} />
      <View style={{ gap: space.sm }}>
        <View style={[s.calendar, { backgroundColor: `${color}22` }]}>
          <View style={[s.dot, { backgroundColor: color }]} />
          <T v="captionStrong" style={{ color }}>{cal?.name ?? 'Calendario'}</T>
        </View>
        <T v="title" accessibilityRole="header">{event.title}</T>
        <T tone="muted">{when}</T>
      </View>

      {triggersNight ? (
        <Glass style={s.night}>
          <SolOrb size={16} state="calm" style={{ margin: -7 }} />
          <T v="callout" style={{ flex: 1 }}>{`Esa noche activo los avisos nocturnos de ${state.nightAlerts.from} a ${state.nightAlerts.to}, porque el evento dice "${state.nightAlerts.keyword}".`}</T>
        </Glass>
      ) : null}

      <List>
        <ListRow icon={Clock} iconColor={categoryColors.blue} title="Horario" detail={when} />
        {event.place ? <ListRow icon={MapPin} iconColor={categoryColors.red} title="Lugar" detail={event.place} /> : null}
        <ListRow icon={Bell} iconColor={categoryColors.orange} title="Aviso" value={reminderLabel(event.alert)} />
        {event.notes ? <ListRow icon={StickyNote} iconColor={categoryColors.yellow} title="Notas" detail={event.notes} /> : null}
        <ListRow icon={CalendarDays} iconColor={color} title="Calendario" value={cal ? `${cal.name} · ${cal.account}` : undefined} last />
      </List>

      {event.attendees?.length ? (
        <List>
          {event.attendees.map((a, i) => (
            <ListRow key={a} title={a} leading={<Avatar name={a} size={32} />} last={i === event.attendees!.length - 1} />
          ))}
        </List>
      ) : null}

      {item ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); router.push(`/entrada/${item.id}`); }}
          style={({ pressed }) => [s.origin, { backgroundColor: p.card, borderColor: p.line }, pressed && { opacity: 0.7 }]}>
          <View style={s.originHead}>
            <SolOrb size={14} state="watching" style={{ margin: -6 }} />
            <T v="captionStrong" tone="sol">Lo agregó Sol desde un {item.source === 'email' ? 'correo' : item.source === 'calendar' ? 'invitación' : 'mensaje'}</T>
          </View>
          <T v="calloutStrong">{item.from.name}{item.subject ? ` · ${item.subject}` : ''}</T>
          <T v="callout" tone="muted" numberOfLines={2}>{item.body}</T>
          <T v="captionStrong" tone="sol">Ver original</T>
        </Pressable>
      ) : null}

      <List>
        <ListRow icon={Trash2} iconTone="urgent" titleTone="urgent" title="Eliminar evento" last
          onPress={() => confirm('Eliminar evento', `"${event.title}" se elimina de tu agenda.`, () => { dispatch({ type: 'removeEvent', id: event.id }); router.back(); }, 'Eliminar')} />
      </List>
      <View style={{ height: space.xxxl }} />
      <EventComposer visible={editing} onClose={() => setEditing(false)} initial={event} />
    </Screen>
  );
}

const s = StyleSheet.create({
  calendar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  night: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  origin: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: 6 },
  originHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
