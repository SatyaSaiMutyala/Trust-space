/* Select field whose options open inline, directly under the field (no sheet). options: strings or { label, value }.
   `searchable` adds a filter box for long lists (banks, states). Closes on pick or on tapping the field again. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';
import Input from './Input';

export default function Dropdown({ label, value, options, onSelect, placeholder = 'Pick one', searchable, error, hint, style, maxHeight = 220 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const all = options.map(o => (typeof o === 'string' ? { label: o, value: o } : o));
  const items = all.filter(o => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  const current = all.find(o => o.value === value);
  return (
    <View style={style}>
      <Input label={label} select value={current ? current.label : ''} placeholder={placeholder} onPress={() => { setOpen(v => !v); setQ(''); }} error={error} hint={open ? undefined : hint} right={<Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />} />
      {open ? (
        <View style={styles.panel}>
          {searchable ? (
            <View style={styles.search}>
              <Icon name="search" size={18} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.muted} style={styles.searchInput} autoFocus />
            </View>
          ) : null}
          <ScrollView style={{ maxHeight: vs(maxHeight) }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {items.map((o, i) => {
              const on = o.value === value;
              return (
                <Pressable key={o.value} onPress={() => { onSelect(o.value); setOpen(false); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.row, i < items.length - 1 && styles.divider, on && styles.on]}>
                  <AppText variant="body" weight={on ? 'semibold' : undefined} color={on ? 'teal' : 'ink'} style={styles.flex}>{o.label}</AppText>
                  {on ? <Icon name="check" size={18} color={colors.teal} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
            {!items.length ? <AppText variant="small" color="muted" center style={styles.none}>Nothing matches “{q}”.</AppText> : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: vs(6), borderWidth: 1.5, borderColor: colors.line, borderRadius: ms(14), backgroundColor: colors.white, overflow: 'hidden' },
  search: { flexDirection: 'row', alignItems: 'center', gap: s(8), paddingHorizontal: s(14), height: vs(42), borderBottomWidth: 1, borderBottomColor: colors.lineSoft, backgroundColor: colors.sunk },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: ms(14.5), color: colors.ink, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(11), paddingHorizontal: s(14) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  on: { backgroundColor: colors.tealTint },
  flex: { flex: 1 },
  none: { paddingVertical: vs(14) },
});
