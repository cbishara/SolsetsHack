import { Search, Sparkles, Users } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { useBackend } from '../../api/backend';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Avatar, EmptyState, Field, IconTile, List, Screen, Section, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { WatchedChat } from '../../data/types';
import { createLinkClient, linkErrorText } from '../../features/whatsapp/link';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';

const GREEN = '#25D366';
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function ChatRow({ chat, onToggle, last }: { chat: WatchedChat; onToggle: () => void; last?: boolean }) {
  const { p } = useTheme();
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      {chat.kind === 'grupo' ? <IconTile icon={Users} color={GREEN} size={36} /> : <Avatar name={chat.name} size={36} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body" numberOfLines={1}>{chat.name}</T>
        <T v="caption" tone={chat.reason ? 'sol' : 'muted'} numberOfLines={2}>{chat.reason ?? (chat.kind === 'grupo' ? `Grupo${chat.members ? ` · ${chat.members} personas` : ''}` : 'Chat personal')}</T>
      </View>
      <Switch value={chat.on} onValueChange={() => { tap(); onToggle(); }} trackColor={{ true: p.calm, false: p.surface }} ios_backgroundColor={p.surface} accessibilityLabel={`Que Sol lea ${chat.name}`} />
    </View>
  );
}

/**
 * Which chats Sol may read. Sol suggests from names and types only (it never
 * opens a chat to decide); the person confirms. Nothing is selected by default.
 */
export default function WhatsAppChats() {
  const { state, dispatch } = useStore();
  const backend = useBackend();
  const live = state.dataSource === 'server' && backend.status === 'connected';
  const client = useMemo(() => (live ? createLinkClient(backend.url) : null), [live, backend.url]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live: load the whole catalog (names and types) from server/.
  useEffect(() => {
    if (!client) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const all: WatchedChat[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < 10; page++) {
          const res = await client.catalog(cursor);
          all.push(...res.items.map((c) => ({ id: c.id, name: c.name, kind: c.type === 1 ? 'grupo' as const : 'persona' as const, on: !!c.selected })));
          if (!res.cursor) break;
          cursor = res.cursor;
        }
        if (!cancel && all.length) dispatch({ type: 'setChats', chats: all });
      } catch (e) {
        if (!cancel) setError(linkErrorText(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [client, dispatch]);

  const toggle = (chat: WatchedChat) => {
    dispatch({ type: 'toggleChat', id: chat.id });
    client?.select(chat.id, !chat.on).catch((e) => setError(linkErrorText(e)));
  };

  const q = plain(query.trim());
  const match = (c: WatchedChat) => !q || plain(c.name).includes(q);
  const suggested = state.chats.filter((c) => c.suggested && match(c));
  const rest = state.chats.filter((c) => !c.suggested && match(c));
  const on = state.chats.filter((c) => c.on).length;
  const pendingSuggestions = state.chats.filter((c) => c.suggested && !c.on);

  return (
    <Screen padBottom={false}>
      <Header title="Chats que lee Sol" />
      <View style={{ gap: space.xs }}>
        <T v="title" accessibilityRole="header">{on ? `Sol lee ${on} ${on === 1 ? 'chat' : 'chats'}` : 'Elige qué lee Sol'}</T>
        <T tone="muted">Sol solo abre los chats que marques. Para sugerirte, mira nombres y tipos, nunca el contenido.</T>
      </View>

      <Field value={query} onChangeText={setQuery} placeholder="Buscar un chat o grupo" returnKeyType="search" accessibilityLabel="Buscar chat" />
      {error ? <T v="callout" tone="urgent">{error}</T> : null}
      {loading ? <View style={s.loading}><ActivityIndicator /><T v="callout" tone="muted">Cargando tus chats…</T></View> : null}

      {suggested.length ? (
        <Section title="Sol sugiere" count={suggested.length}
          action={pendingSuggestions.length ? 'Marcar todos' : undefined}
          onAction={() => { tap('success'); pendingSuggestions.forEach((c) => toggle(c)); }}>
          <View style={s.hint}>
            <SolOrb size={14} state="watching" style={{ margin: -6 }} />
            <T v="caption" tone="muted" style={{ flex: 1 }}>Por lo que me contaste, estos parecen importantes. Tú decides.</T>
          </View>
          <List>
            {suggested.map((c, i) => <ChatRow key={c.id} chat={c} onToggle={() => toggle(c)} last={i === suggested.length - 1} />)}
          </List>
        </Section>
      ) : null}

      {rest.length ? (
        <Section title="Todos tus chats" count={rest.length}>
          <List>
            {rest.map((c, i) => <ChatRow key={c.id} chat={c} onToggle={() => toggle(c)} last={i === rest.length - 1} />)}
          </List>
        </Section>
      ) : null}

      {!suggested.length && !rest.length && !loading ? (
        <EmptyState icon={q ? Search : Sparkles} title={q ? 'Sin resultados' : 'Todavía no hay chats'} detail={q ? 'Prueba con otra parte del nombre.' : 'Cuando conectes WhatsApp, aquí aparecen tus chats.'} />
      ) : null}

      <T v="caption" tone="faint">Puedes cambiar esto cuando quieras. Al desmarcar un chat, Sol deja de leerlo al tiro, aunque antes lo haya sugerido.</T>
      <View style={{ height: space.xxxl }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 62 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: -space.sm },
});
