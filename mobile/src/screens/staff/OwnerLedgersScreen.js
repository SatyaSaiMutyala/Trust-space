/* Owner ledgers (staff) from GET /ledgers: pick an owner and financial year; tiles and the running entries. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, s, vs, ms } from '../../theme';
import { Screen, AppText, Header, ErrorState, ListRow, Tile, Dropdown, Skeleton } from '../../components';
import { useLedgerQuery, errorMessage, inr, fmtDate, todayISO } from '../../store/api';
import { useLookup } from '../../store/hooks';

const fyOf = d => { const y = +d.slice(0, 4), m = +d.slice(5, 7); const a = m >= 4 ? y : y - 1; return `${String(a).slice(2)}-${String(a + 1).slice(2)}`; };

export default function OwnerLedgersScreen() {
  const owners = useLookup('owners');
  const [ownerId, setOwnerId] = useState('');
  const [fy, setFy] = useState(fyOf(todayISO()));
  const { data, isLoading, error, refetch } = useLedgerQuery({ tab: 'Rent', fy, ...(ownerId ? { ownerId } : {}) });
  const d = data?.data;
  return (
    <Screen>
      <Header heading="Owner ledgers" sub={d ? `FY ${d.fy} · ${d.totals.invoices} invoice${d.totals.invoices === 1 ? '' : 's'}` : ''} />
      <View style={styles.pickers}>
        <Dropdown value={ownerId} options={[{ label: 'All owners', value: '' }, ...owners.list.map(o => ({ label: o.name, value: o.id }))]} onSelect={setOwnerId} searchable style={styles.flex} />
        <Dropdown value={fy} options={(d?.fys || [fy]).map(f => ({ label: `FY ${f}`, value: f }))} onSelect={setFy} style={styles.fy} />
      </View>
      {isLoading ? <Skeleton h={220} r={18} style={styles.skel} /> : error ? <ErrorState title="Couldn't load this ledger" body={errorMessage(error)} action="Try again" onAction={refetch} /> : (
        <>
          <View style={styles.tiles}>
            <Tile tone="grey" label="Invoiced" value={inr(d.totals.dr)} valueVariant="monoMd" compact />
            <Tile tone="mist" label="Paid" value={inr(d.totals.cr - d.totals.tds)} valueVariant="monoMd" compact />
          </View>
          <View style={styles.tiles}>
            <Tile tone="grey" label="TDS deducted" value={inr(d.totals.tds)} valueVariant="monoMd" compact />
            <Tile tone={d.totals.closing > 0 ? 'amber' : 'mist'} label="Payable to owner" value={inr(d.totals.closing)} valueVariant="monoMd" compact />
          </View>
          <AppText variant="small" color="muted" style={styles.opening}>Opening balance on {fmtDate(d.from)}: {inr(d.opening)}</AppText>
          {d.rows.slice().reverse().map((r, i, arr) => <ListRow key={i} title={r.part} sub={`${fmtDate(r.d)}${r.sub ? ` · ${r.sub}` : ''}`} right={<AppText variant="monoMd" color={r.dr ? 'ink' : 'tealInk'}>{r.dr ? inr(r.dr) : `– ${inr(r.cr)}`}</AppText>} divider={i < arr.length - 1} />)}
          {!d.rows.length ? <AppText variant="body" color="muted" style={styles.none}>No rent entries in this period.</AppText> : null}
          <AppText variant="small" color="muted" style={styles.note}>The CSV statement downloads from the web.</AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickers: { flexDirection: 'row', gap: s(10), marginTop: vs(14), zIndex: 2 },
  flex: { flex: 1 },
  fy: { width: s(118) },
  skel: { marginTop: vs(16) },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(12) },
  opening: { marginTop: vs(16), marginBottom: vs(4), fontSize: ms(13.5) },
  none: { marginTop: vs(16) },
  note: { marginTop: vs(18), color: colors.muted },
});
