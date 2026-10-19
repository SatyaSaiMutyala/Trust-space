/* Shown for the moment the app restores the previous session on start. */
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { colors, ms, vs } from '../../theme';

export default function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <Image source={require('../../assets/images/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors />
      <ActivityIndicator color={colors.white} style={styles.spin} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  logo: { width: ms(88), height: ms(88), borderRadius: ms(22) },
  spin: { marginTop: vs(28) },
});
