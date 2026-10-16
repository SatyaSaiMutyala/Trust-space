/* All text in the app goes through AppText so fonts and sizes stay consistent. variant: h1 h2 h3 body small eyebrow mono. */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../theme';

export default function AppText({ variant = 'body', color = 'ink', center, style, ...rest }) {
  return <Text style={[typography[variant], { color: colors[color] }, center && styles.center, style]} {...rest} />;
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
