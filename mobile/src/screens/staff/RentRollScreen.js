/* Rent roll (design p.4) from GET /rent-roll: filter chips, a frozen lease column beside a horizontally scrolling grid of
   month cells, and a bottom sheet for the tapped cell. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, Header, FilterChip, RentCell, BottomSheet, Chip, Button, Skeleton, ErrorState } from '../../components';
import { useRentRollQuery, errorMessage, inr, perLabel } from '../../store/api';
import { useLookup } from '../../store/hooks';

const CELL = 40, GAP = 10, ROW_H = 60;
const KIND = { paid: 'paid', process: 'process', late: 'overdue', missing: 'notInvoiced', upcoming: 'upcoming', free: 'rentFree', na: 'upcoming' };
const WHERE = { paid: 'Paid', process: 'Invoiced, payment in process', late: 'Overdue', missing: 'Not invoiced yet', upcoming: 'Upcoming', free: 'Rent-free month', na: 'Outside the lease term' };

export default function RentRollScreen() {
  const nav = useNavigation();
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const { data, isLoading, error, refetch } = useRentRollQuery(7);
  const props = useLookup('properties');
  const d = data?.data;
  const leases = (d?.leases || []).filter(l => l.state !== 'Draft');
  const cur = d?.cur;
  const overdueOf = l => Object.values(l.cells).some(c => c.k === 'late');
  const rows = leases.filter(l => filter === 'all' || (filter === 'overdue' && overdueOf(l)) || (filter === 'co' && Object.values(l.cells).some(c => c.multi)) || (filter === 'ni' && l.cells[cur]?.k === 'missing'));
  const filters = [{ key: 'all', label: `All ${leases.length}` }, { key: 'overdue', label: `Overdue ${leases.filter(overdueOf).length}` }, { key: 'ni', label: `Not invoiced ${leases.filter(l => l.cells[cur]?.k === 'missing').length}` }, { key: 'co', label: `Co-owned ${leases.filter(l => Object.values(l.cells).some(c => c.multi)).length}` }];
  const cellOf = c => (c.multi && c.k !== 'paid' && c.n > 1 && c.paid > 0 ? { kind: 'coowners', label: `${c.paid}/${c.n}` } : { kind: KIND[c.k] || 'upcoming' });
  const selCell = sel ? sel.row.cells[sel.p] : null;
  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.pad}>
        <Header heading="Rent roll" sub={d ? `${perLabel(d.periods[0])} – ${perLabel(d.periods[d.periods.length - 1])}` : ''} />
      </View>
      {isLoading ? <View style={styles.pad}><Skeleton h={36} r={18} style={styles.skel} /><Skeleton h={300} r={18} style={styles.skel} /></View>
        : error ? <ErrorState title="Couldn't load the rent roll" body={errorMessage(error)} action="Try again" onAction={refetch} /> : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersWrap}>
              {filters.map(f => <FilterChip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />)}
            </ScrollView>
            <ScrollView style={styles.grow} showsVerticalScrollIndicator={false}>
              <View style={styles.gridRow}>
                <View style={styles.leaseCol}>
                  <AppText variant="small" color="muted" style={styles.colHead}>Lease</AppText>
                  {rows.map(r => (
                    <Pressable key={r.leaseId} style={styles.leaseCell} onPress={() => nav.navigate('PropertyDetail', { id: r.propertyId })}>
                      <AppText variant="title" numberOfLines={1}>{props.name(r.propertyId) || r.leaseId}</AppText>
                      <AppText variant="mono" color="muted" numberOfLines={1}>{inr(r.rentNow)}</AppText>
                    </Pressable>
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.months}>
                  <View>
                    <View style={styles.monthHead}>
                      {d.periods.map(p => <AppText key={p} variant="mono" color={p === cur ? 'teal' : 'muted'} center style={styles.monthLabel}>{perLabel(p).slice(0, 3)}</AppText>)}
                    </View>
                    {rows.map(r => (
                      <View key={r.leaseId} style={styles.cellRow}>
                        {d.periods.map(p => { const c = r.cells[p]; return <RentCell key={p} {...cellOf(c)} size={CELL} selected={sel?.row.leaseId === r.leaseId && sel?.p === p} onPress={c.k === 'na' ? undefined : () => setSel({ row: r, p })} style={[styles.cell, c.k === 'na' && styles.na]} />; })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.bottomSpace} />
            </ScrollView>
          </>
        )}
      <BottomSheet open={!!sel} onClose={() => setSel(null)}>
        {sel ? (
          <>
            <View style={styles.sheetHead}>
              <AppText variant="h2" style={styles.sheetTitle}>{props.name(sel.row.propertyId)}, {perLabel(sel.p)}</AppText>
              <Chip label={selCell.k === 'late' ? 'Overdue' : selCell.k === 'paid' ? 'Paid' : selCell.k === 'process' ? 'In process' : selCell.k === 'missing' ? 'Not invoiced' : selCell.k === 'free' ? 'Rent-free' : 'Upcoming'} />
            </View>
            <View style={styles.sheetTiles}>
              <View style={styles.sheetTile}><AppText variant="small" color="muted">Rent</AppText><AppText variant="monoLg" style={styles.sheetVal}>{inr(selCell.amt || sel.row.rentNow)}</AppText></View>
              <View style={[styles.sheetTile, styles.sheetTileWide]}><AppText variant="small" color="muted">Where it is</AppText><AppText variant="bodySemi" style={styles.sheetVal}>{WHERE[selCell.k]}{selCell.multi ? ` · ${selCell.paid} of ${selCell.n} co-owners paid` : ''}{selCell.out ? ` · ${inr(selCell.out)} owed` : ''}</AppText></View>
            </View>
            <View style={styles.sheetBtns}>
              <Button title="Message owner" variant="secondary" full onPress={() => { setSel(null); nav.navigate('Thread', { propertyId: sel.row.propertyId }); }} />
              <Button title={selCell.inv ? 'Open invoice' : 'Open invoices'} variant="primary" full onPress={() => { setSel(null); nav.navigate(selCell.inv ? 'ToApprove' : 'Invoices', selCell.inv ? { id: selCell.inv } : undefined); }} />
            </View>
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  skel: { marginTop: vs(14) },
  filtersWrap: { flexGrow: 0, marginTop: vs(10) },
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
  na: { opacity: 0.35 },
  bottomSpace: { height: vs(30) },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: s(12) },
  sheetTitle: { flex: 1, fontSize: ms(20) },
  sheetTiles: { flexDirection: 'row', gap: s(12), marginTop: vs(18) },
  sheetTile: { flex: 1, backgroundColor: colors.sunk, borderRadius: ms(18), padding: s(14) },
  sheetTileWide: { flex: 1.5 },
  sheetVal: { marginTop: vs(4) },
  sheetBtns: { flexDirection: 'row', gap: s(12), marginTop: vs(18) },
});
