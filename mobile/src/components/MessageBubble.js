/* Chat bubble. side: in (white, left) | out (teal, right). Optional image placeholder and meta line. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import { PhotoGradient } from './Arch';

export default function MessageBubble({ side = 'in', text, image, meta, style }) {
  const out = side === 'out';
  return (
    <View style={[styles.bubble, out ? styles.out : styles.in, style]}>
      <AppText variant="body" color={out ? 'white' : 'ink'} style={styles.text}>{text}</AppText>
      {image ? <View style={styles.image}><PhotoGradient /></View> : null}
      {meta ? <AppText variant="small" color={out ? colors.onTealMuted : 'muted'} style={styles.meta}>{meta}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '78%', borderRadius: ms(22), paddingHorizontal: s(14), paddingVertical: vs(12) },
  in: { alignSelf: 'flex-start', backgroundColor: colors.white, borderBottomLeftRadius: ms(6) },
  out: { alignSelf: 'flex-end', backgroundColor: colors.teal, borderBottomRightRadius: ms(6) },
  text: { fontSize: ms(15), lineHeight: ms(24) },
  image: { height: vs(120), borderRadius: ms(14), overflow: 'hidden', marginTop: vs(10), backgroundColor: colors.photo },
  meta: { marginTop: vs(8) },
});
