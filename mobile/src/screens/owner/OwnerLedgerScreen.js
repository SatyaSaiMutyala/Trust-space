/* Owner's own ledger from GET /ledgers (the server scopes it to them): received this year, TDS credited, what is
   coming, then the entries month by month. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { s, vs, ms } from '../../theme';
import { Screen, AppText, Header, Tile, ListRow, Dropdown, Skeleton, ErrorState } from '../../components';
import { useLedgerQuery, useListQuery, errorMessage, inr, fmtDate, todayISO } from '../../store/api';

const fyOf = d => { const y = +d.slice(0, 4), m = +d.slice(5, 7); const a = m >= 4 ? y : y - 1; return `${String(a).slice(2)}-${String(a + 1).slice(2)}`; };

export default function OwnerLedgerScreen() {
  const [fy, setFy] = useState(fyOf(todayISO()));
  const { data, isLoading, error, refetch } = useLedgerQuery({ tab: 'Rent', fy });
  const open = useListQuery({ resource: 'invoices', params: { open: true, limit: 50 } });
  const d = data?.data;
  const coming = (open.data?.data || []).reduce((a, i) => a + (+i.net || 0), 0);
  return (
    <Screen>
      <Header heading="Ledger" sub={d ? `FY ${d.fy}` : ''} right={d ? <Dropdown value={fy} options={(d.fys || [fy]).map(f => ({ label: `FY ${f}`, value: f }))} onSelect={setFy} style={styles.fy} /> : null} />
      {isLoading ? <Skeleton h={220} r={18} style={styles.skel} /> : error ? <ErrorState title="Couldn't load your ledger" body={errorMessage(error)} action="Try again" onAction={refetch} /> : (
        <>
          <View style={styles.tiles}>
            <Tile tone="mist" label="Received" value={inr(d.totals.cr - d.totals.tds)} valueVariant="monoMd" compact style={styles.tile} />
            <Tile tone="grey" label="TDS credited" value={inr(d.totals.tds)} valueVariant="monoMd" compact style={styles.tile} />
            <Tile tone="blue" label="Coming" value={inr(coming)} valueVariant="monoMd" compact style={styles.tile} />
          </View>
          {d.rows.slice().reverse().map((r, i, arr) => <ListRow key={i} title={r.part} sub={`${fmtDate(r.d)}${r.sub ? ` · ${r.sub}` : ''}`} right={<AppText variant="monoMd" color={r.dr ? 'ink' : 'tealInk'}>{r.dr ? inr(r.dr) : `– ${inr(r.cr)}`}</AppText>} divider={i < arr.length - 1} />)}
          {!d.rows.length ? <AppText variant="body" color="muted" style={styles.none}>Nothing in this financial year yet.</AppText> : null}
          <AppText variant="small" color="muted" style={styles.note}>TDS deducted from your rent is credited to your PAN; Form 16A is under Agreements.</AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fy: { width: s(118) },
  skel: { marginTop: vs(16) },
  tiles: { flexDirection: 'row', gap: s(10), marginTop: vs(16), marginBottom: vs(8) },
  tile: { paddingHorizontal: s(12), borderRadius: ms(18) },
  none: { marginTop: vs(16) },
  note: { marginTop: vs(18) },
});
