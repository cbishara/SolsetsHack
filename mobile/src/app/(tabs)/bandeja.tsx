import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Inbox, Search, Tags, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/top-bar';
import { Button, Chip, EmptyState, Field, IconButton, List, Screen, Section, T, tap } from '../../components/ui';
import { dayLabel, keyOf, relative } from '../../data/dates';
import { activeCategories, categoryById, toReview } from '../../data/select';
import { useStore } from '../../data/store';
import type { Item } from '../../data/types';
import { CategoryPicker } from '../../features/inbox/category-picker';
import { ItemRow } from '../../features/inbox/item-row';
import { useTheme } from '../../theme/theme';
import { categoryColors, space } from '../../theme/tokens';

type Filter = 'all' | 'review' | 'unread' | string; // or a category id

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Groups items by day, with last night's on their own. */
function groupByDay(items: Item[], now = new Date()) {
  const groups: { id: string; title: string; items: Item[]; silenced: Item[] }[] = [];
  for (const i of items) {
    const key = i.night && keyOf(new Date(i.receivedAt)) >= keyOf(new Date(now.getTime() - 86_400_000)) && new Date(i.receivedAt).getHours() < 12 ? 'night' : keyOf(new Date(i.receivedAt));
    let g = groups.find((x) => x.id === key);
    if (!g) {
      g = { id: key, title: key === 'night' ? 'Anoche' : dayLabel(key, now), items: [], silenced: [] };
      groups.push(g);
    }
    (i.outcome.kind === 'ignored' ? g.silenced : g.items).push(i);
  }
  return groups;
}

/**
 * Bandeja: everything that arrived, already read and sorted. Each row shows
 * who sent it, Sol's reading, the original and what Sol did. What Sol is not
 * sure about waits on top for one tap.
 */
