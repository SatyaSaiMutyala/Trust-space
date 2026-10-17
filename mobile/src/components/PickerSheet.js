/* Pick one option from a bottom sheet list (states, banks, properties, months). options: strings or { label, value }. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, ms, s, vs } from '../theme';
import AppText from './AppText';
import BottomSheet from './BottomSheet';
import Icon from './Icon';

export default function PickerSheet({ open, onClose, title, options, value, onSelect, searchable }) {
  const [q, setQ] = useState('');
  const items = options.map(o => (typeof o === 'string' ? { label: o, value: o } : o)).filter(o => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <BottomSheet open={open} onClose={onClose} title={title} scroll>
      {searchable ? (
        <View style={styles.search}>
          <Icon name="search" size={20} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
      ) : null}
      {items.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => { onSelect(o.value); onClose(); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.row, on && styles.on]}>
            <AppText variant="body" weight={on ? 'semibold' : undefined} color={on ? 'teal' : 'ink'} style={styles.flex}>{o.label}</AppText>
            {on ? <Icon name="check" size={20} color={colors.teal} strokeWidth={2.4} /> : null}
          </Pressable>
        );
      })}
      {!items.length ? <AppText variant="body" color="muted" center style={styles.none}>Nothing matches “{q}”.</AppText> : null}
      <View style={styles.bottom} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: s(10), backgroundColor: colors.sunk, borderRadius: ms(14), height: vs(46), paddingHorizontal: s(14), marginBottom: vs(8) },
  input: { flex: 1, fontFamily: fonts.body, fontSize: ms(15), color: colors.ink, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(14), paddingHorizontal: s(6), borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  on: { backgroundColor: colors.tealTint, borderRadius: ms(12), paddingHorizontal: s(12), borderBottomWidth: 0 },
  flex: { flex: 1 },
  none: { marginVertical: vs(24) },
  bottom: { height: vs(16) },
});
