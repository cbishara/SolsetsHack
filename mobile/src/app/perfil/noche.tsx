import { router } from 'expo-router';
import { BellRing, Moon, MoonStar, Phone, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import {
  Button, CATEGORY_ICONS, Chip, Field, Glass, IconTile, List, ListRow, OptionRow, Screen, Section, T, tap, ToggleRow,
} from '../../components/ui';
import { WEEKDAYS_SHORT, cap } from '../../data/dates';
import { activeCategories, nightKey, tonight } from '../../data/select';
import { useStore } from '../../data/store';
import { hoursBetween, shiftTime } from '../../features/settings/format';
import { TimeStepper } from '../../features/settings/time-stepper';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

/**
 * Noche y avisos. When Sol may wake you, for what, and how. Works for a guard
 * duty, an on-call week, a sick parent or a server that cannot fail: the
 * person names the trigger, the app never assumes one.
 */
export default function Noche() {
  const { p, scheme, night, setNight, setManual } = useTheme();
  const { state, dispatch } = useStore();
  const n = state.nightAlerts;
  const set = (patch: Partial<typeof n>) => dispatch({ type: 'setNightAlerts', patch });
  const t = tonight(state);
  const cats = activeCategories(state).filter((c) => c.action !== 'ignore');
  const wakers = cats.filter((c) => c.wakeAtNight);
  const calendar = state.calendars.find((c) => c.id === n.calendarId);
  const quiet = n.mode === 'quiet';

  return (
    <Screen padBottom={false}>
      <Header title="Noche y avisos" />

      <Glass style={s.status}>
        <View style={s.statusHead}>
          <IconTile icon={t.on ? MoonStar : Moon} color={t.on ? p.sol : p.muted} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3">{t.on ? 'Esta noche: avisos activos' : 'Esta noche: sin avisos'}</T>
            <T v="callout" tone="muted">{`${t.because}. ${n.from} a ${n.to}.`}</T>
          </View>
        </View>
        {!quiet ? (
          <Button small kind="secondary" label={t.on ? 'Apagar solo por esta noche' : 'Activar solo por esta noche'}
            onPress={() => { tap('success'); set({ override: { date: nightKey(n), on: !t.on } }); }} />
        ) : null}
      </Glass>

      <Section title="De noche, Sol">
        <List>
          <OptionRow title="Me avisa si es urgente" detail="Solo por las categorías que tú marques. Lo demás espera al resumen." selected={!quiet} onPress={() => set({ mode: 'urgent' })} />
          <OptionRow title="No me interrumpe nunca" detail="Todo queda ordenado para la mañana." selected={quiet} onPress={() => set({ mode: 'quiet' })} last />
        </List>
      </Section>

      {!quiet ? (
        <>
          <Section title="Cuándo">
            <List>
              <OptionRow title="Todas las noches" selected={n.when === 'always'} onPress={() => set({ when: 'always' })} />
              <OptionRow title="Ciertos días" detail={n.when === 'days' ? n.days.slice().sort().map((d) => cap(WEEKDAYS_SHORT[d])).join(', ') || 'Elige los días' : undefined}
                selected={n.when === 'days'} onPress={() => set({ when: 'days' })} />
              <OptionRow title="Según mi calendario" detail={`Las noches con "${n.keyword}" en ${calendar?.name ?? 'tu calendario'}`}
                selected={n.when === 'calendar'} onPress={() => set({ when: 'calendar' })} last />
            </List>
            {n.when === 'days' ? (
              <View style={s.days}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <Chip key={d} label={cap(WEEKDAYS_SHORT[d])} selected={n.days.includes(d)}
                    onPress={() => set({ days: n.days.includes(d) ? n.days.filter((x) => x !== d) : [...n.days, d] })} />
                ))}
              </View>
            ) : null}
            {n.when === 'calendar' ? (
              <View style={{ gap: space.sm }}>
                <T v="captionStrong" tone="muted">Calendario</T>
                <View style={s.days}>
                  {state.calendars.map((c) => <Chip key={c.id} label={c.name} dot={categoryColors[c.color]} selected={n.calendarId === c.id} onPress={() => set({ calendarId: c.id })} />)}
                </View>
                <T v="captionStrong" tone="muted">Palabra en el evento</T>
                <Field value={n.keyword} onChangeText={(keyword) => set({ keyword })} placeholder="Ej: Guardia, Turno, De llamada" accessibilityLabel="Palabra que activa los avisos" />
                <T v="caption" tone="faint">Si esa noche hay un evento que la contenga, activo los avisos. Así sigues tu rotación sin tocar nada.</T>
              </View>
            ) : null}
          </Section>

          <Section title="Horario">
            <List>
              <TimeStepper label="Desde" value={n.from} onChange={(from) => set({ from })} />
              <TimeStepper label="Hasta" detail={hoursBetween(n.from, n.to)} value={n.to} onChange={(to) => set({ to })} last />
            </List>
          </Section>

          <Section title="Qué puede despertarte" action="Categorías" onAction={() => router.push('/categorias')}>
            <List>
              {cats.map((c, i) => (
                <ToggleRow key={c.id} title={c.name} icon={CATEGORY_ICONS[c.icon]} iconColor={categoryColors[c.color]} value={c.wakeAtNight}
                  onChange={(on) => dispatch({ type: 'updateCategory', id: c.id, patch: { wakeAtNight: on, action: on ? 'alert' : c.action === 'alert' ? 'digest' : c.action } })}
                  last={i === cats.length - 1} />
              ))}
            </List>
            <T v="caption" tone="faint">
              {wakers.length ? `Si llega algo de ${wakers.map((c) => c.name).join(' o ')}, te despierto. Si no estoy seguro de qué es, también te aviso: ante la duda, despierto.` : 'Ninguna categoría puede despertarte: de noche todo espera al resumen.'}
            </T>
          </Section>

          <Section title="Cómo te aviso">
            <List>
              <ListRow icon={BellRing} iconColor={p.urgent} title="Alerta en pantalla completa" detail="Con sonido, aunque el teléfono esté en silencio" />
              <ToggleRow icon={Phone} iconColor={categoryColors.green} title="Llamarme si no respondo" detail={n.call ? `Si no lo ves en ${n.callAfterMin} min` : 'Solo la alerta'} value={n.call} onChange={(call) => set({ call })} last={!n.call} />
              {n.call ? (
                <View style={s.minutes}>
                  <T v="body" style={{ flex: 1 }}>Esperar antes de llamar</T>
                  {[1, 3, 5, 10].map((m) => <Chip key={m} label={`${m} min`} selected={n.callAfterMin === m} onPress={() => set({ callAfterMin: m })} />)}
                </View>
              ) : null}
            </List>
            <Button kind="secondary" label="Probar cómo te aviso" icon={BellRing} onPress={() => router.push({ pathname: '/alerta', params: { demo: '1' } })} />
          </Section>

          <Section title="Antes de dormir">
            <List>
              <ToggleRow title="Preguntarme si activo los avisos" detail="Dos horas antes, en el inicio y por WhatsApp. Una respuesta y listo." value={n.askBefore} onChange={(askBefore) => set({ askBefore })} last />
            </List>
          </Section>
        </>
      ) : null}

      <Section title="Pantalla de noche">
        <List>
          <ToggleRow title="Oscurecer la app de noche" detail={night.scheduled ? `De ${night.start} a ${night.end}` : 'Solo cuando la actives'} value={night.scheduled} onChange={(scheduled) => setNight({ ...night, scheduled })} last={!night.scheduled} />
          {night.scheduled ? (
            <>
              <TimeStepper label="Desde" value={night.start} onChange={(start) => setNight({ ...night, start })} />
              <TimeStepper label="Hasta" value={night.end} onChange={(end) => setNight({ ...night, end: shiftTime(end, 0) })} last />
            </>
          ) : null}
        </List>
        <Pressable accessibilityRole="button" onPress={() => { tap(); setManual(scheme === 'night' ? 'day' : 'night'); }} style={s.manual}>
          {scheme === 'night' ? <Sun size={16} color={p.muted} /> : <Moon size={16} color={p.muted} />}
          <T v="calloutStrong" tone="muted">{scheme === 'night' ? 'Volver a la pantalla de día ahora' : 'Activar la pantalla de noche ahora'}</T>
        </Pressable>
      </Section>
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  status: { padding: space.xl, gap: space.md, borderRadius: radius.xl },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  minutes: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.md, flexWrap: 'wrap' },
  manual: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start', minHeight: 40 },
});
