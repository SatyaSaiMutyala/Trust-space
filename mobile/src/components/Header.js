/* Screen header row: back chevron, optional small title (muted text or mono code), right slot. Sits inside the page gutter. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import IconButton from './IconButton';

export default function Header({ title, mono, right, onBack, back = true, center, style, backVariant = 'plain', close }) {
  const nav = useNavigation();
  const goBack = onBack || (() => nav.canGoBack() && nav.goBack());
  return (
    <View style={[styles.row, style]}>
      {back ? <IconButton name={close ? 'x' : 'chevron-left'} variant={backVariant} onPress={goBack} iconSize={26} style={styles.back} accessibilityLabel="Back" /> : <View style={styles.back} />}
      {title ? (
        typeof title === 'string'
          ? <AppText variant={mono ? 'mono' : 'body'} color={backVariant === 'dark' ? 'white' : 'muted'} style={[styles.title, center && styles.center, mono && styles.monoTitle]} numberOfLines={1}>{title}</AppText>
          : <View style={[styles.title, center && styles.centerBox]}>{title}</View>
      ) : <View style={styles.title} />}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: vs(46), marginLeft: -s(10) },
  back: { marginRight: s(2) },
  title: { flex: 1, fontSize: ms(15) },
  monoTitle: { fontSize: ms(15), color: colors.muted },
  center: { textAlign: 'center' },
  centerBox: { alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: s(8), minWidth: s(10), justifyContent: 'flex-end' },
});
