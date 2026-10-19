/* Owner deposit request (design p.18) from GET /mobile/deposit-requests: the question, the teal share card with the
   deposit bar, the breakdown, who has agreed, Agree / Decline (POST …/agree | …/decline). With no id it shows the
   first request waiting, then the others. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, KeyValueRow, Chip, Footer, Button, Skeleton, ErrorState, EmptyState, ListRow, BottomSheet, Input } from '../../components';
import { useDepositRequestsQuery, useDepositAnswerMutation, errorMessage, inr, fmtDate } from '../../store/api';

const TONE = { Proposed: 'amber', Agreed: 'teal', Declined: 'coral', Cancelled: 'grey' };
const LABEL = { Proposed: 'Waiting', Agreed: 'Agreed', Declined: 'Declined', Cancelled: 'Withdrawn' };

export default function DepositRequestScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { data, isLoading, error, refetch } = useDepositRequestsQuery();
  const [answer, aState] = useDepositAnswerMutation();
  const [sel, setSel] = useState(route.params?.id || null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const list = data?.data || [];
  const d = list.find(x => x.id === sel) || list.find(x => x.status === 'Proposed') || list[0];
  const others = list.filter(x => d && x.id !== d.id);
  const act = async (action, body) => {
    setErr('');
    try { await answer({ leaseId: d.leaseId, id: d.id, action, body }).unwrap(); setDeclineOpen(false); setReason(''); if (action === 'agree') nav.goBack(); }
    catch (e) { setErr(errorMessage(e)); }
  };
  const dep = d?.deposit;
  return (
    <Screen footer={d && d.status === 'Proposed' ? (
      <Footer stacked hint={err || undefined} hintColor="coralInk">
        <Button title="Agree" variant="primary" onPress={() => act('agree')} loading={aState.isLoading} />
        <Button title="Decline" variant="secondary" onPress={() => setDeclineOpen(true)} style={styles.decline} />
      </Footer>
    ) : null}>
      {isLoading ? <><Header heading="Deposit request" /><Skeleton h={180} r={24} style={styles.card} /></>
        : error ? <><Header heading="Deposit request" /><ErrorState title="Couldn't load the request" body={errorMessage(error)} action="Try again" onAction={refetch} /></>
          : !d ? <><Header heading="Deposit requests" /><EmptyState title="No deposit requests" body="When the tenant proposes to settle a month's rent from your deposit, it appears here for you to agree or decline." /></> : (
            <>
              <Header heading={d.status === 'Proposed' ? `Use your deposit for ${d.periodLabel} rent?` : `${d.periodLabel} rent from your deposit`} sub={`${d.propertyName}${d.noticeServed ? ', notice period' : ''}`} right={<Chip label={LABEL[d.status]} tone={TONE[d.status]} size="sm" />} />
              <AppText variant="body" color="muted" style={styles.body}>{d.noticeServed && d.vacateBy ? `The tenant leaves on ${fmtDate(d.vacateBy)}. ` : ''}Instead of paying {d.periodLabel}'s rent{d.invoice ? ` (${d.invoice.number})` : ''}, {d.status === 'Proposed' ? 'it asks to use the deposit you already hold.' : d.status === 'Agreed' ? 'you agreed to settle it from the deposit you hold.' : 'you asked for the rent to be paid as usual.'}{d.note ? ` ${d.note}` : ''}</AppText>
              <View style={styles.card}>
                <View style={styles.shareRow}>
                  <AppText variant="body" color={colors.onTealMuted} style={styles.cardLabel}>{d.multi ? 'Your share' : 'This month'}</AppText>
                  <AppText variant="monoXl" color="white">{inr(d.amount)}</AppText>
                </View>
                <View style={[styles.shareRow, styles.holdRow]}>
                  <AppText variant="body" color={colors.onTealMuted} style={styles.cardLabel}>Deposit you hold</AppText>
                  <AppText variant="monoMd" color="white">{inr(dep.held)}{d.status === 'Proposed' ? ` → ${inr(dep.afterThis)}` : ''}</AppText>
                </View>
                <View style={styles.bar}><View style={[styles.stays, { flex: Math.max(0.02, dep.staysPct) }]} /><View style={[styles.used, { flex: Math.max(0.02, 1 - dep.staysPct) }]} /></View>
                <View style={styles.legend}>
                  <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.white }]} /><AppText variant="small" color={colors.onTealMuted}>Stays with you</AppText></View>
                  <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.amber }]} /><AppText variant="small" color={colors.onTealMuted}>Used for rent</AppText></View>
                </View>
              </View>
              <View style={styles.rows}>
                <KeyValueRow label="Your deposit at start" value={inr(dep.share)} size="lg" />
                {dep.usedAgreed ? <KeyValueRow label="Used for earlier months" value={`– ${inr(dep.usedAgreed)}`} size="lg" /> : null}
                {d.status === 'Proposed' ? <KeyValueRow label={`Used for ${d.periodLabel}, this request`} value={`– ${inr(d.amount)}`} size="lg" /> : null}
                {dep.damage ? <KeyValueRow label="Agreed damage" value={`– ${inr(dep.damage)}`} size="lg" /> : null}
                {d.tds ? <KeyValueRow label="TDS deducted by the tenant" value={inr(d.tds)} size="lg" /> : null}
                <KeyValueRow label={d.noticeServed ? 'Refund after handover' : 'Deposit left'} value={inr(dep.refund)} bold size="lg" divider={false} />
              </View>
              {d.parties.length > 1 ? (
                <View style={styles.parties}>
                  {d.parties.map((p, i) => (
                    <View key={p.ownerId} style={[styles.party, i < d.parties.length - 1 && styles.partyDivider]}>
                      <AppText variant="body" style={styles.partyName}>{p.name}</AppText>
                      <Chip label={p.status === 'Proposed' ? (p.name === 'You' ? 'Waiting for you' : 'Waiting') : LABEL[p.status] || p.status} tone={TONE[p.status] || 'grey'} />
                    </View>
                  ))}
                </View>
              ) : null}
              {others.length ? (
                <View style={styles.others}>
                  <AppText variant="eyebrow" color="muted" style={styles.othersHead}>OTHER REQUESTS</AppText>
                  {others.map((x, i) => <ListRow key={x.id} title={`${x.periodLabel} · ${x.propertyName}`} sub={inr(x.amount)} right={<Chip label={LABEL[x.status]} tone={TONE[x.status]} size="sm" />} chevron onPress={() => setSel(x.id)} divider={i < others.length - 1} />)}
                </View>
              ) : null}
            </>
          )}
      <BottomSheet open={declineOpen} onClose={() => setDeclineOpen(false)} title="Decline this request">
        <AppText variant="body" color="muted">The tenant will pay the rent as usual. You can add a note for them.</AppText>
        <Input value={reason} onChangeText={setReason} multiline placeholder="Optional note" autoCapitalize="sentences" style={styles.reason} />
        <Button title="Decline" variant="danger" full onPress={() => act('decline', { reason: reason.trim() })} loading={aState.isLoading} style={styles.reason} />
        {err ? <AppText variant="small" color="coralInk" center style={styles.reason}>{err}</AppText> : null}
        <View style={styles.space} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: vs(10), fontSize: ms(15) },
  card: { backgroundColor: colors.teal, borderRadius: ms(24), padding: s(20), marginTop: vs(20) },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(8) },
  holdRow: { marginTop: vs(14) },
  cardLabel: { fontSize: ms(15) },
  bar: { flexDirection: 'row', height: vs(12), borderRadius: 6, overflow: 'hidden', marginTop: vs(12) },
  stays: { backgroundColor: colors.white },
  used: { backgroundColor: colors.amber },
  legend: { flexDirection: 'row', gap: s(16), marginTop: vs(10) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(3) },
  rows: { marginTop: vs(18) },
  parties: { backgroundColor: colors.sunk, borderRadius: ms(20), marginTop: vs(10), paddingHorizontal: s(16) },
  party: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(14) },
  partyDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  partyName: { fontSize: ms(15) },
  others: { marginTop: vs(20) },
  othersHead: { marginBottom: vs(6) },
  decline: { marginTop: vs(12) },
  reason: { marginTop: vs(12) },
  space: { height: vs(8) },
});
