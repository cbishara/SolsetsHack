import { Calendar, Mail, MessageCircle, Paperclip } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, CategoryTag, T, tap } from '../../components/ui';
import { stamp } from '../../data/dates';
import type { Category, Item } from '../../data/types';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';
import { outcomeOf } from './labels';

const SOURCE_ICON = { whatsapp: MessageCircle, email: Mail, calendar: Calendar };

/**
 * One thing that arrived, Mail style: who sent it and where, Sol's reading in
 * one line, the original underneath, then its category and what Sol did.
 */
export function ItemRow({ item, category, onPress, last, compact }: { item: Item; category?: Category; onPress: () => void; last?: boolean; compact?: boolean }) {
  const { p } = useTheme();
  const SourceIcon = SOURCE_ICON[item.source];
  const out = outcomeOf(item);
  const OutIcon = out.icon;
  const where = item.direct ? (item.source === 'email' ? item.subject : undefined) : item.channel;
  const original = item.source === 'email' && item.subject ? item.body.replace(/\s+/g, ' ') : item.body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.from.name}${where ? `, ${where}` : ''}. ${item.summary}. ${out.label}`}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }, pressed && { backgroundColor: p.accentSoft }]}
    >
      <View>
        <Avatar name={item.from.name} size={compact ? 36 : 42} />
        <View style={[s.source, { backgroundColor: p.bg, borderColor: p.bg }]}>
          <View style={[s.sourceInner, { backgroundColor: p.surface }]}>
            <SourceIcon size={10} color={p.muted} strokeWidth={2.6} />
          </View>
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.head}>
          <T v={item.read ? 'callout' : 'calloutStrong'} tone={item.read ? 'muted' : 'ink'} numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.from.name}{where && !compact ? <T v="callout" tone="faint">{`  ${where}`}</T> : null}
          </T>
          <View style={{ flex: 1 }} />
          {!item.read ? <View style={[s.unread, { backgroundColor: p.sol }]} /> : null}
          <T v="caption" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>{stamp(item.receivedAt)}</T>
        </View>
        <T v={item.read ? 'body' : 'bodyStrong'} numberOfLines={2}>{item.summary}</T>
        {!compact ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {item.attachments?.length ? <Paperclip size={12} color={p.faint} /> : null}
            <T v="callout" tone="faint" numberOfLines={1} style={{ flex: 1 }}>{original}</T>
          </View>
        ) : null}
        <View style={s.meta}>
          {category ? <CategoryTag name={category.name} color={category.color} small /> : item.review === 'new_kind' ? <CategoryTag name="Sin categoría" color="gray" small /> : null}
          <View style={s.inline}>
            <OutIcon size={12} color={p[out.tone]} strokeWidth={2.4} />
            <T v="captionStrong" tone={out.tone}>{out.label}</T>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  source: { position: 'absolute', right: -6, bottom: -4, borderRadius: 10, padding: 1.5 },
  sourceInner: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  unread: { width: 7, height: 7, borderRadius: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', marginTop: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
