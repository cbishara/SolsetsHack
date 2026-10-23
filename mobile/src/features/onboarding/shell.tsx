import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinkButton, Progress, T, tap } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { space } from '../../theme/tokens';
import { useReduceMotion } from './motion';

/**
 * Frame for every onboarding step: back, progress, optional skip, the step
 * itself and a footer that stays within thumb reach.
 */
export function StepShell({ index, total, back, onBack = back, onSkip, skipLabel = 'Saltar', eyebrow, title, lead, children, footer, stepKey }: {
  index: number; total: number; back?: () => void; onBack?: () => void; next?: () => void; onSkip?: () => void; skipLabel?: string;
  eyebrow?: string; title: string; lead?: string; children?: ReactNode; footer: ReactNode; stepKey: string;
}) {
  const { p } = useTheme();
  const reduce = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: reduce ? 120 : 320, useNativeDriver: true }).start();
  }, [stepKey, reduce, enter]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : 14, 0] });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }} edges={['top', 'bottom']}>
      <View style={s.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al paso anterior"
          onPress={() => { tap(); onBack?.(); }}
          disabled={!onBack}
          hitSlop={8}
          style={({ pressed }) => [s.back, { backgroundColor: p.surface, opacity: !onBack ? 0 : pressed ? 0.7 : 1 }]}
        >
          <ChevronLeft size={22} color={p.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }} accessibilityLabel={`Paso ${index} de ${total}`}>
          <Progress value={index / total} height={6} />
        </View>
        <View style={s.skip}>{onSkip ? <LinkButton label={skipLabel} onPress={onSkip} /> : null}</View>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: enter, transform: [{ translateY }], gap: space.xxl }}>
          <View style={{ gap: space.sm }}>
            {eyebrow ? <T v="eyebrow" tone="accent">{eyebrow}</T> : null}
            <T v="title" accessibilityRole="header">{title}</T>
            {lead ? <T tone="muted">{lead}</T> : null}
          </View>
          {children}
        </Animated.View>
      </ScrollView>

      <View style={[s.footer, { borderTopColor: p.line, backgroundColor: p.bg }]}>{footer}</View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  back: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  skip: { minWidth: 56, alignItems: 'flex-end' },
  body: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxxl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm, gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
