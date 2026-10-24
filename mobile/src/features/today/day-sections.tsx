import { router } from 'expo-router';
import { CalendarDays, Moon, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { Hero } from '../../components/brand';
import { Button, Card, List, ListRow, Section, T } from '../../components/ui';
import { keyOf, WeekStrip } from '../../components/week-strip';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';
import { TaskRow } from '../tasks/task-row';
import { ago, hhmm } from './moment';

/** Morning: the summary is ready. The one primary action of the screen. */
export function MorningHero() {
  const { lastNight } = useStore();
  const woke = lastNight.filter((h) => h.wouldWake).length;
  const waited = lastNight.filter((h) => h.decision === 'report').length;
  return (
    <Hero>
      <T v="eyebrow" tone="onHeroMuted">Resumen de la mañana</T>
      <T v="h2" tone="onHero">Tu resumen está listo.</T>
      <T tone="onHeroMuted">
        Anoche te desperté {woke === 1 ? '1 vez' : `${woke} veces`}. Lo demás te esperó: {waited} cosas quedaron como tareas.
      </T>
      <Button kind="primary" label="Ver el resumen" onPress={() => router.push('/resumen/manana')} style={{ alignSelf: 'flex-start', marginTop: space.xs }} />
    </Hero>
  );
}

/** One hour before the nightly summary: offer the one-minute close. */
export function EveningCard() {
  const { state } = useStore();
  const { p } = useTheme();
  const open = state.tasks.filter((t) => !t.done).length;
  return (
    <Card tone="accentSoft">
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Moon size={18} color={p.accent} />
        <T v="eyebrow" tone="accent">Cierre del día</T>
      </View>
      <T v="h3">Cierra el día en un minuto.</T>
      <T tone="muted">Te muestro lo que quedó abierto ({open} tareas) y cómo lo abordamos mañana. Si algo te da vueltas, me lo dictas y lo suelto por ti.</T>
      <Button label="Hacer el cierre" onPress={() => router.push('/resumen/noche')} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

/** "Lo importante": at most 3, each with its origin and why. */
export function Important() {
  const { state, toggleTask } = useStore();
  const important = state.tasks.filter((t) => t.important && !t.done).slice(0, 3);
  const doneToday = state.tasks.filter((t) => t.important && t.done).length;
  return (
    <Section eyebrow="Lo importante" title={important.length ? (important.length === 1 ? 'Una cosa te necesita' : `${important.length} cosas te necesitan`) : 'Lo importante está hecho'} action="Ver todas" onAction={() => router.navigate('/tareas')}>
      {important.length ? (
        <List>
          {important.map((t, i) => (
            <TaskRow key={t.id} task={t} showWhy onToggle={() => toggleTask(t.id)} onPress={() => router.push({ pathname: '/tarea/[id]', params: { id: t.id } })} last={i === important.length - 1} />
          ))}
        </List>
      ) : (
        <Card tone="calmSoft">
          <T tone="calm" v="bodyStrong">Listo por hoy.</T>
          <T tone="muted">{doneToday ? `Cerraste ${doneToday} cosas importantes.` : 'No hay nada urgente.'} Si llega algo que te necesite, lo subo aquí.</T>
        </Card>
      )}
    </Section>
  );
}

/** "Tu semana": week strip with shifts, and what is next today. */
export function Week() {
  const { shifts, events } = useStore();
  const [selected, setSelected] = useState(keyOf(new Date()));
  const now = Date.now();
  const sameDay = (iso: string) => keyOf(new Date(iso)) === selected;
  const next = events
    .filter((e) => sameDay(e.start) && (selected !== keyOf(new Date()) || new Date(e.end).getTime() > now))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);
  const isToday = selected === keyOf(new Date());
  const busy: Record<string, number> = {};
  events.forEach((e) => { const k = keyOf(new Date(e.start)); busy[k] = (busy[k] ?? 0) + 1; });

  return (
    <Section eyebrow="Tu semana" title={isToday ? 'Lo que viene hoy' : new Date(`${selected}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' })} action="Agenda" onAction={() => router.navigate({ pathname: '/agenda', params: { day: selected } })}>
      <WeekStrip selected={selected} onSelect={setSelected} shifts={shifts} busy={busy} />
      {next.length ? (
        <List>
          {next.map((e, i) => (
            <ListRow
              key={e.id}
              icon={e.kind === 'shift' ? Moon : CalendarDays}
              title={e.title}
              detail={`${hhmm(e.start)} a ${hhmm(e.end)}${e.place ? ` · ${e.place}` : ''}`}
              last={i === next.length - 1}
              onPress={() => router.navigate({ pathname: '/agenda', params: { day: selected } })}
            />
          ))}
        </List>
      ) : (
        <T tone="muted">{isToday ? 'No te queda nada agendado hoy.' : 'Ese día está libre.'}</T>
      )}
    </Section>
  );
}

/** Quiet trust row: what Sol is watching and when it last looked. */
export function Watching() {
  const { state } = useStore();
  const on = state.connections.filter((c) => c.status === 'connected');
  const attention = state.connections.some((c) => c.status === 'needs_attention');
  const latest = on.map((c) => c.lastCheck).filter(Boolean).sort().at(-1);
  return (
    <List>
      <ListRow
        icon={ShieldCheck}
        iconTone={attention ? 'urgent' : 'calm'}
        title={attention ? 'Una conexión necesita atención' : 'Sol está atento'}
        detail={`${on.map((c) => c.name).join(', ')} · revisé ${ago(latest)}`}
        onPress={() => router.push('/tu/conexiones')}
        last
      />
    </List>
  );
}
