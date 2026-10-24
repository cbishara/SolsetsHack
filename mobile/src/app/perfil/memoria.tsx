import { Calendar, Mail, MessageCircle, MessagesSquare, Pencil, Sparkles, Trash2, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Avatar, Badge, Button, Chip, Field, Glass, IconButton, List, ListRow, OptionRow, Screen, Section, Sheet, T, tap } from '../../components/ui';
import { relative } from '../../data/dates';
import { newId, useStore } from '../../data/store';
import type { MemoryCategory, MemoryItem, Person } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

const CATS: { id: MemoryCategory; label: string }[] = [
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'horarios', label: 'Horarios' },
  { id: 'preferencias', label: 'Preferencias' },
  { id: 'vida', label: 'Tu vida' },
];
const SOURCE: Record<MemoryItem['source'], { label: string; icon: typeof Mail }> = {
  onboarding: { label: 'Me lo contaste al empezar', icon: Sparkles },
  chat: { label: 'Me lo dijiste en el chat', icon: MessagesSquare },
  email: { label: 'Lo vi en tu correo', icon: Mail },
  whatsapp: { label: 'Lo vi en WhatsApp', icon: MessageCircle },
  calendar: { label: 'Lo vi en tu calendario', icon: Calendar },
};

/**
 * Lo que sabe de ti: who Sol thinks the person is, the people that matter and
 * what it learned, each with where it came from. Everything editable.
 * Only the person teaches Sol: what others write never changes this.
 */
export default function Memoria() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const [editing, setEditing] = useState<MemoryItem | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [about, setAbout] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftCat, setDraftCat] = useState<MemoryCategory>('preferencias');
  const { profile } = state;

  const teach = () => {
    const text = draft.trim();
    if (!text) return;
    tap('success');
    dispatch({ type: 'addMemory', item: { id: newId('m'), category: draftCat, text, source: 'chat', learnedAt: new Date().toISOString() } });
    setDraft('');
  };

  return (
    <Screen padBottom={false}>
      <Header title="Lo que sabe de ti" />

      <Glass style={s.card}>
        <View style={s.head}>
          <Avatar name={profile.fullName ?? profile.name} size={52} ring />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3">{profile.fullName ?? profile.name}</T>
            {profile.role ? <T v="callout" tone="muted">{profile.role}</T> : null}
          </View>
          <IconButton icon={Pencil} label="Corregir cómo te entiende Sol" onPress={() => setAbout(profile.about ?? '')} size={40} />
        </View>
        <View style={s.understood}>
          <SolOrb size={14} state="watching" style={{ margin: -6 }} />
          <T v="captionStrong" tone="sol">Cómo te entiendo</T>
        </View>
        <T>{profile.about ?? 'Todavía no sé mucho de ti. Cuéntame en el chat a qué te dedicas y qué te importa.'}</T>
      </Glass>

      <Section title="Personas" count={state.people.length}>
        <T v="callout" tone="muted" style={{ marginTop: -space.sm }}>Así sé que un mensaje de tu jefa no es igual a un boletín.</T>
        <List>
          {state.people.map((x, i) => (
            <ListRow key={x.id} title={x.name} detail={x.relation} leading={<Avatar name={x.name} size={36} color={x.importance === 'high' ? p.sol : undefined} />}
              right={x.importance === 'high' ? <Badge label="Importante" tone="sol" /> : undefined} onPress={() => setPerson(x)} last={i === state.people.length - 1} />
          ))}
        </List>
      </Section>

      {CATS.map((c) => {
        const list = state.memory.filter((m) => m.category === c.id || (c.id === 'trabajo' && m.category === 'personas'));
        if (!list.length) return null;
        return (
          <Section key={c.id} title={c.label} count={list.length}>
            <List>
              {list.map((m, i) => {
                const src = SOURCE[m.source];
                const Icon = src.icon;
                return (
                  <ListRow key={m.id} title={m.text} numberOfLines={3} onPress={() => setEditing(m)} last={i === list.length - 1}
                    detail={`${src.label} · ${relative(m.learnedAt)}`} leading={<View style={[s.src, { backgroundColor: p.surface }]}><Icon size={15} color={p.muted} /></View>} />
                );
              })}
            </List>
          </Section>
        );
      })}

      <Section title="Enséñale algo">
        <Field value={draft} onChangeText={setDraft} placeholder="Ej: Los viernes salgo a las 16:00" onSubmitEditing={teach} returnKeyType="done" accessibilityLabel="Algo que Sol debería saber" />
        <View style={s.chips}>
          {CATS.map((c) => <Chip key={c.id} label={c.label} selected={draftCat === c.id} onPress={() => setDraftCat(c.id)} />)}
        </View>
        <Button kind="sol" label="Guardar" disabled={!draft.trim()} onPress={teach} />
        <T v="caption" tone="faint">Sol solo aprende de ti: de lo que le dices y de cómo corriges. Lo que escriben otras personas nunca cambia lo que sabe de ti.</T>
      </Section>
      <View style={{ height: space.xxxl }} />

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title="Lo que sé" action={{ label: 'Guardar', onPress: () => { if (editing) dispatch({ type: 'updateMemory', id: editing.id, text: editing.text }); setEditing(null); } }}>
        {editing ? (
          <>
            <Field value={editing.text} onChangeText={(text) => setEditing({ ...editing, text })} multiline accessibilityLabel="Texto" />
            <T v="caption" tone="faint">{SOURCE[editing.source].label}.</T>
            <List>
              <ListRow icon={Trash2} iconTone="urgent" titleTone="urgent" title="Olvidar esto" last onPress={() => { tap(); dispatch({ type: 'removeMemory', id: editing.id }); setEditing(null); }} />
            </List>
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!person} onClose={() => setPerson(null)} title={person?.name}>
        {person ? (
          <>
            <Field value={person.relation} onChangeText={(relation) => setPerson({ ...person, relation })} placeholder="Quién es para ti" accessibilityLabel="Relación" />
            <List>
              <OptionRow title="Importante" detail="Lo suyo se prioriza y nunca se silencia" selected={person.importance === 'high'} onPress={() => setPerson({ ...person, importance: 'high' })} />
              <OptionRow title="Normal" selected={person.importance === 'normal'} onPress={() => setPerson({ ...person, importance: 'normal' })} last />
            </List>
            <Button kind="sol" label="Guardar" onPress={() => {
              tap('success');
              dispatch({ type: 'updatePerson', id: person.id, patch: person });
              setPerson(null);
            }} />
            <List>
              <ListRow icon={UserRound} iconTone="urgent" titleTone="urgent" title="Olvidar a esta persona" last
                onPress={() => { tap(); dispatch({ type: 'removePerson', id: person.id }); setPerson(null); }} />
            </List>
          </>
        ) : null}
      </Sheet>

      <Sheet visible={about !== null} onClose={() => setAbout(null)} title="Cómo te entiendo" action={{ label: 'Guardar', onPress: () => { dispatch({ type: 'setProfile', patch: { about: about ?? '' } }); setAbout(null); } }}>
        <Field value={about ?? ''} onChangeText={setAbout} multiline accessibilityLabel="Cómo te entiende Sol" />
        <T v="caption" tone="faint">Escríbelo como se lo contarías a alguien nuevo en tu equipo.</T>
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { padding: space.xl, gap: space.md, borderRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  understood: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  src: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
