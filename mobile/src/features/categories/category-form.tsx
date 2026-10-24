import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORY_ICONS, Field, List, OptionRow, Section, T, tap, ToggleRow } from '../../components/ui';
import type { Category, CategoryIcon } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space, type CategoryColor } from '../../theme/tokens';
import { ACTIONS } from '../inbox/labels';

const COLORS = Object.keys(categoryColors) as CategoryColor[];
const ICONS = Object.keys(CATEGORY_ICONS) as CategoryIcon[];

export type CategoryDraft = Pick<Category, 'name' | 'color' | 'icon' | 'description' | 'action' | 'wakeAtNight'>;

/** Everything a category is: its name and look, how Sol recognizes it, and what Sol does with it. */
export function CategoryForm({ value, onChange }: { value: CategoryDraft; onChange: (patch: Partial<CategoryDraft>) => void }) {
  const { p } = useTheme();
  return (
    <>
      <Section title="Nombre">
        <Field value={value.name} onChangeText={(name) => onChange({ name })} placeholder="Ej: Pedidos de clientes" accessibilityLabel="Nombre de la categoría" maxLength={40} />
        <View style={s.colors}>
          {COLORS.map((c) => (
            <Pressable key={c} accessibilityRole="radio" accessibilityState={{ selected: value.color === c }} accessibilityLabel={`Color ${c}`}
              onPress={() => { tap(); onChange({ color: c }); }} hitSlop={4}
              style={[s.color, { backgroundColor: categoryColors[c], borderColor: value.color === c ? p.ink : 'transparent' }]}>
              {value.color === c ? <Check size={14} color="#000" strokeWidth={3} /> : null}
            </Pressable>
          ))}
        </View>
        <View style={s.icons}>
          {ICONS.map((i) => {
            const Icon = CATEGORY_ICONS[i];
            const on = value.icon === i;
            return (
              <Pressable key={i} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Ícono ${i}`}
                onPress={() => { tap(); onChange({ icon: i }); }}
                style={[s.icon, { backgroundColor: on ? `${categoryColors[value.color]}2E` : p.surface, borderColor: on ? categoryColors[value.color] : p.line }]}>
                <Icon size={18} color={on ? categoryColors[value.color] : p.muted} strokeWidth={2.1} />
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Cómo la reconoce Sol">
        <Field value={value.description} onChangeText={(description) => onChange({ description })} multiline
          placeholder="Descríbela como se la explicarías a una persona: qué tipo de mensajes, de quién, qué palabras suelen traer."
          accessibilityLabel="Descripción de la categoría" maxLength={400} />
        <T v="caption" tone="faint">Sol usa esta descripción y tus correcciones para clasificar lo que llega.</T>
      </Section>

      <Section title="Qué hace Sol cuando llega algo así">
        <List>
          {ACTIONS.map((a, i) => (
            <OptionRow key={a.id} title={a.label} detail={a.detail} selected={value.action === a.id}
              onPress={() => onChange({ action: a.id, wakeAtNight: a.id === 'alert' ? value.wakeAtNight : false })} last={i === ACTIONS.length - 1} />
          ))}
        </List>
      </Section>

      <Section title="De noche">
        <List>
          <ToggleRow title="Puede despertarte" detail={value.wakeAtNight ? 'Con los avisos nocturnos activos, te aviso aunque estés durmiendo.' : 'De noche espera al resumen de la mañana.'}
            value={value.wakeAtNight} onChange={(wakeAtNight) => onChange({ wakeAtNight, action: wakeAtNight ? 'alert' : value.action })} last />
        </List>
      </Section>
    </>
  );
}

const s = StyleSheet.create({
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  color: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  icon: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
