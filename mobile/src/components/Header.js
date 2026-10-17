/* Screen header row: back chevron, the screen title beside it (`heading`, with an optional small `sub` line under it),
   or a small muted `title` label; `right` slot for actions. Sits inside the page gutter. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import IconButton from './IconButton';

export default function Header({ heading, sub, title, mono, right, onBack, back = true, center, style, backVariant = 'plain', close }) {
  const nav = useNavigation();
  const goBack = onBack || (() => nav.canGoBack() && nav.goBack());
  const light = backVariant === 'dark';
  return (
    <View style={[styles.row, style]}>
      {back ? <IconButton name={close ? 'x' : 'chevron-left'} variant={backVariant} onPress={goBack} iconSize={26} style={styles.back} accessibilityLabel="Back" /> : <View style={styles.back} />}
      <View style={[styles.body, center && styles.centerBox]}>
        {heading ? <AppText variant="display" color={light ? 'white' : 'ink'} numberOfLines={2} style={[styles.heading, center && styles.center]}>{heading}</AppText> : null}
        {heading && sub ? <AppText variant="small" color={light ? colors.onTealMuted : 'muted'} numberOfLines={1} style={[styles.sub, center && styles.center]}>{sub}</AppText> : null}
        {!heading && title ? (
          typeof title === 'string'
            ? <AppText variant={mono ? 'mono' : 'body'} color={light ? 'white' : 'muted'} style={[styles.title, center && styles.center]} numberOfLines={1}>{title}</AppText>
            : title
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: vs(46), marginLeft: -s(10), paddingVertical: vs(4) },
  back: { marginRight: s(2) },
  body: { flex: 1, justifyContent: 'center' },
  heading: { fontSize: ms(21), lineHeight: ms(26) },
  sub: { marginTop: vs(1) },
  title: { fontSize: ms(15) },
  center: { textAlign: 'center' },
  centerBox: { alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: s(8), minWidth: s(10), justifyContent: 'flex-end' },
});
