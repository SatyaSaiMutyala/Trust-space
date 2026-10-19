/* Sign off together (design p.14): step bars, the summary (items, photos, videos, condition bar), damage and who pays
   on a handover, then the signatures: the facilities side signs and sends; the owner signs in their own app or on this
   phone with the signature pad, or raises a dispute. Needs a connection. */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, StepBars, StackedBar, SectionHeader, Chip, Footer, Button, Icon, Avatar, Card, Checkbox, Input, SignaturePad, BottomSheet, Skeleton, ErrorState, ConfirmDialog } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useInspection } from '../../store/useInspection';
import { errorMessage, inr } from '../../store/api';
import { RESP_LABEL, COND_TONE, fmtTime, kindLabel } from './inspectionUi';

const initialsOf = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

function Signature({ sig }) {
  if (!sig?.d || !sig.w || !sig.h) return null;
  return <View style={styles.sigBox}><Svg width="100%" height={vs(70)} viewBox={`0 0 ${sig.w} ${sig.h}`} preserveAspectRatio="xMidYMid meet"><Path d={sig.d} stroke={colors.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View>;
}

export default function SignOffScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const { role } = useAppSelector(st => st.auth);
  const owner = role === 'owner';
  const { view, inspection: I, isLoading, error, refetch, pending, offline, action, acting } = useInspection(id);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [sig, setSig] = useState(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(null); // { title, text, run, label, tone }
  const [err, setErr] = useState('');
  useEffect(() => { if (I && !name) setName(I.ownerRep || view?.ownerName || ''); }, [I, view, name]);
  const run = async (what, body, after) => {
    setErr('');
    try { const r = await action(what, body); setConfirm(null); setDisputeOpen(false); if (after) after(r); }
    catch (e) { setErr(errorMessage(e)); setConfirm(null); }
  };
  const sm = view?.summary; const c = sm?.counts;
  const total = c ? c.good + c.minor + c.damaged + c.missing : 0;
  const awaiting = I?.status === 'Awaiting owner sign-off';
  const signed = I?.status === 'Signed';
  const canSend = !!view?.canSubmit && !pending && !offline;
  const signOwner = () => {
    if (!name.trim()) { setErr('Type the owner’s full name.'); return; }
    if (!agree) { setErr('Tick the agreement to sign.'); return; }
    if (!sig) { setErr('Sign in the box with your finger.'); return; }
    run('sign', { name: name.trim(), agree: true, sig }, () => nav.navigate('Tabs'));
  };
  const footer = !I ? null
    : signed ? null
      : owner ? (awaiting ? <Footer><Button title="Raise dispute" variant="danger" full onPress={() => setDisputeOpen(true)} /><Button title="Sign" variant="primary" full onPress={signOwner} loading={acting} disabled={!I.ownerVideo} /></Footer> : null)
        : awaiting ? <Footer hint={I.ownerVideo ? 'The owner signs here with their finger, or in their own app.' : 'Record the owner’s confirmation video first (Videos).'} hintColor={I.ownerVideo ? 'muted' : 'amberInk'}><Button title="Reopen" variant="secondary" onPress={() => setConfirm({ title: 'Reopen for correction?', text: 'The owner can no longer sign until you send it again.', label: 'Reopen', run: () => run('reopen') })} /><Button title="Sign as owner" variant="primary" full onPress={signOwner} loading={acting} disabled={!I.ownerVideo} /></Footer>
          : <Footer hint={err || (pending ? `${pending} change${pending === 1 ? '' : 's'} still uploading from this phone` : offline ? 'Signing off needs a connection.' : view.problems.length ? `${view.problems.length} to complete: ${view.problems[0][1]}` : 'Everything is recorded.')} hintColor={err ? 'coralInk' : view.problems.length || pending || offline ? 'amberInk' : 'tealInk'} hintWeight="semibold">
              <Button title="Sign & send to owner" variant="primary" full onPress={() => setConfirm({ title: 'Sign and send to the owner?', text: 'You sign for the facilities side. The owner then signs in their app, or on this phone while you are together.', label: 'Sign & send', run: () => run('submit') })} disabled={!canSend} loading={acting} />
            </Footer>;
  return (
    <Screen footer={footer}>
      <Header heading="Sign off together" sub={view ? `${view.property?.name || ''} ${kindLabel(I.kind)}` : ''} />
      {isLoading ? <Skeleton h={220} r={22} style={styles.summary} /> : error || !view ? <ErrorState title="Couldn't open this inspection" body={error || 'Not found'} action="Try again" onAction={refetch} /> : (
        <>
          <StepBars steps={view.steps} />
          {I.status === 'Disputed' ? <View style={styles.dispute}><AppText variant="smallSemi" color="coralInk">Owner disputed: </AppText><AppText variant="small" color="coralInk">{I.dispute}</AppText></View> : null}
          <View style={styles.summary}>
            <View style={styles.summaryHead}>
              <AppText variant="h3">{view.progress.done} of {view.progress.total} items</AppText>
              <AppText variant="body" color="muted">{sm.photos} photo{sm.photos === 1 ? '' : 's'} · {sm.videos} video{sm.videos === 1 ? '' : 's'}</AppText>
            </View>
            <StackedBar parts={[{ value: c.good, color: colors.teal }, { value: c.minor, color: colors.amber }, { value: c.damaged, color: colors.coral }, { value: c.missing, color: colors.ink }, { value: Math.max(0, view.progress.total - total), color: colors.line }]} height={10} style={styles.bar} />
            <View style={styles.counts}>
              {[[c.good, 'good'], [c.minor, 'minor'], [c.damaged, 'damaged'], [c.missing, 'missing']].map(([n, l]) => (
                <AppText key={l} variant="body" color="muted"><AppText variant="bodySemi" color="ink">{n}</AppText> {l}</AppText>
              ))}
            </View>
          </View>
          {I.kind === 'Move-out' ? (
            <>
              <SectionHeader title="Damage and who pays" />
              {sm.flagged.length ? sm.flagged.map(d => (
                <View key={d.k} style={styles.damageRow}>
                  <View style={styles.flex}>
                    <AppText variant="h4" weight="semibold" style={styles.damageTitle}>{d.label}</AppText>
                    <AppText variant="body" color="muted" numberOfLines={2}>{d.cond}{d.remark ? ` · ${d.remark}` : ''}</AppText>
                  </View>
                  <Chip label={RESP_LABEL[d.resp] || 'Who pays?'} tone={d.resp === 'TrustLab' ? 'amber' : d.resp === 'Owner' ? 'blue' : d.resp ? 'teal' : 'coral'} dot={false} size="sm" />
                  {d.resp === 'TrustLab' ? <AppText variant="monoMd" style={styles.amount}>{inr(d.deduct || 0)}</AppText> : null}
                </View>
              )) : <AppText variant="body" color="muted" style={styles.none}>No damage flagged.</AppText>}
              <View style={styles.totalRow}>
                <AppText variant="h4" weight="semibold">From the deposit</AppText>
                <AppText variant="monoLg" weight="semibold">{inr(sm.ded)}</AppText>
              </View>
            </>
          ) : sm.flagged.length ? (
            <>
              <SectionHeader title="Flagged at take-over" />
              {sm.flagged.map(d => (
                <View key={d.k} style={styles.damageRow}>
                  <View style={styles.flex}><AppText variant="h4" weight="semibold" style={styles.damageTitle}>{d.label}</AppText><AppText variant="body" color="muted" numberOfLines={2}>{d.remark || ''}</AppText></View>
                  <Chip label={d.cond} tone={COND_TONE[d.cond]} size="sm" />
                </View>
              ))}
            </>
          ) : null}
          <SectionHeader title="Signatures" />
          <View style={styles.sigRow}>
            <View style={[styles.sigDone, !I.tdplSign && styles.sigTodo]}>{I.tdplSign ? <Icon name="check" size={22} color={colors.white} strokeWidth={2.6} /> : <Icon name="pencil" size={20} color={colors.muted} />}</View>
            <View style={styles.flex}>
              <AppText variant="h4" weight="semibold">{I.tdplSign ? I.tdplSign.name : I.inspector || 'Facilities inspector'}</AppText>
              <AppText variant="body" color="muted">{I.tdplSign ? `Facilities · signed ${fmtTime(I.tdplSign.at)}` : 'Facilities · not signed yet'}</AppText>
            </View>
          </View>
          <Card borderColor={signed ? colors.teal : awaiting ? colors.teal : colors.line} style={styles.ownerCard}>
            <View style={styles.sigRow}>
              <Avatar initials={initialsOf(I.ownerSign?.name || I.ownerRep || view.ownerName)} tone="mist" size={44} />
              <View style={styles.flex}>
                <AppText variant="h4" weight="semibold">{I.ownerSign?.name || I.ownerRep || view.ownerName || 'Owner'}</AppText>
                <AppText variant="body" color="muted">{signed ? `Owner · signed ${fmtTime(I.ownerSign.at)} · ${I.ownerSign.method}` : awaiting ? (owner ? 'Your signature' : 'Owner · sent to their app') : 'Owner · after you sign and send'}</AppText>
              </View>
              {awaiting && !owner ? <Chip label="Sent to app" tone="teal" dot={false} size="sm" /> : null}
            </View>
            {signed ? <Signature sig={I.ownerSign.sig} /> : awaiting ? (
              <View style={styles.signArea}>
                {!I.ownerVideo ? <AppText variant="small" color="amberInk" style={styles.padHint}>{owner ? 'Record your confirmation video first (Videos), then sign here.' : 'Record the owner’s confirmation video first, under Videos.'}</AppText> : null}
                <Input label="Full name (typed by the owner)" value={name} onChangeText={setName} autoCapitalize="words" editable={!!I.ownerVideo} />
                <Checkbox checked={agree} onChange={setAgree} label={`I inspected the premises jointly with the tenant${I.date ? ` on ${I.date}` : ''} and agree that this record, with its photos, reflects their condition.`} style={styles.agree} />
                <SignaturePad value={sig} onChange={setSig} height={140} style={styles.pad} />
              </View>
            ) : null}
          </Card>
          {err ? <AppText variant="small" color="coralInk" style={styles.err}>{err}</AppText> : null}
        </>
      )}
      <BottomSheet open={disputeOpen} onClose={() => setDisputeOpen(false)} title="Raise a dispute">
        <AppText variant="body" color="muted">Explain what is wrong. The facilities team corrects the record and sends it to you again.</AppText>
        <Input value={reason} onChangeText={setReason} multiline placeholder="e.g. The meter reading is wrong; the wall damage was there at take-over" autoCapitalize="sentences" style={styles.reason} />
        <Button title="Send dispute" variant="danger" full onPress={() => (reason.trim() ? run('dispute', { reason: reason.trim() }, () => nav.navigate('Tabs')) : setErr('Explain what is wrong.'))} loading={acting} style={styles.reason} />
        {err ? <AppText variant="small" color="coralInk" center style={styles.reason}>{err}</AppText> : null}
        <View style={styles.space} />
      </BottomSheet>
      <ConfirmDialog open={!!confirm} icon="pencil" title={confirm?.title} text={confirm?.text} confirmLabel={confirm?.label} loading={acting} onCancel={() => setConfirm(null)} onConfirm={() => confirm && confirm.run()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.tealTint, borderRadius: ms(22), padding: s(18), marginTop: vs(22) },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: s(8) },
  bar: { marginTop: vs(14) },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: s(16), marginTop: vs(12) },
  dispute: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.coralTint, borderRadius: ms(14), padding: s(12), marginTop: vs(16) },
  damageRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  damageTitle: { fontSize: ms(17) },
  amount: { minWidth: s(72), textAlign: 'right' },
  none: { paddingVertical: vs(10) },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: vs(16) },
  sigRow: { flexDirection: 'row', alignItems: 'center', gap: s(14), paddingVertical: vs(6) },
  sigDone: { width: ms(44), height: ms(44), borderRadius: ms(22), backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  sigTodo: { backgroundColor: colors.sunk },
  ownerCard: { marginTop: vs(16) },
  signArea: { marginTop: vs(12) },
  agree: { marginTop: vs(12) },
  pad: { marginTop: vs(12) },
  padHint: { marginBottom: vs(10) },
  sigBox: { marginTop: vs(12), backgroundColor: colors.sunk, borderRadius: ms(16), paddingVertical: vs(8) },
  err: { marginTop: vs(12) },
  reason: { marginTop: vs(12) },
  space: { height: vs(8) },
  flex: { flex: 1 },
});
