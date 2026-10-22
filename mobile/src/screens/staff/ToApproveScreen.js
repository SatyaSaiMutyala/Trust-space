/* To approve (design p.7): the queue of verified invoices (or the one opened from a list), one card at a time with the
   Submitted → Verified → You → Paid tracker, breakdown, checks and the verifier's note. Swipe to approve (PATCH status
   Approved), ✕ to reject with a reason, Undo, Next invoice. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs, gutter, shadows } from '../../theme';
import { Screen, AppText, Header, Stepper, Avatar, Icon, Footer, Button, SwipeToApprove, KeyValueRow, Skeleton, ErrorState, EmptyState, BottomSheet, Input, Chip } from '../../components';
import { useListQuery, useOneQuery, usePatchRecordMutation, errorMessage, inr, perLabel, fmtDate } from '../../store/api';
import { useLookup } from '../../store/hooks';
import { useAppSelector } from '../../store/hooks';

const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const STEPS = { Submitted: 1, Verified: 2, Approved: 3, Paid: 4, Rejected: 0 };

export default function ToApproveScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const user = useAppSelector(st => st.auth.user);
  const wanted = route.params?.id;
  const queue = useListQuery({ resource: 'invoices', params: { status: 'Verified', sort: 'date', order: 'asc', limit: 50 } });
  const single = useOneQuery({ resource: 'invoices', id: wanted }, { skip: !wanted });
  const owners = useLookup('owners'); const props = useLookup('properties');
  const [patch, patchState] = usePatchRecordMutation();
  const [i, setI] = useState(0);
  const [done, setDone] = useState({}); // id → 'Approved' | 'Rejected' (this session, so the card stays visible for Undo)
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const base = queue.data?.data || [];
  const list = wanted && single.data?.data ? [single.data.data, ...base.filter(x => x.id !== wanted)] : base;
  const inv = list[i];
  const loading = queue.isLoading || (wanted && single.isLoading);
  const error = queue.error || single.error;
  const O = inv ? owners.byId[inv.ownerId] : null;
  const state = inv ? done[inv.id] || inv.status : null;
  const stepOf = st => ({ Submitted: 1, Verified: 2, Approved: 3, Paid: 4 }[st] || 0);
  const steps = inv ? ['Submitted', 'Verified', 'You', 'Paid'].map((label, k) => ({ label, state: k + 1 < stepOf(state) || (k + 1 === 3 && state === 'Approved') || (k + 1 <= 3 && state === 'Paid') ? 'done' : k + 1 === stepOf(state) + (state === 'Verified' ? 1 : 0) && state !== 'Paid' && state !== 'Approved' ? 'current' : 'todo' })) : [];
  const verified = inv ? (inv.log || []).filter(l => /verified/i.test(l.text)).pop() : null;
  const checks = inv ? [['Agreement', !!inv.leaseId], ['GSTIN', !!O?.gstin || inv.gst === 0], ['Bank', !!O?.bankVerified], ['PAN', !!O?.pan]] : [];
  const passed = checks.filter(c => c[1]).length;
  const act = async (status, text, extra = {}) => {
    setErr('');
    try {
      await patch({ resource: 'invoices', id: inv.id, body: { status, ...extra, log: [...(inv.log || []), { at: new Date().toISOString(), by: user?.name || 'Staff', text }] } }).unwrap();
      setDone(d => ({ ...d, [inv.id]: status }));
    } catch (e) { setErr(errorMessage(e)); }
  };
  const approve = () => act('Approved', 'Approved for payment');
  const undo = () => act('Verified', 'Approval undone');
  const doReject = async () => { if (reason.trim().length < 5) return; await act('Rejected', `Rejected: ${reason.trim()}`, { reason: reason.trim() }); setReject(false); setReason(''); };
  const next = () => { if (i < list.length - 1) setI(i + 1); else nav.goBack(); };
  const footer = !inv ? null : state === 'Approved' || state === 'Rejected' ? (
    <View style={styles.doneRow}>
      <View style={[styles.doneIcon, state === 'Rejected' && styles.doneIconBad]}><Icon name={state === 'Rejected' ? 'x' : 'check'} size={24} color={state === 'Rejected' ? colors.coral : colors.teal} strokeWidth={2.4} /></View>
      <View style={styles.flex}>
        <AppText variant="title">{state} {inr(inv.net)}</AppText>
        {state === 'Approved' ? <Pressable onPress={undo} hitSlop={8} disabled={patchState.isLoading}><AppText variant="smallSemi" color="teal" style={styles.undo}>Undo</AppText></Pressable> : null}
      </View>
      <Button title={i < list.length - 1 ? 'Next invoice' : 'Done'} variant="primary" onPress={next} />
    </View>
  ) : state === 'Verified' ? (
    <SwipeToApprove key={inv.id} onApprove={approve} onReject={() => setReject(true)} busy={patchState.isLoading} style={styles.flex} />
  ) : (
    <View style={styles.doneRow}><AppText variant="body" color="muted" style={styles.flex}>{state === 'Submitted' ? 'Not verified yet. Accounts verify it on the web first.' : `This ${inv.voucher ? 'payment' : 'invoice'} is ${state.toLowerCase()}.`}</AppText><Button title={i < list.length - 1 ? 'Next' : 'Done'} variant="secondary" onPress={next} /></View>
  );
  return (
    <Screen bg="canvas" padded={false} footer={footer ? <Footer hint={err || undefined} hintColor="coralInk">{footer}</Footer> : null}>
      <View style={styles.pad}>
        <Header heading="To approve" right={list.length ? <AppText variant="mono" color="muted" style={styles.count}>{i + 1} of {list.length}</AppText> : null} />
      </View>
      {loading ? <View style={styles.stackWrap}><Skeleton h={360} r={24} /></View>
        : error ? <ErrorState title="Couldn't load the invoices" body={errorMessage(error)} action="Try again" onAction={queue.refetch} />
          : !inv ? <EmptyState title="Nothing to approve" body="Every verified invoice has been approved. New ones appear here once Accounts verify them." />
            : (
              <View style={styles.stackWrap}>
                {i < list.length - 1 ? <View style={[styles.ghost, styles.ghost1]} /> : null}
                {i < list.length - 2 ? <View style={[styles.ghost, styles.ghost2]} /> : null}
                <View style={[styles.card, shadows.card]}>
                  <View style={styles.stepperBox}><Stepper ring="amber" steps={steps} /></View>
                  <View style={styles.body}>
                    <View style={styles.ownerRow}>
                      <Avatar initials={initials(O?.name)} size={44} />
                      <View style={styles.flex}>
                        <AppText variant="title">{O?.name || inv.ownerId}</AppText>
                        <AppText variant="small" color="muted" style={styles.ownerSub}>{props.name(inv.propertyId)}{inv.voucher ? ' · co-share rent payment, no GST' : inv.source === 'Generated' ? ' · generated from the lease' : ''}</AppText>
                      </View>
                      {state === 'Rejected' ? <Chip label="Rejected" tone="coral" /> : null}
                    </View>
                    <AppText variant="body" color="muted" style={styles.period}>{perLabel(inv.period)} {inv.voucher ? 'rent payment' : inv.type.toLowerCase()}, net payable · {inv.number}</AppText>
                    <AppText variant="monoXxl" style={styles.net} numberOfLines={1} adjustsFontSizeToFit>{inr(inv.net)}</AppText>
                    <KeyValueRow label={inv.type === 'Rent' ? 'Rent' : inv.type} value={inr(inv.base)} />
                    {inv.gst ? <KeyValueRow label="GST 18%" value={`+ ${inr(inv.gst)}`} /> : inv.rcm ? <KeyValueRow label="GST under RCM (paid by us)" value={inr(inv.rcm)} /> : null}
                    {inv.tds ? <KeyValueRow label={`TDS ${inv.tdsRate || 10}%`} value={`– ${inr(inv.tds)}`} valueColor={colors.coral} /> : null}
                    <View style={styles.checks}>
                      <View style={[styles.checkIcon, passed < checks.length && styles.checkIconWarn]}><Icon name={passed === checks.length ? 'check' : 'alert-circle'} size={18} color={colors.white} strokeWidth={2.6} /></View>
                      <View style={styles.flex}>
                        <AppText variant="title">{passed} of {checks.length} checks passed</AppText>
                        <AppText variant="small" color="muted" style={styles.checksSub}>{checks.map(([l, ok]) => (ok ? l : `${l} ✕`)).join(', ')}</AppText>
                      </View>
                    </View>
                    {verified ? <AppText variant="body" color="muted" style={styles.note}>Verified by {verified.by} on {fmtDate(verified.at.slice(0, 10))}.</AppText> : null}
                    {inv.desc ? <AppText variant="small" color="muted" style={styles.note}>{inv.desc}</AppText> : null}
                    {inv.dueDate ? <AppText variant="small" color="muted" style={styles.note}>Due {fmtDate(inv.dueDate)}</AppText> : null}
                  </View>
                </View>
              </View>
            )}
      <BottomSheet open={reject} onClose={() => setReject(false)} title="Reject invoice">
        <AppText variant="body" color="muted">Tell the owner what is wrong. They see this reason.</AppText>
        <Input value={reason} onChangeText={setReason} multiline placeholder="e.g. GST number on the invoice does not match the registration" autoCapitalize="sentences" style={styles.reasonField} />
        <View style={styles.sheetBtns}>
          <Button title="Keep it" variant="secondary" full onPress={() => setReject(false)} />
          <Button title="Reject" variant="coralSolid" full onPress={doReject} disabled={reason.trim().length < 5} loading={patchState.isLoading} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  count: { fontSize: ms(15) },
  stackWrap: { marginTop: vs(28), paddingHorizontal: gutter },
  ghost: { position: 'absolute', left: gutter, right: gutter, height: vs(40), borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24), backgroundColor: '#DCEBE7' },
  ghost1: { top: -vs(10), left: gutter + s(10), right: gutter + s(10) },
  ghost2: { top: -vs(20), left: gutter + s(20), right: gutter + s(20), backgroundColor: '#E6F0ED' },
  card: { backgroundColor: colors.white, borderRadius: ms(24), overflow: 'hidden' },
  stepperBox: { backgroundColor: colors.tealTint, paddingVertical: vs(18), paddingHorizontal: s(10) },
  body: { paddingHorizontal: s(18), paddingVertical: vs(16) },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  ownerSub: { marginTop: vs(2), fontSize: ms(13.5) },
  period: { marginTop: vs(16), fontSize: ms(15) },
  net: { marginTop: vs(4), marginBottom: vs(8) },
  checks: { flexDirection: 'row', alignItems: 'center', gap: s(12), backgroundColor: colors.sunk, borderRadius: ms(18), padding: s(14), marginTop: vs(16) },
  checkIcon: { width: ms(28), height: ms(28), borderRadius: ms(14), backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  checkIconWarn: { backgroundColor: colors.amber },
  checksSub: { marginTop: vs(2), fontSize: ms(13.5) },
  note: { marginTop: vs(12), fontSize: ms(14.5) },
  flex: { flex: 1 },
  doneRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(14) },
  doneIcon: { width: ms(48), height: ms(48), borderRadius: ms(24), backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  doneIconBad: { backgroundColor: colors.coralTint },
  undo: { marginTop: vs(2) },
  reasonField: { marginTop: vs(14) },
  sheetBtns: { flexDirection: 'row', gap: s(12), marginTop: vs(16) },
});
