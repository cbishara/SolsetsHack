import { router } from 'expo-router';
import { Moon, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Header } from '../../components/header';
import { SolOrb } from '../../components/sol-orb';
import { Button, CATEGORY_ICONS, Glass, IconTile, List, ListRow, Screen, Section, T, tap } from '../../components/ui';
import { useStore } from '../../data/store';
import type { CategoryAction } from '../../data/types';
import { ACTIONS } from '../../features/inbox/labels';
import { useTheme } from '../../theme/theme';
import { categoryColors, radius, space } from '../../theme/tokens';

const GROUP_TITLE: Record<CategoryAction, string> = {
  alert: 'Te aviso al tiro',
  task: 'Se vuelven tareas',
  calendar: 'Van a tu agenda',
  digest: 'Quedan en el resumen',
  ignore: 'Silenciadas',
};

/**
 * Categorías: the rules Sol works by, in the person's own terms. Each category
 * says how Sol recognizes it and what it does with it. Sol proposes new ones
 * when it sees a pattern; nothing changes until the person accepts.
 */
export default function Categorias() {
  const { p } = useTheme();
  const { state, dispatch } = useStore();
  const month = Date.now() - 30 * 86_400_000;
  const count = (id: string) => state.items.filter((i) => i.categoryId === id && new Date(i.receivedAt).getTime() > month).length;
  const suggested = state.categories.filter((c) => c.status === 'suggested');
  const active = state.categories.filter((c) => c.status === 'active');

  return (
    <Screen padBottom={false}>
      <Header right={<Button small kind="secondary" label="Nueva" icon={Plus} onPress={() => router.push('/categorias/nueva')} />} />
      <View style={{ gap: space.sm }}>
        <T v="largeTitle" accessibilityRole="header">Categorías</T>
        <T tone="muted">Sol ordena todo lo que llega en estas categorías. Tú decides qué hace con cada una y cuáles pueden despertarte.</T>
      </View>

      {suggested.length ? (
        <Section title="Sol propone" count={suggested.length}>
          {suggested.map((c) => {
            const q = state.questions.find((x) => x.categoryId === c.id && !x.answer);
            return (
              <Glass key={c.id} style={s.suggest}>
                <View style={s.suggestHead}>
                  <IconTile icon={CATEGORY_ICONS[c.icon]} color={categoryColors[c.color]} size={36} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="bodyStrong">{c.name}</T>
                    <T v="caption" tone="muted">{c.description}</T>
                  </View>
                  <SolOrb size={14} state="watching" style={{ margin: -6 }} />
                </View>
                {q?.context ? <T v="callout" tone="muted">{q.context}</T> : null}
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button small kind="sol" label="Revisar y aceptar" onPress={() => router.push(`/categorias/${c.id}`)} style={{ flex: 1 }} />
                  <Button small kind="ghost" label="Descartar" onPress={() => { tap(); dispatch({ type: 'removeCategory', id: c.id }); if (q) dispatch({ type: 'answer', id: q.id, index: q.options.length - 1 }); }} />
                </View>
              </Glass>
            );
          })}
        </Section>
      ) : null}

      {ACTIONS.map((a) => {
        const list = active.filter((c) => c.action === a.id);
        if (!list.length) return null;
        return (
          <Section key={a.id} title={GROUP_TITLE[a.id]} count={list.length}>
            <List>
              {list.map((c, i) => {
                const n = count(c.id);
                return (
                  <ListRow key={c.id} title={c.name} leading={<IconTile icon={CATEGORY_ICONS[c.icon]} color={categoryColors[c.color]} size={32} />}
                    detail={`${n} ${n === 1 ? 'mensaje' : 'mensajes'} este mes${c.origin === 'you' ? ' · creada por ti' : ''}`}
                    right={c.wakeAtNight ? <Moon size={15} color={p.sol} accessibilityLabel="Puede despertarte" /> : undefined}
                    onPress={() => router.push(`/categorias/${c.id}`)} last={i === list.length - 1} />
                );
              })}
            </List>
          </Section>
        );
      })}
      <T v="caption" tone="faint" style={{ marginBottom: space.xxxl }}>
        La luna marca las categorías que pueden despertarte cuando los avisos nocturnos están activos.
      </T>
    </Screen>
  );
}

const s = StyleSheet.create({
  suggest: { padding: space.lg, gap: space.md, borderRadius: radius.lg },
  suggestHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
});