export default function Bandeja() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const params = useLocalSearchParams<{ c?: string; f?: string }>();
  const [filter, setFilter] = useState<Filter>(params.c ?? params.f ?? 'all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [picking, setPicking] = useState<Item | null>(null);

  useEffect(() => {
    if (params.c) setFilter(params.c);
    else if (params.f) setFilter(params.f);
  }, [params.c, params.f]);

  const review = toReview(state);
  const unread = state.items.filter((i) => !i.read && i.outcome.kind !== 'ignored');
  const cats = activeCategories(state).map((c) => ({ c, n: state.items.filter((i) => i.categoryId === c.id).length })).filter((x) => x.n);

  const visible = useMemo(() => {
    let list = state.items;
    if (filter === 'review') list = review;
    else if (filter === 'unread') list = unread;
    else if (filter !== 'all') list = list.filter((i) => i.categoryId === filter);
    if (query.trim()) {
      const q = plain(query);
      list = list.filter((i) => plain(`${i.from.name} ${i.channel} ${i.summary} ${i.body} ${i.subject ?? ''}`).includes(q));
    }
    return list;
  }, [state.items, filter, query, review, unread]);

  const groups = groupByDay(filter === 'review' ? [] : visible.filter((i) => filter !== 'all' || i.review === 'none' || query));
  const last = state.items[0]?.receivedAt;

  return (
    <Screen header={undefined}>
      <TopBar
        title="Bandeja"
        overline={last ? `Al día · lo último llegó ${relative(last)}` : 'Al día'}
        actions={
          <>
            <IconButton icon={searching ? X : Search} label={searching ? 'Cerrar búsqueda' : 'Buscar'} onPress={() => { setSearching(!searching); setQuery(''); }} size={40} />
            <IconButton icon={Tags} label="Categorías" onPress={() => router.push('/categorias')} size={40} />
          </>
        }
      />

      <View style={{ gap: space.md }}>
        {searching ? <Field value={query} onChangeText={setQuery} placeholder="Buscar persona, chat o texto" autoFocus returnKeyType="search" accessibilityLabel="Buscar en la bandeja" /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipScroll}>
          <Chip label="Todo" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {review.length ? <Chip label="Por confirmar" count={review.length} tone="sol" selected={filter === 'review'} onPress={() => setFilter('review')} /> : null}
          {unread.length ? <Chip label="Sin leer" count={unread.length} selected={filter === 'unread'} onPress={() => setFilter('unread')} /> : null}
          {cats.map(({ c, n }) => (
            <Chip key={c.id} label={c.name} count={n} dot={categoryColors[c.color]} selected={filter === c.id} onPress={() => setFilter(c.id)} />
          ))}
        </ScrollView>
      </View>

      {(filter === 'all' || filter === 'review') && review.length && !query ? (
        <Section title="Por confirmar" count={review.length}>
          <T v="callout" tone="muted" style={{ marginTop: -space.sm }}>No estoy seguro de qué son. Con tu respuesta aprendo para la próxima.</T>
          <List>
            {review.map((i, n) => {
              const suggested = categoryById(state, i.categoryId);
              return (
                <View key={i.id} style={n < review.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }}>
                  <ItemRow item={i} category={suggested} onPress={() => router.push(`/entrada/${i.id}`)} last />
                  <View style={s.reviewActions}>
                    {suggested ? (
                      <Button small kind="secondary" label="Confirmar" accessibilityLabel={`Confirmar: es ${suggested.name}`} onPress={() => { tap('success'); dispatch({ type: 'categorize', id: i.id, categoryId: suggested.id }); }} />
                    ) : null}
                    <Button small kind="ghost" label={suggested ? 'Cambiar' : 'Elegir categoría'} onPress={() => setPicking(i)} />
                  </View>
                </View>
              );
            })}
          </List>
        </Section>
      ) : null}

      {filter !== 'review' && groups.map((g) => (
        <Section key={g.id} title={g.title} count={g.items.length + g.silenced.length}>
          <List>
            {g.items.map((i, n) => (
              <ItemRow key={i.id} item={i} category={categoryById(state, i.categoryId)} onPress={() => router.push(`/entrada/${i.id}`)}
                last={n === g.items.length - 1 && !g.silenced.length} />
            ))}
            {g.silenced.length ? (
              <>
                <Pressable accessibilityRole="button" onPress={() => { tap(); setOpen({ ...open, [g.id]: !open[g.id] }); }} style={({ pressed }) => [s.silenced, pressed && { backgroundColor: p.accentSoft }, open[g.id] && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
                  <T v="callout" tone="faint" style={{ flex: 1 }}>{`${g.silenced.length} ${g.silenced.length === 1 ? 'silenciado' : 'silenciados'}: conversación que no pedía nada`}</T>
                  <ChevronDown size={16} color={p.faint} style={{ transform: [{ rotate: open[g.id] ? '180deg' : '0deg' }] }} />
                </Pressable>
                {open[g.id] ? g.silenced.map((i, n) => (
                  <ItemRow key={i.id} item={i} category={categoryById(state, i.categoryId)} onPress={() => router.push(`/entrada/${i.id}`)} compact last={n === g.silenced.length - 1} />
                )) : null}
              </>
            ) : null}
          </List>
        </Section>
      ))}

      {!groups.length && filter !== 'review' ? (
        <EmptyState icon={Inbox} title={query ? 'Sin resultados' : 'Nada por aquí'} detail={query ? 'Prueba con otro nombre o palabra.' : 'Cuando llegue algo de esta categoría, aparece aquí.'} />
      ) : null}
      {filter === 'review' && !review.length ? <EmptyState icon={Inbox} title="Nada por confirmar" detail="Todo lo que llegó ya tiene categoría." /> : null}

      <CategoryPicker visible={!!picking} onClose={() => setPicking(null)} value={picking?.categoryId ?? null}
        onPick={(id) => { if (picking) { tap('success'); dispatch({ type: 'categorize', id: picking.id, categoryId: id }); } }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  chipScroll: { marginHorizontal: -space.xl },
  chips: { gap: space.sm, paddingHorizontal: space.xl },
  reviewActions: { flexDirection: 'row', gap: space.sm, paddingLeft: 68, paddingRight: space.lg, paddingBottom: space.md, marginTop: -space.xs, flexWrap: 'wrap' },
  silenced: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 48, gap: space.sm },
});
