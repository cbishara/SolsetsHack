import { Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Header } from '../../components/header';
import { Badge, Button, Chip, List, Screen, Section, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { Rule, RuleKind } from '../../data/types';
import { confirm } from '../../features/settings/confirm';
import { RULE_GROUP } from '../../features/settings/labels';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';

const ORDER: RuleKind[] = ['wake', 'wait', 'task', 'ignore'];

// Rules in plain language, grouped by what happens. What Sol learned from
// your feedback is marked, so nothing changes behind your back.
export default function Reglas() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<RuleKind>('wake');
  const [adding, setAdding] = useState(false);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: 'addRule', rule: { id: `r${Date.now()}`, text: t[0].toUpperCase() + t.slice(1), kind, origin: 'you', confirmed: true } });
    tap('success');
    setText('');
    setAdding(false);
  };

  return (
    <Screen edges={['top', 'bottom']} padBottom={false}>
      <Header title="Reglas" />
      <View style={{ gap: space.sm }}>
        <T v="title" accessibilityRole="header">Cómo decide Sol</T>
        <T tone="muted">Estas reglas las propuso Sol y las confirmaste tú. Si algo no te sirve, quítalo.</T>
      </View>

      {adding ? (
        <View style={[s.add, { backgroundColor: p.surface, borderColor: p.line }]}>
          <T v="bodyStrong">Nueva regla</T>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ej: si escribe el gerente, despiértame"
            placeholderTextColor={p.faint}
            style={[s.input, { color: p.ink, backgroundColor: p.card, borderColor: p.line }]}
            accessibilityLabel="Escribe la regla"
            autoFocus
            onSubmitEditing={add}
          />
          <T v="caption" tone="muted">¿Qué hago cuando pase?</T>
          <View style={s.kinds}>
            {ORDER.map((k) => <Chip key={k} label={RULE_GROUP[k].title} selected={kind === k} onPress={() => setKind(k)} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button kind="secondary" label="Cancelar" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            <Button label="Guardar" onPress={add} disabled={!text.trim()} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Button icon={Plus} label="Agregar una regla" onPress={() => setAdding(true)} />
      )}

      {ORDER.map((k) => {
        const rules = state.rules.filter((r) => r.kind === k);
        if (!rules.length) return null;
        return (
          <Section key={k} eyebrow={RULE_GROUP[k].title}>
            <T v="caption" tone="muted" style={{ marginTop: -space.sm }}>{RULE_GROUP[k].detail}</T>
            <List>
              {rules.map((r, i) => (
                <RuleRow key={r.id} rule={r} last={i === rules.length - 1}
                  onRemove={() => confirm('Quitar esta regla', `"${r.text}". Sol deja de usarla desde ahora.`, () => dispatch({ type: 'removeRule', id: r.id }), 'Quitar')} />
              ))}
            </List>
          </Section>
        );
      })}
    </Screen>
  );
}

function RuleRow({ rule, last, onRemove }: { rule: Rule; last: boolean; onRemove: () => void }) {
  const { p } = useTheme();
  const learned = rule.origin === 'feedback';
  const origin = learned ? 'Aprendida de tu feedback' : rule.origin === 'you' ? 'La agregaste tú' : rule.origin === 'onboarding' ? 'Del entrenamiento' : 'Regla base';
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <T v="body">{rule.text}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
          {learned ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Sparkles size={13} color={p.accent} />
              <T v="caption" tone="accent">{origin}</T>
            </View>
          ) : (
            <T v="caption" tone="muted">{origin}</T>
          )}
          {rule.examples ? <Badge label={`${rule.examples} casos`} tone="neutral" /> : null}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Quitar regla: ${rule.text}`} onPress={() => { tap(); onRemove(); }} hitSlop={8}
        style={({ pressed }) => [s.remove, { opacity: pressed ? 0.5 : 1 }]}>
        <Trash2 size={18} color={p.muted} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  add: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, minHeight: 52, fontFamily: 'InterTight_400Regular', fontSize: 17 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
