/* Search across properties, owners and invoices. */
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, fonts } from '../../theme';
import { Screen, AppText, Icon, IconButton, ListRow, Chip, Avatar, Arch } from '../../components';
import { propertiesList, ownersList, invoicesList } from '../../mock/data';

export default function SearchScreen() {
  const nav = useNavigation();
  const [q, setQ] = useState('');
  const n = q.trim().toLowerCase();
  const hit = x => !n || x.toLowerCase().includes(n);
  const props = propertiesList.filter(p => hit(p.name + p.code));
  const owners = ownersList.filter(o => hit(o.name));
  const invs = invoicesList.filter(x => hit(x.title + x.sub));
  return (
    <Screen>
      <View style={styles.bar}>
        <View style={styles.field}>
          <Icon name="search" size={22} color={colors.muted} />
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search properties, owners, invoices" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Search" />
        </View>
        <IconButton name="x" variant="sunk" onPress={() => nav.goBack()} accessibilityLabel="Close search" />
      </View>
      {props.length ? <AppText variant="title" color="muted" style={styles.group}>Properties</AppText> : null}
      {props.map(p => <ListRow key={p.code} left={<Arch photo width={48} height={54} bottomRadius={10} />} title={p.name} sub={p.code} right={<Chip label={p.chip} tone={p.tone} size="sm" />} chevron onPress={() => nav.navigate('PropertyDetail')} />)}
      {owners.length ? <AppText variant="title" color="muted" style={styles.group}>Owners</AppText> : null}
      {owners.map(o => <ListRow key={o.name} left={<Avatar initials={o.initials} tone={o.tone || 'teal'} size={40} />} title={o.name} sub={o.sub} chevron onPress={() => nav.navigate('Thread')} />)}
      {invs.length ? <AppText variant="title" color="muted" style={styles.group}>Invoices</AppText> : null}
      {invs.map((x, i) => <ListRow key={i} title={x.title} sub={x.sub} right={<AppText variant="monoMd">{x.amount}</AppText>} chevron onPress={() => nav.navigate('ToApprove')} />)}
      {!props.length && !owners.length && !invs.length ? <AppText variant="body" color="muted" center style={styles.none}>Nothing matches “{q}”.</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: s(10), marginTop: vs(8) },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(12), backgroundColor: colors.sunk, borderRadius: ms(18), height: vs(52), paddingHorizontal: s(16) },
  input: { flex: 1, fontFamily: fonts.body, fontSize: ms(15), color: colors.ink, paddingVertical: 0 },
  group: { marginTop: vs(22), marginBottom: vs(4) },
  none: { marginTop: vs(40) },
});
