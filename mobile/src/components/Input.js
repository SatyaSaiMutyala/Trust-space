/* Labelled text field with optional hint and error message. */
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, hitSize, ms, radius, spacing, typography } from '../theme';
import AppText from './AppText';

export default function Input({ label, hint, error, style, ...rest }) {
  return (
    <View style={styles.field}>
      <AppText variant="small" color="muted" style={styles.label}>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.idle}
        style={[styles.input, !!error && styles.inputError, style]}
        {...rest}
      />
      {error ? <AppText variant="small" color="bad">{error}</AppText> : hint ? <AppText variant="small" color="muted">{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontWeight: '600' },
  input: { ...typography.body, fontSize: ms(16), minHeight: hitSize, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.ink },
  inputError: { borderColor: colors.bad },
});
