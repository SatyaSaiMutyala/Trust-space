/* List row: left slot (count, avatar, thumbnail), title + sub, right slot (chevron, chip, value). Divider under it. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, s, vs, ms } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export default function ListRow({ left, title, sub, subColor = 'muted', right, chevron, onPress, divider = true, style, titleVariant = 'title', align = 'center', children }) {
  const Wrap = onPress ? Pressable : View;
  const rowStyle = [styles.row, divider && styles.divider, { alignItems: align }, style];
  return (
    <Wrap onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={onPress ? ({ pressed }) => [...rowStyle, pressed && styles.pressed] : rowStyle}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.body}>
        {typeof title === 'string' ? <AppText variant={titleVariant} numberOfLines={2}>{title}</AppText> : title}
        {typeof sub === 'string' ? <AppText variant="small" color={subColor} style={styles.sub} numberOfLines={2}>{sub}</AppText> : sub}
        {children}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {chevron ? <Icon name="chevron-right" size={22} color={colors.muted} /> : null}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: vs(12), gap: s(12) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  left: { justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center' },
  sub: { marginTop: vs(2), fontSize: ms(13.5) },
  right: { justifyContent: 'center', alignItems: 'flex-end', gap: vs(6) },
  pressed: { opacity: 0.8 },
});
