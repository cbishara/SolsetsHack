import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { CATEGORY_ICONS, IconTile, List, ListRow, OptionRow, Sheet, T } from '../../components/ui';
import { activeCategories } from '../../data/select';
import { useStore } from '../../data/store';
import { useTheme } from '../../theme/theme';
import { categoryColors } from '../../theme/tokens';
import { actionLabel } from './labels';

/** Pick a category for something that arrived. Shows what each one does, so the choice has visible consequences. */
export function CategoryPicker({ visible, onClose, value, onPick, title = 'Categoría' }: {
  visible: boolean; onClose: () => void; value: string | null; onPick: (id: string | null) => void; title?: string;
}) {
  const { p } = useTheme();
  const { state } = useStore();
  const list = activeCategories(state);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <List>
        {list.map((c, i) => (
          <OptionRow key={c.id} title={c.name} detail={actionLabel(c.action) + (c.wakeAtNight ? ' · puede despertarte' : '')} selected={value === c.id}
            leading={<IconTile icon={CATEGORY_ICONS[c.icon]} color={categoryColors[c.color]} size={30} />}
            onPress={() => { onPick(c.id); onClose(); }} last={i === list.length - 1} />
        ))}
      </List>
      <List>
        <ListRow title="Nueva categoría" icon={Plus} iconColor={p.sol} onPress={() => { onClose(); router.push('/categorias/nueva'); }} last />
      </List>
      <View style={{ paddingHorizontal: 4 }}>
        <T v="caption" tone="faint">Sol aprende de cada corrección: lo próximo parecido llega a la categoría que elijas.</T>
      </View>
    </Sheet>
  );
}
