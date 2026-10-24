import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useTheme } from '../theme/theme';
import { radius, space } from '../theme/tokens';
import { T } from './ui';

/** Six-digit code, one box per digit, filled by one hidden field (keyboard, paste and SMS autofill work). */
export function CodeInput({ value, onChange, length = 6, error, onDone }: { value: string; onChange: (v: string) => void; length?: number; error?: boolean; onDone?: (v: string) => void }) {
  const { p } = useTheme();
  const ref = useRef<TextInputInstance>(null);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityRole="none" style={s.row}>
      {digits.map((d, i) => {
        const active = i === Math.min(value.length, length - 1);
        return (
          <View key={i} style={[s.box, { backgroundColor: p.surface, borderColor: error ? p.urgent : active ? p.sol : p.line }]}>
            <T v="title" style={{ fontVariant: ['tabular-nums'] }}>{d.trim()}</T>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => {
          const clean = v.replace(/\D/g, '').slice(0, length);
          onChange(clean);
          if (clean.length === length) onDone?.(clean);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus
        style={s.hidden}
        accessibilityLabel="Código de 6 dígitos"
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  box: { width: 46, height: 58, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0.011, width: '100%', height: '100%' },
});
