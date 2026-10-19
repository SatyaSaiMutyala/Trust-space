/* Owner home (design p.15): the next payout and where it is (Sent → Checked → Approving → Paid) from the owner's open
   invoices, "Your to-do" (things waiting for the owner), this year's totals from the ledger, Form 16A link. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, HeroCard, Gauge, Tile, SectionHeader, ListRow, Icon, Skeleton, ErrorState } from '../../components';
import { useListQuery, useLedgerQuery, errorMessage, inr, perLabel, fmtDate, todayISO, useDepositRequestsQuery } from '../../store/api';
import { useLookup } from '../../store/hooks';

const fyOf = d => { const y = +d.slice(0, 4), m = +d.slice(5, 7); const a = m >= 4 ? y : y - 1; return `${String(a).slice(2)}-${String(a + 1).slice(2)}`; };
const STEP = { Submitted: 0, Verified: 1, Approved: 2, Paid: 3 };
const firstName = n => String(n || '').split(/\s+/)[0];

export default function OwnerHomeScreen() {
  const nav = useNavigation();
  const user = useAppSelector(st => st.auth.user);
  const today = todayISO();
  const open = useListQuery({ resource: 'invoices', params: { open: true, sort: 'date', order: 'desc', limit: 20 } });
  const ledger = useLedgerQuery({ tab: 'Rent', fy: fyOf(today) });
  const inspections = useListQuery({ resource: 'inspections', params: { status: 'Awaiting owner sign-off', limit: 5 } });
  const depReqs = useDepositRequestsQuery();
  const props = useLookup('properties');
  const pending = (open.data?.data || []).filter(i => i.status !== 'Rejected');
  const next = pending.sort((a, b) => STEP[b.status] - STEP[a.status] || (a.date < b.date ? 1 : -1))[0];
  const stepIx = next ? STEP[next.status] : 0;
  const logAt = (inv, re) => { const l = (inv?.log || []).filter(x => re.test(x.text)).pop(); return l ? fmtDate(l.at.slice(0, 10)).slice(0, 6) : null; };
  const steps = next ? [
    { label: 'Sent', value: fmtDate(next.date).slice(0, 6) }, { label: 'Checked', value: logAt(next, /verified/i) || (stepIx >= 1 ? 'done' : 'soon') },
    { label: 'Approving', value: stepIx >= 2 ? (logAt(next, /approved/i) || 'done') : stepIx === 1 ? 'now' : 'soon', current: stepIx === 1 }, { label: 'Paid', value: stepIx >= 3 ? fmtDate(next.paidDate || '').slice(0, 6) : 'soon', current: stepIx === 2 },
  ] : [];
  const todo = [
    ...(inspections.data?.data || []).map(i => ({ icon: 'pencil', title: `Sign the ${i.kind === 'Move-in' ? 'take-over' : 'handover'} check`, sub: props.name(i.propertyId), to: 'SignOff', params: { id: i.id } })),
    ...(depReqs.data?.data || []).filter(r => r.status === 'Proposed').map(r => ({ icon: 'credit-card', title: `Use your deposit for ${r.periodLabel} rent?`, sub: `${r.propertyName} · ${inr(r.amount)}`, to: 'DepositRequest', params: { id: r.id } })),
    ...pending.filter(i => i.status === 'Rejected').map(i => ({ icon: 'file-text', title: 'Invoice sent back', sub: `${perLabel(i.period)} · ${i.reason || 'see note'}`, to: 'OwnerInvoices' })),
  ];
  const T = ledger.data?.data?.totals;
  return (
    <Screen tabs>
      <View style={styles.top}>
        <View>
          <AppText variant="body" color="muted" style={styles.greet}>Namaskaram,</AppText>
          <AppText variant="display">{firstName(user?.name)} garu</AppText>
        </View>
      </View>
      {open.isLoading ? <Skeleton h={300} r={24} tone="mist" style={styles.hero} /> : open.error ? <ErrorState title="Couldn't load your payments" body={errorMessage(open.error)} action="Try again" onAction={open.refetch} /> : (
        <HeroCard arch arcs="none" style={styles.hero} padding={false}>
          <View style={styles.heroInner}>
            <Gauge width={220} stroke={11} value={next ? (stepIx + 1) / 4 : 1} color={colors.white} track="rgba(255,255,255,0.28)" knob={next && stepIx < 3 ? colors.amber : undefined}>
              <AppText variant="monoXl" color="white" style={styles.amount}>{next ? inr(next.net) : inr(0)}</AppText>
              <AppText variant="body" color={colors.onTealMuted} style={styles.heroSub}>{next ? (next.status === 'Paid' ? `paid on ${fmtDate(next.paidDate || '')}` : `coming to you${next.dueDate ? ` by ${fmtDate(next.dueDate).slice(0, 6)}` : ''}`) : 'nothing pending'}</AppText>
            </Gauge>
            {next ? (
              <View style={styles.stepsRow}>
                {steps.map(st => (
                  <View key={st.label} style={styles.step}>
                    <AppText variant="small" color={st.current ? colors.amber : colors.onTealMuted} center style={styles.stepLabel}>{st.label}</AppText>
                    <AppText variant="smallSemi" color={st.current ? colors.amber : colors.white} center style={styles.stepVal}>{st.value}</AppText>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.heroLine} />
            <AppText variant="body" color={colors.onTealMuted} center style={styles.note}>{next ? `${perLabel(next.period)} ${next.type.toLowerCase()}, ${props.name(next.propertyId)}, after TDS` : 'All your invoices are paid.'}</AppText>
          </View>
        </HeroCard>
      )}
      {todo.length ? (
        <>
          <SectionHeader title="Your to-do" />
          <View style={styles.tiles}>{todo.slice(0, 2).map(t => <Tile key={t.title} tone="amber" icon={t.icon} title={t.title} sub={t.sub} subTone="amber" subWeight="regular" onPress={() => nav.navigate(t.to, t.params)} />)}</View>
        </>
      ) : null}
      <SectionHeader title="This year" />
      <Pressable style={styles.year} onPress={() => nav.navigate('OwnerLedger')} accessibilityRole="button" accessibilityLabel="Open ledger">
        {[['Received', T ? inr(T.cr - T.tds) : '—'], ['TDS credited', T ? inr(T.tds) : '—']].map(([l, v], i) => (
          <View key={l} style={[styles.yearCol, i === 0 && styles.yearDivider]}>
            <AppText variant="body" color="muted">{l}</AppText>
            <AppText variant="monoLg" style={styles.yearVal}>{v}</AppText>
          </View>
        ))}
      </Pressable>
      <ListRow left={<View style={styles.dl}><Icon name="download" size={22} color={colors.teal} /></View>} title="Form 16A and agreements" sub="TDS certificates, lease documents" chevron onPress={() => nav.navigate('Agreements')} divider={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: vs(10) },
  greet: { fontSize: ms(15) },
  hero: { marginTop: vs(20) },
  heroInner: { alignItems: 'center', paddingTop: vs(46), paddingBottom: vs(20), paddingHorizontal: s(18) },
  amount: { marginTop: vs(26), fontSize: ms(30) },
  heroSub: { marginTop: vs(2), fontSize: ms(15) },
  stepsRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: vs(8) },
  step: { flex: 1 },
  stepLabel: { fontSize: ms(13.5) },
  stepVal: { marginTop: vs(2), fontSize: ms(14.5) },
  heroLine: { alignSelf: 'stretch', height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: vs(18), marginBottom: vs(14) },
  note: { fontSize: ms(15) },
  tiles: { flexDirection: 'row', gap: s(12) },
  year: { flexDirection: 'row', borderWidth: 1.5, borderColor: colors.line, borderRadius: ms(20), overflow: 'hidden' },
  yearCol: { flex: 1, padding: s(16), paddingVertical: vs(18) },
  yearDivider: { borderRightWidth: 1.5, borderRightColor: colors.line },
  yearVal: { marginTop: vs(4) },
  dl: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
