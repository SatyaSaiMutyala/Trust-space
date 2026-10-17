/* Simple list screens reached from "All sections": Properties, Site scouting, Leases, Exits, Owners, Rent & invoices,
   Deposits. Same shape: header, title, search, rows with a status chip. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Icon, ListRow, Chip, Avatar, Arch, Tile, Button } from '../../components';
import { propertiesList, sitesList, leasesList, exitsList, ownersList, invoicesList } from '../../mock/data';

function AddButton({ to, title }) {
  const nav = useNavigation();
  return <Button title={title} variant="tonal" size="sm" icon="plus" onPress={() => nav.navigate(to)} />;
}

function ListPage({ title, eyebrow, items, placeholder, renderRow, action }) {
  const nav = useNavigation();
  return (
    <Screen>
      <Header right={action} />
      {eyebrow ? <AppText variant="body" color="muted" style={styles.eyebrow}>{eyebrow}</AppText> : null}
      <AppText variant="display" style={styles.title}>{title}</AppText>
      <Pressable style={styles.search} onPress={() => nav.navigate('Search')} accessibilityRole="search">
        <Icon name="search" size={22} color={colors.muted} />
        <AppText variant="body" color="muted" style={styles.searchText}>{placeholder}</AppText>
      </Pressable>
      {items.map((it, i) => renderRow(it, i, nav, i < items.length - 1))}
    </Screen>
  );
}

export const PropertiesScreen = () => (
  <ListPage title="Properties" eyebrow="38, 2 in fit-out" placeholder="Search by name or code" items={propertiesList}
    renderRow={(p, i, nav, div) => <ListRow key={p.code} left={<Arch photo width={56} height={62} bottomRadius={12} />} title={p.name} sub={`${p.code} · ${p.sub}`} right={<Chip label={p.chip} tone={p.tone} size="sm" />} chevron onPress={() => nav.navigate('PropertyDetail')} divider={div} />} />
);

export const SiteScoutingScreen = () => (
  <ListPage title="Site scouting" eyebrow="15 in pipeline, 2 waiting for approval" placeholder="Search sites" items={sitesList}
    action={<AddButton to="AddSite" title="Add site" />}
    renderRow={(x, i, nav, div) => <ListRow key={x.title} left={<Arch photo width={56} height={62} bottomRadius={12} />} title={x.title} sub={x.sub} right={<Chip label={x.chip} tone={x.tone} size="sm" />} chevron onPress={() => nav.navigate(x.to)} divider={div} />} />
);

export const LeasesScreen = () => (
  <ListPage title="Leases" eyebrow="36 active, 2 drafts" placeholder="Search leases" items={leasesList}
    renderRow={(x, i, nav, div) => <ListRow key={x.title} title={x.title} sub={x.sub} right={<Chip label={x.chip} tone={x.tone} size="sm" />} chevron onPress={() => nav.navigate('PropertyDetail')} divider={div} />} />
);

export const ExitsScreen = () => (
  <ListPage title="Exits" eyebrow="2 in notice" placeholder="Search exits" items={exitsList}
    renderRow={(x, i, nav, div) => <ListRow key={x.title} title={x.title} sub={x.sub} right={<Chip label={x.chip} tone={x.tone} size="sm" />} chevron onPress={() => nav.navigate('SignOff')} divider={div} />} />
);

export const OwnersScreen = () => (
  <ListPage title="Owners" eyebrow="41, 2 without PAN" placeholder="Search owners" items={ownersList}
    renderRow={(o, i, nav, div) => <ListRow key={o.name} left={<Avatar initials={o.initials} tone={o.tone || 'teal'} size={46} />} title={o.name} sub={o.sub} right={o.chip ? <Chip label={o.chip} tone={o.tone} size="sm" /> : null} chevron onPress={() => nav.navigate('Thread')} divider={div} />} />
);

export const InvoicesScreen = () => (
  <ListPage title="Rent & invoices" eyebrow="7 waiting for you" placeholder="Search invoices" items={invoicesList}
    action={<Button title="Approve 5" variant="tonal" size="sm" onPress={() => {}} />}
    renderRow={(x, i, nav, div) => <ListRow key={x.title + i} title={x.title} sub={x.sub} right={<><AppText variant="monoMd">{x.amount}</AppText><Chip label={x.chip} tone={x.tone} size="sm" /></>} onPress={() => nav.navigate('ToApprove')} divider={div} />} />
);

export function DepositsScreen() {
  const nav = useNavigation();
  return (
    <Screen>
      <Header />
      <AppText variant="body" color="muted" style={styles.eyebrow}>36 leases</AppText>
      <AppText variant="display" style={styles.title}>Deposits</AppText>
      <View style={styles.tiles}>
        <Tile tone="mist" label="Held" value="₹1,92,00,000" compact />
        <Tile tone="amber" label="Adjusted this FY" value="₹3,36,000" compact />
      </View>
      {propertiesList.map((p, i) => (
        <ListRow key={p.code} title={p.name} sub={`${p.code} · ${p.sub}`} right={<AppText variant="monoMd">{['₹28,80,000', '₹11,10,000', '₹1,68,000', '₹3,72,000', '₹5,70,000'][i]}</AppText>} chevron onPress={() => nav.navigate('PropertyDetail')} divider={i < propertiesList.length - 1} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: ms(15) },
  title: { marginTop: vs(2) },
  search: { flexDirection: 'row', alignItems: 'center', gap: s(14), backgroundColor: colors.sunk, borderRadius: ms(18), height: vs(52), paddingHorizontal: s(18), marginTop: vs(16), marginBottom: vs(6) },
  searchText: { fontSize: ms(15) },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(16), marginBottom: vs(8) },
});
