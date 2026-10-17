/* Rent roll (design p.4): FY picker, filter chips, a frozen lease column beside a horizontally scrolling grid of
   month cells, and a bottom sheet for the tapped cell. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, Header, Icon, FilterChip, RentCell, BottomSheet, Chip, Button } from '../../components';
import { rentRoll } from '../../mock/data';

const CELL = 42, GAP = 10, ROW_H = 62;

export default function RentRollScreen() {
  const nav = useNavigation();
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const rows = rentRoll.rows.filter(r => filter === 'all' || (filter === 'overdue' && r.overdue) || (filter === 'co' && r.co) || (filter === 'ni' && r.cells.includes('notInvoiced')));
  const monthsFromMay = rentRoll.months.slice(1); // the FY starts in April; the design opens scrolled to May
  const cellProps = c => (typeof c === 'string' ? { kind: c } : c);
  const sheet = rentRoll.selected;
  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.pad}>
        <Header heading="Rent roll" right={(
          <Pressable style={styles.fy} accessibilityRole="button" accessibilityLabel="Financial year">
            <AppText variant="title">{rentRoll.fy}</AppText>
            <Icon name="chevron-down" size={20} color={colors.ink} />
          </Pressable>
        )} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersWrap}>
        {rentRoll.filters.map(f => <FilterChip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />)}
      </ScrollView>
      <ScrollView style={styles.grow} showsVerticalScrollIndicator={false}>
        <View style={styles.gridRow}>
          <View style={styles.leaseCol}>
            <AppText variant="small" color="muted" style={styles.colHead}>Lease</AppText>
            {rows.map(r => (
              <Pressable key={r.name} style={styles.leaseCell} onPress={() => nav.navigate('PropertyDetail')}>
                <AppText variant="title" numberOfLines={1}>{r.name}</AppText>
                <AppText variant="mono" color="muted" numberOfLines={1}>{r.rent}</AppText>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.months}>
            <View>
              <View style={styles.monthHead}>
                {monthsFromMay.map(m => <AppText key={m} variant="mono" color="muted" center style={styles.monthLabel}>{m}</AppText>)}
              </View>
              {rows.map(r => (
                <View key={r.name} style={styles.cellRow}>
                  {r.cells.slice(1).map((c, i) => (
                    <RentCell key={i} {...cellProps(c)} size={CELL} selected={r.selected === i + 1} onPress={() => setSel({ row: r, i })} style={styles.cell} />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={styles.bottomSpace} />
      </ScrollView>
      <BottomSheet open={!!sel} onClose={() => setSel(null)}>
        <View style={styles.sheetHead}>
          <AppText variant="h2" style={styles.sheetTitle}>{sel?.row.name === sheet.title.split(',')[0] ? sheet.title : `${sel?.row.name}, ${monthsFromMay[sel?.i || 0]} 26`}</AppText>
          <Chip label={sel?.row.overdue ? 'Overdue' : 'Paid'} />
        </View>
        <AppText variant="body" color="muted" style={styles.sheetOwner}>{sheet.owner}</AppText>
        <View style={styles.sheetTiles}>
          <View style={styles.sheetTile}><AppText variant="small" color="muted">Rent</AppText><AppText variant="monoLg" style={styles.sheetVal}>{sel?.row.rent}</AppText></View>
          <View style={[styles.sheetTile, styles.sheetTileWide]}><AppText variant="small" color="muted">Where it is</AppText><AppText variant="bodySemi" style={styles.sheetVal}>{sel?.row.overdue ? sheet.where : 'Paid on time'}</AppText></View>
        </View>
        <View style={styles.sheetBtns}>
          <Button title="Message owner" variant="secondary" full onPress={() => { setSel(null); nav.navigate('Thread'); }} />
          <Button title="Open invoices" variant="primary" full onPress={() => { setSel(null); nav.navigate('Invoices'); }} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  fy: { flexDirection: 'row', alignItems: 'center', gap: s(8), borderWidth: 2, borderColor: colors.line, borderRadius: ms(14), paddingHorizontal: s(14), height: vs(40) },
  title: { marginTop: vs(4) },
  filtersWrap: { flexGrow: 0, marginTop: vs(16) },
  filters: { paddingHorizontal: gutter, gap: s(10) },
  grow: { flex: 1, marginTop: vs(16) },
  gridRow: { flexDirection: 'row' },
  leaseCol: { width: s(136), paddingLeft: gutter, backgroundColor: colors.white, zIndex: 1 },
  colHead: { height: vs(30), fontSize: ms(13.5) },
  leaseCell: { height: vs(ROW_H), justifyContent: 'center' },
  months: { paddingLeft: s(10), paddingRight: gutter },
  monthHead: { flexDirection: 'row', height: vs(30) },
  monthLabel: { width: ms(CELL), marginRight: s(GAP), fontSize: ms(13.5) },
  cellRow: { flexDirection: 'row', height: vs(ROW_H), alignItems: 'center' },
  cell: { marginRight: s(GAP) },
  bottomSpace: { height: vs(30) },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: s(12) },
  sheetTitle: { flex: 1, fontSize: ms(21) },
  sheetOwner: { marginTop: vs(4), fontSize: ms(15) },
  sheetTiles: { flexDirection: 'row', gap: s(12), marginTop: vs(18) },
  sheetTile: { flex: 1, backgroundColor: colors.sunk, borderRadius: ms(18), padding: s(14) },
  sheetTileWide: { flex: 1.5 },
  sheetVal: { marginTop: vs(4) },
  sheetBtns: { flexDirection: 'row', gap: s(12), marginTop: vs(18) },
});
