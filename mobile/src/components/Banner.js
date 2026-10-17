/* <Banner> — full-width deep-teal notice (offline). <Toast> — dark floating message with an icon. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, s, vs, shadows } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export function Banner({ icon = 'wifi-off', lead, text, style }) {
  return (
    <View style={[styles.banner, style]}>
      <Icon name={icon} size={22} color={colors.amber} />
      <AppText variant="small" color="white" style={styles.flex}><AppText variant="smallSemi" color="white">{lead} </AppText>{text}</AppText>
    </View>
  );
}

export function Toast({ icon = 'alert-circle', lead, text, style }) {
  return (
    <View style={[styles.toast, shadows.float, style]}>
      <Icon name={icon} size={22} color={colors.white} />
      <AppText variant="small" color="white" style={styles.flex}><AppText variant="smallSemi" color="white">{lead} </AppText>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: s(12), backgroundColor: colors.deepTeal, paddingHorizontal: s(20), paddingVertical: vs(14) },
  toast: { flexDirection: 'row', alignItems: 'flex-start', gap: s(12), backgroundColor: colors.ink, borderRadius: ms(18), paddingHorizontal: s(16), paddingVertical: vs(14) },
  flex: { flex: 1 },
});
