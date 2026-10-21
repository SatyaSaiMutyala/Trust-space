/* Property detail (design p.5) from the server: GET /properties/:id, the property's latest lease and its schedule,
   rent status, ledger, tickets and inspections. Tabs Summary / Lease / Ledgers / Repairs / Inspections / Contracts. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, Arch, IconButton, Chip, Tile, Avatar, ListRow, Footer, Button, KeyValueRow, SectionHeader, EmptyState, Skeleton, ErrorState } from '../../components';
import { useOneQuery, useListQuery, useScheduleQuery, useRentStatusQuery, useLedgerQuery, useStartInspectionMutation, errorMessage, inr, perLabel, fmtDate, leaseState, todayISO } from '../../store/api';
import { useLookup } from '../../store/hooks';

const TABS = ['Summary', 'Lease', 'Ledgers', 'Repairs', 'Inspections', 'Contracts'];
const PSTAT_TONE = { Active: 'teal', 'Under fit-out': 'blue', Pipeline: 'grey', 'Notice served': 'amber', Vacated: 'coral' };
const PRI_TONE = { P1: 'coral', P2: 'amber', P3: 'blue', P4: 'grey' };
const INSP_TONE = { Signed: 'teal', 'In progress': 'blue', 'Awaiting owner sign-off': 'amber', Disputed: 'coral', 'Not started': 'grey' };
const INSP_LABEL = { Signed: 'Completed', 'Awaiting owner sign-off': 'Owner to sign' };
const fyOf = d => { const y = +d.slice(0, 4), m = +d.slice(5, 7); const a = m >= 4 ? y : y - 1; return `${String(a).slice(2)}-${String(a + 1).slice(2)}`; };
const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

function Tabs({ value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsWrap}>
      {TABS.map(t => {
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
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const id = route.params?.id;
  const [tab, setTab] = useState(route.params?.tab || 'Summary');
  const today = todayISO(); const CUR = today.slice(0, 7);
  const prop = useOneQuery({ resource: 'properties', id }, { skip: !id });
  const leases = useListQuery({ resource: 'leases', params: { propertyId: id, sort: 'start', order: 'desc', limit: 5 } }, { skip: !id });
  const L = leases.data?.data?.[0];
  const sched = useScheduleQuery(L?.id, { skip: !L });
  const status = useRentStatusQuery();
  const ledger = useLedgerQuery({ tab: 'Rent', fy: fyOf(today), propertyId: id }, { skip: !id || tab !== 'Ledgers' });
  const tickets = useListQuery({ resource: 'tickets', params: { propertyId: id, sort: 'createdAt', order: 'desc', limit: 20 } }, { skip: !id });
  const inspections = useListQuery({ resource: 'inspections', params: { propertyId: id, sort: 'date', order: 'desc', limit: 20 } }, { skip: !id || tab !== 'Inspections' });
  const [startInsp, startState] = useStartInspectionMutation();
  const [inspErr, setInspErr] = useState('');
  // take-over at possession; handover once notice is served (the server returns the open record of that kind if one exists)
  const startInspection = async () => {
    if (!L) return;
    setInspErr('');
    try { const r = await startInsp({ leaseId: L.id, kind: L.exit?.noticeDate && (inspections.data?.data || []).some(x => x.kind === 'Move-in' && x.status === 'Signed') ? 'Move-out' : 'Move-in' }).unwrap(); nav.navigate('InspectionHub', { id: r.data.inspection.id }); }
    catch (e) { setInspErr(errorMessage(e)); }
  };
  const owners = useLookup('owners');
  const P = prop.data?.data;
  const S = sched.data?.data;
  const rowNow = S?.rows.find(r => r.p === CUR) || S?.rows[S.rows.length - 1];
  const rentNow = rowNow ? rowNow.rate : L ? +L.rent : 0;
  const rs = status.data?.data?.byProperty?.[id];
  const openTickets = (tickets.data?.data || []).filter(t => !['Resolved', 'Closed'].includes(t.status));
  const leaseOwners = S?.owners?.length ? S.owners : L ? [{ ownerId: L.ownerId, share: { rent: 100 } }] : P?.owners?.length ? P.owners.map(o => ({ ownerId: o.ownerId, share: { rent: o.share } })) : P?.ownerId ? [{ ownerId: P.ownerId, share: { rent: 100 } }] : [];
  const st = L ? leaseState(L, today) : null;
  const chips = P ? [{ label: P.status, tone: PSTAT_TONE[P.status] || 'grey' }, ...(rs ? [{ label: rs.v, tone: rs.k === 'ok' ? 'teal' : rs.k === 'bad' ? 'coral' : rs.k === 'warn' ? 'amber' : rs.k === 'info' ? 'blue' : 'grey' }] : []), ...(openTickets.length ? [{ label: `${openTickets.length} open repair${openTickets.length === 1 ? '' : 's'}`, tone: 'amber' }] : [])] : [];
  const paidFY = ledger.data?.data?.totals ? ledger.data.data.totals.cr - ledger.data.data.totals.tds : null;
  return (
    <Screen padded={false} edges={['left', 'right']} footer={(
      <Footer>
        <Button title="Raise ticket" variant="secondary" full onPress={() => nav.navigate('RaiseTicket', { propertyId: id })} />
        <Button title="Start inspection" variant="primary" full onPress={startInspection} loading={startState.isLoading} disabled={!L || L.status === 'Draft'} />
      </Footer>
    )}>
      <View style={styles.photoWrap}>
        <Arch photo height={260} ratio={0} flat={false} style={styles.photo}>
          <View style={styles.plan}>{[0, 1, 2].map(i => <View key={i} style={[styles.planCell, i === 1 && styles.planMid]} />)}</View>
          {P?.photos?.length ? <View style={styles.photosChip}><AppText variant="smallSemi" color="white">{P.photos.length} photo{P.photos.length === 1 ? '' : 's'}</AppText></View> : null}
        </Arch>
        <View style={[styles.photoBar, { top: insets.top + vs(7) }]}>
          <IconButton name="chevron-left" variant="light" onPress={() => nav.goBack()} accessibilityLabel="Back" />
        </View>
      </View>
      {prop.isLoading ? <View style={styles.pad}><Skeleton w="50%" h={14} style={styles.skel} /><Skeleton w="80%" h={24} style={styles.skel} /><Skeleton h={88} r={18} style={styles.skel} /></View>
        : prop.error ? <ErrorState title="Couldn't load this property" body={errorMessage(prop.error)} action="Try again" onAction={prop.refetch} /> : (
          <>
            <View style={styles.pad}>
              <AppText variant="mono" color="muted" center style={styles.code}>{P.code}, {P.type}</AppText>
              <AppText variant="h1" center style={styles.name}>{P.name}</AppText>
              <AppText variant="body" color="muted" center style={styles.addr}>{[P.address, P.city].filter(Boolean).join(', ')}{P.floors ? `. ${P.floors}` : ''}{P.area ? `, ${(+P.area).toLocaleString('en-IN')} sq ft` : ''}</AppText>
              <View style={styles.chips}>{chips.map(c => <Chip key={c.label} {...c} />)}</View>
            </View>
            <Tabs value={tab} onChange={setTab} />
            <View style={styles.pad}>
              {tab === 'Summary' ? (
                <>
                  <View style={styles.tiles}><Tile tone="mist" label="Monthly rent" value={inr(rentNow)} compact /><Tile tone="grey" label="Deposit" value={inr(L?.deposit || 0)} sub={L && !L.depositPaid ? 'Not paid yet' : undefined} compact /></View>
                  <View style={styles.tiles}><Tile tone="grey" label="Lease" value={st || 'No lease'} valueVariant="h3" sub={L ? `${fmtDate(L.start)} – ${fmtDate(L.end)}` : undefined} compact /><Tile tone={rs?.k === 'bad' ? 'coral' : rs?.k === 'warn' ? 'amber' : 'blue'} label="Rent this month" value={rs?.v || '—'} valueVariant="h3" sub={rs?.note} subWeight="regular" compact /></View>
                  <SectionHeader title={leaseOwners.length > 1 ? `Owners · ${leaseOwners.length} co-owners` : 'Owner'} />
                  {leaseOwners.length ? leaseOwners.map((o, i) => { const O = owners.byId[o.ownerId]; return (
                    <ListRow key={o.ownerId} left={<Avatar initials={initials(O?.name)} tone={i ? 'mist' : 'teal'} size={46} />} title={O?.name || o.ownerId} sub={`${o.active === false ? `No longer an owner since ${perLabel(o.until)} · ` : leaseOwners.length > 1 ? `${Math.round(+o.share?.rent || 0)}% of rent · ` : ''}${O?.gstin ? 'GST registered' : 'No GST'} · ${O?.pan ? `PAN ${O.panStatus || 'on file'}` : 'no PAN, TDS 20%'}`}
                      right={<IconButton name="message" variant="mist" size={44} iconSize={22} onPress={() => nav.navigate('Thread', { propertyId: id, ownerId: o.ownerId })} accessibilityLabel={`Message ${O?.name || 'owner'}`} />} divider={i < leaseOwners.length - 1} />
                  ); }) : <AppText variant="body" color="muted">No owner linked yet.</AppText>}
                </>
              ) : tab === 'Lease' ? (
                !L ? <EmptyState title="No lease yet" body="Set up the lease on the web once the agreement is signed." /> : (
                  <View style={styles.section}>
                    {[['Reference', L.ref], ['Term', `${fmtDate(L.start)} – ${fmtDate(L.end)}`], ['Monthly rent now', inr(rentNow)], ['Escalation', (L.rentSteps || []).length ? `${L.rentSteps.length} change${L.rentSteps.length === 1 ? '' : 's'} as per the agreement` : L.escEvery && (L.escType === 'Amount' ? L.escAdd > 0 : L.escPct > 0) ? `${L.escType === 'Amount' ? inr(L.escAdd) : `${L.escPct}%`} every ${L.escEvery} months${L.escType === 'Amount' ? ' (fixed amount)' : ` (${L.escType || 'Compound'})`}` : 'None'], ...((L.extensions || []).length ? [['Extended', `to ${fmtDate(L.extensions[L.extensions.length - 1].toEnd)}${+L.extensions[L.extensions.length - 1].rent > 0 ? `, rent ${inr(L.extensions[L.extensions.length - 1].rent)} from ${fmtDate(L.extensions[L.extensions.length - 1].rentFrom)}` : ''}`]] : []), ['Lock-in', L.lockIn || L.lockInLessor ? `Lessee ${L.lockIn || 0} mo · Lessor ${L.lockInLessor ?? L.lockIn ?? 0} mo` : '—'], ['Notice period', L.notice ? `Lessee ${L.notice} mo · Lessor ${L.noticeLessor ?? L.notice} mo` : '—'], ['Security deposit', `${inr(L.deposit)}${L.depositPaid ? (L.depositChannel || L.depositBank ? ` · paid${L.depositChannel ? ' by ' + L.depositChannel : ''}${L.depositBank ? ' from ' + L.depositBank : ''}` : '') : ' (not paid)'}${L.depositUtr ? ` · ${L.depositUtr}` : ''}`], ['Maintenance', L.maint ? `${inr(L.maint)}/mo` : 'None'], ['GST', L.gstMode || 'None'], ['TDS', L.tds ? 'Deducted' : 'Not applicable'], ['Rent due', `Day ${L.dueDay || 5}, ${L.payTiming === 'Arrears' ? 'in arrears' : 'in advance'}`], ['Fit-out period', L.fitout ? `${L.fitout} days rent-free` : 'None'], ...(L.exit?.noticeDate ? [['Notice served', fmtDate(L.exit.noticeDate)], ['Vacate by', fmtDate(L.exit.effective)]] : [])].map(([k, v]) => <KeyValueRow key={k} label={k} value={v} mono={false} />)}
                    {S ? <AppText variant="small" color="muted" style={styles.note}>Whole term: rent {inr(S.tot.rent)}, TDS {inr(S.tot.tds)}, net {inr(S.tot.net)} over {S.tot.months} months.</AppText> : null}
                  </View>
                )
              ) : tab === 'Ledgers' ? (
                ledger.isLoading ? <Skeleton h={200} r={18} style={styles.skel} /> : ledger.error ? <ErrorState title="Couldn't load the ledger" body={errorMessage(ledger.error)} action="Try again" onAction={ledger.refetch} /> : (
                  <View style={styles.section}>
                    <View style={styles.tiles}><Tile tone="mist" label={`Paid FY ${fyOf(today)}`} value={inr(paidFY)} valueVariant="monoMd" compact /><Tile tone={ledger.data.data.totals.closing > 0 ? 'amber' : 'grey'} label="Balance payable" value={inr(ledger.data.data.totals.closing)} valueVariant="monoMd" compact /></View>
                    {ledger.data.data.rows.slice().reverse().slice(0, 30).map((r, i, arr) => <ListRow key={i} title={r.part} sub={`${fmtDate(r.d)}${r.sub ? ` · ${r.sub}` : ''}`} right={<AppText variant="monoMd" color={r.dr ? 'ink' : 'tealInk'}>{r.dr ? inr(r.dr) : `– ${inr(r.cr)}`}</AppText>} divider={i < arr.length - 1} />)}
                    {!ledger.data.data.rows.length ? <AppText variant="body" color="muted">No entries this financial year.</AppText> : null}
                  </View>
                )
              ) : tab === 'Repairs' ? (
                <View style={styles.section}>
                  {(tickets.data?.data || []).length ? tickets.data.data.map((t, i, arr) => <ListRow key={t.id} title={t.title} sub={`${t.no} · ${t.status}${t.assignee ? ` · ${t.assignee}` : ''}`} right={<Chip label={t.priority} tone={PRI_TONE[t.priority] || 'grey'} size="sm" />} chevron onPress={() => nav.navigate('TicketDetail', { id: t.id })} divider={i < arr.length - 1} />) : <EmptyState title="No repairs" body="Nothing has been raised for this property." action="Raise ticket" onAction={() => nav.navigate('RaiseTicket', { propertyId: id })} />}
                </View>
              ) : tab === 'Inspections' ? (
                <View style={styles.section}>
                  {inspections.isLoading ? <Skeleton h={80} r={18} style={styles.skel} /> : (inspections.data?.data || []).length ? inspections.data.data.map((r, i, arr) => <ListRow key={r.id} title={`${r.kind === 'Move-in' ? 'Take-over' : 'Handover'} inspection`} sub={`${fmtDate(r.date)}${r.inspector ? ` · ${r.inspector}` : ''}`} right={<Chip label={INSP_LABEL[r.status] || r.status} tone={INSP_TONE[r.status] || 'grey'} size="sm" />} chevron onPress={() => nav.navigate(r.status === 'Signed' || r.status === 'Awaiting owner sign-off' ? 'SignOff' : 'InspectionHub', { id: r.id })} divider={i < arr.length - 1} />) : <EmptyState title="No inspections yet" body={L && L.status !== 'Draft' ? 'Start the take-over inspection when you receive the keys.' : 'Inspections are recorded against a signed lease.'} action={L && L.status !== 'Draft' ? 'Start inspection' : undefined} onAction={startInspection} />}
                  {inspErr ? <AppText variant="small" color="coralInk" style={styles.skel}>{inspErr}</AppText> : null}
                </View>
              ) : (
                <EmptyState title="Contracts are coming soon" body="Signed agreements and annexures will appear here." />
              )}
            </View>
          </>
        )}
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
  photoBar: { position: 'absolute', left: gutter - s(10), right: gutter - s(10), flexDirection: 'row', justifyContent: 'space-between' },
  pad: { paddingHorizontal: gutter },
  skel: { marginTop: vs(14) },
  code: { marginTop: vs(18), fontSize: ms(14) },
  name: { marginTop: vs(6) },
  addr: { marginTop: vs(8), fontSize: ms(15) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: s(8), marginTop: vs(14) },
  tabsWrap: { flexGrow: 0, marginTop: vs(18) },
  tabs: { paddingHorizontal: gutter, gap: s(6) },
  tab: { paddingHorizontal: s(18), height: vs(36), borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.ink },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(12) },
  section: { marginTop: vs(8) },
  note: { marginTop: vs(14) },
});
