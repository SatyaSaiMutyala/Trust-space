/* Checkbox with label. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export default function Checkbox({ checked, onChange, label, style }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!checked }} onPress={() => onChange && onChange(!checked)} style={[styles.row, style]}>
      <View style={[styles.box, checked && styles.on]}>{checked ? <Icon name="check" size={18} color={colors.white} strokeWidth={2.8} /> : null}</View>
      {label ? <AppText variant="body" style={styles.label}>{label}</AppText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  box: { width: ms(24), height: ms(24), borderRadius: ms(6), borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.teal, borderColor: colors.teal },
  label: { fontSize: ms(15) },
});
