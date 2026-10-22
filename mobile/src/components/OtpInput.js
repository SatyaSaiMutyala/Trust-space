/* One-time code entry: six boxes driven by one hidden input, so paste and autofill work. */
import React, { useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, ms, s, vs } from '../theme';
import { KeyboardScope } from './useKeyboardOverlap';

export default function OtpInput({ value = '', onChange, length = 6, error, style }) {
  const ref = useRef(null);
  const boxRef = useRef(null); // the visible boxes — what gets scrolled above the keyboard
  const { reveal } = useContext(KeyboardScope);
  const [focus, setFocus] = useState(false);
  const digits = value.replace(/\D/g, '').slice(0, length);
  return (
    <Pressable ref={boxRef} onPress={() => ref.current && ref.current.focus()} style={[styles.row, style]} accessibilityLabel="One-time code">
      {Array.from({ length }).map((_, i) => {
        const active = focus && i === Math.min(digits.length, length - 1);
        return (
          <View key={i} style={[styles.box, active && styles.active, error && styles.error]}>
            <View style={styles.digitWrap}>{digits[i] ? <TextInput editable={false} value={digits[i]} style={styles.digit} pointerEvents="none" /> : null}</View>
          </View>
        );
      })}
      <TextInput ref={ref} value={digits} onChangeText={t => onChange && onChange(t.replace(/\D/g, '').slice(0, length))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={length}
        onFocus={() => { setFocus(true); reveal(boxRef); }} onBlur={() => setFocus(false)} style={styles.hidden} caretHidden />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: s(10) },
  box: { flex: 1, height: vs(56), borderRadius: ms(14), borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  active: { borderColor: colors.teal, borderWidth: 2 },
  error: { borderColor: colors.coral },
  digitWrap: { alignItems: 'center', justifyContent: 'center' },
  digit: { fontFamily: fonts.monoMedium, fontSize: ms(24), color: colors.ink, padding: 0, textAlign: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
