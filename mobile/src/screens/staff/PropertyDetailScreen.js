/* Property detail (design p.5): arched photo with back / more, code, name, address, chips, tabs, summary tiles,
   owners list, sticky Raise ticket / Start inspection. Other tabs show lease facts, ledgers, repairs, inspections. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, Arch, IconButton, Chip, Tile, Avatar, ListRow, Footer, Button, Icon, KeyValueRow, SectionHeader, EmptyState } from '../../components';
import { property } from '../../mock/data';

function Tabs({ tabs, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsWrap}>
      {tabs.map(t => {
        const on = t === value;
        return (
          <Pressable key={t} onPress={() => onChange(t)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, on && styles.tabOn]}>
            <AppText variant="title" color={on ? 'white' : 'muted'}>{t}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function PropertyDetailScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('Summary');
  const p = property;
  return (
    <Screen padded={false} edges={['left', 'right']} footer={(
      <Footer>
        <Button title="Raise ticket" variant="secondary" full onPress={() => nav.navigate('RaiseTicket')} />
        <Button title="Start inspection" variant="primary" full onPress={() => nav.navigate('AreaPhotos')} />
      </Footer>
    )}>
      <View style={styles.photoWrap}>
        <Arch photo height={260} ratio={0} flat={false} style={styles.photo}>
          <View style={styles.plan}>
            {[0, 1, 2].map(i => <View key={i} style={[styles.planCell, i === 1 && styles.planMid]} />)}
          </View>
          <View style={styles.photosChip}><AppText variant="smallSemi" color="white">{p.photos} photos</AppText></View>
        </Arch>
        <View style={[styles.photoBar, { top: insets.top + vs(7) }]}>
          <IconButton name="chevron-left" variant="light" onPress={() => nav.goBack()} accessibilityLabel="Back" />
        </View>
      </View>
      <View style={styles.pad}>
        <AppText variant="mono" color="muted" center style={styles.code}>{p.code}, {p.kind}</AppText>
        <AppText variant="h1" center style={styles.name}>{p.name}</AppText>
        <AppText variant="body" color="muted" center style={styles.addr}>{p.address}</AppText>
        <View style={styles.chips}>{p.chips.map(c => <Chip key={c.label} {...c} />)}</View>
      </View>
      <Tabs tabs={p.tabs} value={tab} onChange={setTab} />
      <View style={styles.pad}>
        {tab === 'Summary' ? (
          <>
            <View style={styles.tiles}><Tile {...p.tiles[0]} compact /><Tile {...p.tiles[1]} compact /></View>
            <View style={styles.tiles}><Tile {...p.tiles[2]} compact /><Tile {...p.tiles[3]} compact /></View>
            <SectionHeader title="Owners" />
            {p.owners.map((o, i) => (
              <ListRow key={o.name} left={<Avatar initials={o.initials} tone={o.tone || 'teal'} size={46} />} title={o.name} sub={o.sub}
                right={<IconButton name="message" variant="mist" size={44} iconSize={22} onPress={() => nav.navigate('Thread')} accessibilityLabel={`Message ${o.name}`} />} divider={i < p.owners.length - 1} />
            ))}
          </>
        ) : tab === 'Lease' ? (
          <View style={styles.section}>{p.lease.map(r => <KeyValueRow key={r.label} label={r.label} value={r.value} mono={false} />)}</View>
        ) : tab === 'Ledgers' ? (
          <View style={styles.section}>{p.ledgers.map((r, i) => <ListRow key={i} title={r.label} sub={r.sub} right={<><AppText variant="monoMd">{r.value}</AppText><Chip label={r.chip} tone={r.tone} size="sm" /></>} />)}</View>
        ) : tab === 'Repairs' ? (
          <View style={styles.section}>{p.repairs.map(r => <ListRow key={r.code} title={r.title} sub={`${r.code} · ${r.sub}`} right={<Chip label={r.chip} tone={r.tone} size="sm" />} chevron onPress={() => nav.navigate('TicketDetail')} />)}</View>
        ) : tab === 'Inspections' ? (
          <View style={styles.section}>{p.inspections.map(r => <ListRow key={r.title} title={r.title} sub={r.sub} right={<Chip label={r.chip} tone={r.tone} size="sm" />} chevron onPress={() => nav.navigate('SignOff')} />)}</View>
        ) : (
          <EmptyState title="Contracts are coming soon" body="Signed agreements and annexures will appear here." />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { paddingHorizontal: gutter, paddingTop: 0 },
  photo: { width: '100%' },
  plan: { position: 'absolute', left: '17%', right: '17%', top: '36%', bottom: 0, flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderBottomWidth: 0 },
  planCell: { flex: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  planMid: { borderTopWidth: 1, marginTop: '35%' },
  photosChip: { position: 'absolute', alignSelf: 'center', bottom: vs(18), backgroundColor: 'rgba(16,32,30,0.78)', borderRadius: ms(14), paddingHorizontal: s(14), paddingVertical: vs(8) },
  photoBar: { position: 'absolute', left: gutter - s(10), right: gutter - s(10), flexDirection: 'row', justifyContent: 'space-between' }, // same x as the Header's back chevron on other screens
  pad: { paddingHorizontal: gutter },
  code: { marginTop: vs(18), fontSize: ms(14.5) },
  name: { marginTop: vs(6) },
  addr: { marginTop: vs(8), fontSize: ms(15) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: s(8), marginTop: vs(14) },
  tabsWrap: { flexGrow: 0, marginTop: vs(18) },
  tabs: { paddingHorizontal: gutter, gap: s(6) },
  tab: { paddingHorizontal: s(18), height: vs(36), borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.ink },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(12) },
  section: { marginTop: vs(8) },
});
