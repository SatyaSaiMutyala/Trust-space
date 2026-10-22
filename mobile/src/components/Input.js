/* Text field with label, optional right label link (Forgot password?), eye toggle for passwords, error state.
   `select` renders a tap-to-pick field with a chevron. `prefix` shows ₹ etc. */
import React, { useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';
import { KeyboardScope } from './useKeyboardOverlap';

export default function Input({ label, rightLabel, onRightLabel, value, onChangeText, placeholder, secure, error, hint, multiline, select, onPress, prefix, right, keyboardType, style, inputStyle, autoCapitalize = 'none', compact, editable = true }) {
  const [focus, setFocus] = useState(false);
  const ref = useRef(null);
  const { reveal } = useContext(KeyboardScope); // keep the field visible above the keyboard
  const [show, setShow] = useState(false);
  const border = error ? colors.coral : focus ? colors.teal : colors.line;
  const field = (
    <View style={[styles.halo, (focus || error) && { borderColor: error ? '#F6DCD0' : colors.tealTint }]}>
      <View style={[styles.box, { borderColor: border }, multiline && styles.multi, compact && styles.compact]}>
        {prefix ? <AppText variant="body" style={styles.text}>{prefix}</AppText> : null}
        {select ? (
          <AppText variant="body" style={[styles.text, styles.selectText, !value && { color: colors.muted }]}>{value || placeholder}</AppText>
        ) : (
          <TextInput ref={ref} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} secureTextEntry={secure && !show}
            onFocus={() => { setFocus(true); reveal(ref); }} onBlur={() => setFocus(false)} multiline={multiline} keyboardType={keyboardType} autoCapitalize={autoCapitalize} editable={editable}
            style={[styles.input, styles.text, multiline && styles.multiInput, inputStyle]} accessibilityLabel={label} />
        )}
        {secure ? (
          <Pressable onPress={() => setShow(v => !v)} hitSlop={10} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
            <Icon name={show ? 'eye-off' : 'eye'} size={22} color={colors.muted} />
          </Pressable>
        ) : select ? (right || <Icon name="chevron-down" size={22} color={colors.muted} />) : right}
      </View>
    </View>
  );
  return (
    <View style={style}>
      {label || rightLabel ? (
        <View style={styles.labelRow}>
          {label ? <AppText variant="label">{label}</AppText> : <View />}
          {rightLabel ? <Pressable onPress={onRightLabel} hitSlop={8}><AppText variant="label" color="teal">{rightLabel}</AppText></Pressable> : null}
        </View>
      ) : null}
      {select ? <Pressable onPress={onPress} accessibilityRole="button">{field}</Pressable> : field}
      {error ? <AppText variant="smallSemi" color="coralInk" style={styles.msg}>{error}</AppText> : hint ? <AppText variant="small" color="muted" style={styles.msg}>{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(8) },
  halo: { borderWidth: 3, borderColor: 'transparent', borderRadius: ms(17) },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: vs(48), borderWidth: 1.5, borderRadius: ms(14), backgroundColor: colors.white, paddingHorizontal: s(16), gap: s(8) },
  compact: { minHeight: vs(44) },
  multi: { minHeight: vs(88), alignItems: 'flex-start', paddingVertical: vs(12) },
  input: { flex: 1, paddingVertical: 0, height: '100%' },
  selectText: { flex: 1 },
  text: { fontFamily: fonts.body, fontSize: ms(15), color: colors.ink },
  multiInput: { height: undefined, textAlignVertical: 'top' },
  msg: { marginTop: vs(8) },
});
