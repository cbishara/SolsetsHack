import { Lock, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Header } from '../../components/header';
import { Button, Card, Chip, Screen, Section, Stack, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { MemoryCategory, MemoryItem } from '../../data/types';
import { confirmAction, shortDate, SOURCE_LABEL } from '../../features/learning/parts';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

const CATEGORIES: { id: MemoryCategory; label: string }[] = [
  { id: 'vida', label: 'Tu vida' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'personas', label: 'Personas' },
  { id: 'horarios', label: 'Horarios' },
  { id: 'preferencias', label: 'Preferencias' },
];

// Memoria: everything Sol knows, where it learned it, and full control to fix
// or forget it. Nothing hidden: if it is not here, Sol does not use it.
export default function Memoria() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('preferencias');

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'addMemory', item: { id: `m${Date.now()}`, category, text, source: 'chat', learnedAt: new Date().toISOString() } });
    tap('success');
    setDraft('');
    setAdding(false);
  };

  return (
    <Screen edges={['top']}>
      <Header title="Memoria" />

      <Stack gap="sm">
        <T v="title" accessibilityRole="header">Lo que sé de ti</T>
        <T tone="muted">
          Lo uso para ordenar tus cosas sin preguntarte dos veces. Si algo está mal, corrígelo. Si no quieres que lo recuerde, bórralo.
        </T>
      </Stack>

      {adding ? (
        <Card>
          <T v="bodyStrong">Dile algo a Sol para que lo recuerde</T>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Por ejemplo: los martes busco a Tomás a las 17:30"
            placeholderTextColor={p.faint}
            multiline
            autoFocus
            style={[s.input, { color: p.ink, backgroundColor: p.surface, borderColor: p.line }]}
            accessibilityLabel="Qué quieres que Sol recuerde"
          />
          <View style={s.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button kind="secondary" label="Cancelar" onPress={() => { setAdding(false); setDraft(''); }} style={{ flex: 1 }} />
            <Button label="Guardar" onPress={save} disabled={!draft.trim()} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button kind="secondary" icon={Plus} label="Dile algo para que lo recuerde" onPress={() => setAdding(true)} />
      )}

      {CATEGORIES.map((c) => {
        const items = state.memory.filter((m) => m.category === c.id);
        if (!items.length) return null;
        return (
          <Section key={c.id} eyebrow={c.label}>
            <View style={[s.group, { backgroundColor: p.card, borderColor: p.line }]}>
              {items.map((m, i) => (
                <MemoryRow key={m.id} item={m} last={i === items.length - 1} />
              ))}
            </View>
          </Section>
        );
      })}

      <Card tone="surface">
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Lock size={18} color={p.accent} />
          <T v="bodyStrong">Tu memoria es tuya</T>
        </View>
        <T v="callout" tone="muted">
          Guardo solo lo que ves aquí: lo que me contaste y lo que aprendí de tus chats, correos y calendario conectados. No se comparte con nadie ni se usa para otra cosa. Tú decides qué queda.
        </T>
      </Card>
    </Screen>
  );
}

function MemoryRow({ item, last }: { item: MemoryItem; last: boolean }) {
  const { p } = useTheme();
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  const remove = () =>
    confirmAction('¿Olvido esto?', `"${item.text}"\n\nDejo de usarlo desde ahora. No se puede deshacer.`, 'Olvidar', () =>
      dispatch({ type: 'removeMemory', id: item.id }),
    );

  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      {editing ? (
        <View style={{ gap: space.sm }}>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            style={[s.input, { color: p.ink, backgroundColor: p.surface, borderColor: p.line }]}
            accessibilityLabel="Corregir recuerdo"
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button kind="secondary" label="Cancelar" onPress={() => { setText(item.text); setEditing(false); }} style={{ flex: 1 }} />
            <Button
              label="Guardar"
              disabled={!text.trim()}
              onPress={() => { dispatch({ type: 'updateMemory', id: item.id, text: text.trim() }); tap('success'); setEditing(false); }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T>{item.text}</T>
            <T v="caption" tone="muted">{SOURCE_LABEL[item.source]}, {shortDate(item.learnedAt)}</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Corregir: ${item.text}`} onPress={() => { tap(); setEditing(true); }} hitSlop={8} style={s.icon}>
            <Pencil size={18} color={p.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Olvidar: ${item.text}`} onPress={() => { tap(); remove(); }} hitSlop={8} style={s.icon}>
            <Trash2 size={18} color={p.muted} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  group: { borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, overflow: 'hidden' },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md + 2 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  input: { fontFamily: 'InterTight_400Regular', fontSize: 17, lineHeight: 23, minHeight: 72, borderWidth: 1, borderRadius: radius.md, padding: space.md, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
