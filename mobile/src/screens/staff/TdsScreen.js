/* TDS (design p.10) from GET /tds/report: Monthly / Challans / Returns / PAN, the three tiles, the "late" card with
   Record challan, the register, the next return card. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Segmented, Tile, Button, Chip, ListRow, SectionHeader, Card, Icon, Dropdown, Skeleton, ErrorState } from '../../components';
import { useTdsReportQuery, errorMessage, inr, perLabel, fmtDate } from '../../store/api';
import { useLookup } from '../../store/hooks';

const TONE = { Deposited: 'teal', 'Deposited late': 'amber', Due: 'amber', Overdue: 'coral', Nil: 'grey', 'Not due': 'grey', Filed: 'teal', 'Not filed': 'amber', Issued: 'teal' };
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));

export default function TdsScreen() {
  const nav = useNavigation();
  const [tab, setTab] = useState('monthly');
  const [fy, setFy] = useState(undefined);
  const { data, isLoading, error, refetch } = useTdsReportQuery(fy);
  const owners = useLookup('owners');
  const R = data?.data;
  const rows = R ? R.rows.filter(r => r.ded || r.dep || r.m <= R.today.slice(0, 7)) : [];
  const ded = rows.reduce((a, r) => a + r.ded, 0), dep = rows.reduce((a, r) => a + r.dep, 0);
  const od = rows.filter(r => r.st === 'Overdue');
  const late = od[0];
  const nextRet = R ? R.quarters.find(q => q.es?.length && q.st !== 'Filed') : null;
  return (
    <Screen>
      <Header heading="TDS" right={R ? <Dropdown value={R.fy} options={R.fys.map(f => ({ label: `FY ${f}`, value: f }))} onSelect={setFy} style={styles.fy} /> : null} />
      <Segmented value={tab} onChange={setTab} style={styles.seg} options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Challans', value: 'challans' }, { label: 'Returns', value: 'returns' }, { label: 'PAN', value: 'pan' }]} />
      {isLoading ? <><Skeleton h={80} r={18} style={styles.skel} /><Skeleton h={160} r={22} style={styles.skel} /></>
        : error ? <ErrorState title="Couldn't load TDS" body={errorMessage(error)} action="Try again" onAction={refetch} />
          : tab === 'monthly' ? (
            <>
              <View style={styles.tiles}>
                <Tile tone="grey" label="Deducted" value={inr(ded)} valueVariant="monoMd" compact style={styles.tile} />
                <Tile tone="mist" label="Deposited" value={inr(dep)} valueVariant="monoMd" compact style={styles.tile} />
                <Tile tone={od.length ? 'coral' : 'grey'} label="Overdue" value={inr(od.reduce((a, r) => a + r.bal, 0))} valueVariant="monoMd" valueColor={od.length ? colors.coralInk : undefined} compact style={styles.tile} />
              </View>
              {late ? (
                <View style={styles.late}>
                  <AppText variant="h3" color="white">{MONTHS_LONG[+late.m.slice(5, 7) - 1]} is {daysBetween(late.due, R.today)} days late</AppText>
                  <View style={styles.lateRow}>
                    {[['To deposit', inr(late.bal)], ['Was due', fmtDate(late.due)], ['Interest', inr(late.late)]].map(([l, v]) => (
                      <View key={l} style={styles.lateCol}><AppText variant="small" color="#F8D5C5">{l}</AppText><AppText variant="monoMd" color="white">{v}</AppText></View>
                    ))}
                  </View>
                  <Button title="Record challan" variant="white" color={colors.coral} onPress={() => nav.navigate('RecordChallan', { month: late.m, amount: late.bal, interest: late.late, ws: R.ws })} style={styles.record} />
                </View>
              ) : null}
              <SectionHeader title="Register" action={!late ? 'Record challan' : undefined} onAction={() => nav.navigate('RecordChallan', { ws: R.ws })} />
              {rows.slice().reverse().map((r, i, arr) => (
                <ListRow key={r.m} divider={i < arr.length - 1}
                  title={<AppText variant="title" style={styles.month}>{perLabel(r.m)}{r.m === R.today.slice(0, 7) ? <AppText variant="body" color="muted"> so far</AppText> : null}</AppText>}
                  sub={<AppText variant="small" color={r.st === 'Overdue' || r.st === 'Deposited late' ? 'coralInk' : 'muted'} style={styles.sub}>{r.st === 'Deposited' || r.st === 'Deposited late' ? `Paid ${fmtDate((r.cs[r.cs.length - 1] || {}).paidOn || '')}${r.late ? `, interest ${inr(r.late)}` : ''}` : r.st === 'Nil' ? 'Nothing deducted' : `Due ${fmtDate(r.due)}`}</AppText>}
                  right={<View style={styles.rowRight}><AppText variant="monoMd">{inr(r.ded)}</AppText><Chip label={r.st} tone={TONE[r.st] || 'grey'} size="sm" style={styles.chip} /></View>} />
              ))}
              {nextRet ? (
                <Card outlined style={styles.q2} onPress={() => setTab('returns')}>
                  <View style={styles.q2Row}>
                    <View style={styles.q2Icon}><Icon name="calendar" size={22} color={colors.amberInk} /></View>
                    <View style={styles.flex}>
                      <AppText variant="title">Q{nextRet.q} return {nextRet.st === 'Overdue' ? 'was due' : 'due'} {fmtDate(nextRet.due)}</AppText>
                      <AppText variant="small" color="muted" style={styles.sub}>{nextRet.st}{nextRet.ded > nextRet.dep + 1 ? ` · ${inr(nextRet.ded - nextRet.dep)} not yet deposited` : ''} · Form 16A issued {nextRet.issued || 0} of {nextRet.es?.length ? new Set(nextRet.es.map(e => e.ownerId)).size : 0}</AppText>
                    </View>
                    <Icon name="chevron-right" size={22} color={colors.muted} />
                  </View>
                </Card>
              ) : null}
            </>
          ) : tab === 'challans' ? (
            <View style={styles.list}>
              {R.challans.length ? R.challans.map((c, i) => <ListRow key={c.id} title={perLabel(c.month)} sub={`${c.challanNo ? `Challan ${c.challanNo}` : 'Challan'}${c.bsr ? ` · BSR ${c.bsr}` : ''} · paid ${fmtDate(c.paidOn)}${c.interest ? ` · interest ${inr(c.interest)}` : ''}`} right={<AppText variant="monoMd">{inr(c.amount)}</AppText>} divider={i < R.challans.length - 1} />) : <AppText variant="body" color="muted">No challans recorded this year.</AppText>}
              <Button title="Record challan" variant="tonal" size="md" icon="plus" onPress={() => nav.navigate('RecordChallan', { ws: R.ws })} style={styles.add} />
            </View>
          ) : tab === 'returns' ? (
            <View style={styles.list}>
              {R.quarters.map((q, i) => <ListRow key={q.q} title={`Q${q.q} (${perLabel(q.ms[0].m).slice(0, 3)} – ${perLabel(q.ms[q.ms.length - 1].m).slice(0, 3)})`} sub={`${q.st === 'Filed' ? `Filed ${fmtDate(q.filedOn || '')}${q.ack ? ` · ack ${q.ack}` : ''}` : `Due ${fmtDate(q.due)}`} · deducted ${inr(q.ded)}, deposited ${inr(q.dep)}`} right={<Chip label={q.st} tone={TONE[q.st] || 'grey'} />} divider={i < R.quarters.length - 1} />)}
              <AppText variant="small" color="muted" style={styles.note}>Returns are filed and Form 16A issued on the web.</AppText>
            </View>
          ) : (
            <View style={styles.list}>
              {owners.list.map((o, i) => <ListRow key={o.id} title={o.name} sub={o.pan ? `${o.pan} · ${o.panStatus || 'not verified'}${o.panCheckedOn ? ` on ${fmtDate(o.panCheckedOn)}` : ''}` : 'No PAN on file · TDS at 20%'} right={<Chip label={o.pan ? o.panStatus || 'Not verified' : 'Missing'} tone={!o.pan ? 'coral' : o.panStatus === 'Valid' ? 'teal' : 'amber'} />} divider={i < owners.list.length - 1} />)}
            </View>
          )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fy: { width: s(120) },
  seg: { marginTop: vs(14) },
  skel: { marginTop: vs(14) },
  tiles: { flexDirection: 'row', gap: s(10), marginTop: vs(14) },
  tile: { paddingHorizontal: s(12), borderRadius: ms(18) },
  late: { backgroundColor: colors.coral, borderRadius: ms(24), padding: s(18), marginTop: vs(14) },
  lateRow: { flexDirection: 'row', marginTop: vs(14), gap: s(10) },
  lateCol: { flex: 1 },
  record: { marginTop: vs(16) },
  month: { fontSize: ms(17) },
  sub: { marginTop: vs(2), fontSize: ms(13.5) },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  chip: { minWidth: s(92), justifyContent: 'center' },
  q2: { marginTop: vs(20) },
  q2Row: { flexDirection: 'row', alignItems: 'center', gap: s(14) },
  q2Icon: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.amberTint, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  list: { marginTop: vs(8) },
  add: { marginTop: vs(16), alignSelf: 'flex-start' },
  note: { marginTop: vs(14) },
});
