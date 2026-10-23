import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { space } from '../theme/tokens';
import { T, tap } from './ui';

/** Header for pushed and modal screens: back (or close), optional title and right slot. */
export function Header({ title, close, right, onBack }: { title?: string; close?: boolean; right?: ReactNode; onBack?: () => void }) {
  const { p } = useTheme();
  const Icon = close ? X : ChevronLeft;
  const back = () => {
    tap();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={s.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={close ? 'Cerrar' : 'Volver'} onPress={back} hitSlop={12}
        style={({ pressed }) => [s.back, { backgroundColor: p.surface, opacity: pressed ? 0.7 : 1 }]}>
        <Icon size={22} color={p.ink} strokeWidth={2.2} />
      </Pressable>
      <View style={{ flex: 1 }}>{title ? <T v="bodyStrong" numberOfLines={1} style={{ textAlign: 'center' }}>{title}</T> : null}</View>
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, marginBottom: -space.md },
  back: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
