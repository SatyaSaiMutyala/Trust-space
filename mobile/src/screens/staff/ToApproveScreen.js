/* To approve (design p.7): a stack of invoice cards, stepper Submitted → Verified → You → Paid, breakdown,
   checks, verifier note; swipe to approve, then the "Approved … Undo / Next invoice" bar. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, gutter, shadows } from '../../theme';
import { Screen, AppText, Header, Stepper, Avatar, Icon, Footer, Button, SwipeToApprove, KeyValueRow } from '../../components';
import { approvals } from '../../mock/data';

export default function ToApproveScreen() {
  const nav = useNavigation();
  const [i, setI] = useState(0);
  const [approved, setApproved] = useState(false);
  const a = approvals[i];
  const next = () => { if (i < approvals.length - 1) { setI(i + 1); setApproved(false); } else nav.goBack(); };
  return (
    <Screen bg="canvas" padded={false} footer={(
      <Footer>
        {approved ? (
          <View style={styles.doneRow}>
            <View style={styles.doneIcon}><Icon name="check" size={24} color={colors.teal} strokeWidth={2.4} /></View>
            <View style={styles.flex}>
              <AppText variant="title">Approved {a.net}</AppText>
              <Pressable onPress={() => setApproved(false)} hitSlop={8}><AppText variant="smallSemi" color="teal" style={styles.undo}>Undo</AppText></Pressable>
            </View>
            <Button title="Next invoice" variant="primary" onPress={next} />
          </View>
        ) : (
          <SwipeToApprove onApprove={() => setApproved(true)} onReject={() => {}} style={styles.flex} />
        )}
      </Footer>
    )}>
      <View style={styles.pad}>
        <Header heading="To approve" right={<AppText variant="mono" color="muted" style={styles.count}>{i + 1} of {approvals.length}</AppText>} />
      </View>
      <View style={styles.stackWrap}>
        <View style={[styles.ghost, styles.ghost2]} />
        <View style={[styles.ghost, styles.ghost1]} />
        <View style={[styles.card, shadows.card]}>
          <View style={styles.stepperBox}>
            <Stepper ring="amber" steps={[{ label: 'Submitted', state: 'done' }, { label: 'Verified', state: 'done' }, { label: 'You', state: approved ? 'done' : 'current' }, { label: 'Paid', state: 'todo' }]} />
          </View>
          <View style={styles.body}>
            <View style={styles.ownerRow}>
              <Avatar initials={a.initials} size={44} />
              <View style={styles.flex}>
                <AppText variant="title">{a.owner}</AppText>
                <AppText variant="small" color="muted" style={styles.ownerSub}>{a.sub}</AppText>
              </View>
            </View>
            <AppText variant="body" color="muted" style={styles.period}>{a.period}</AppText>
            <AppText variant="monoXxl" style={styles.net} numberOfLines={1} adjustsFontSizeToFit>{a.net}</AppText>
            {a.rows.map(r => <KeyValueRow key={r.label} label={r.label} value={r.value} valueColor={r.coral ? colors.coral : undefined} />)}
            <View style={styles.checks}>
              <View style={styles.checkIcon}><Icon name="check" size={18} color={colors.white} strokeWidth={2.6} /></View>
              <View style={styles.flex}>
                <AppText variant="title">{a.checks}</AppText>
                <AppText variant="small" color="muted" style={styles.checksSub}>{a.checksSub}</AppText>
              </View>
              <Pressable hitSlop={8}><AppText variant="title" color="teal">PDF</AppText></Pressable>
            </View>
            <AppText variant="body" color="muted" style={styles.note}>{a.note}</AppText>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  count: { fontSize: ms(15) },
  title: { marginTop: vs(4) },
  stackWrap: { marginTop: vs(32), paddingHorizontal: gutter },
  ghost: { position: 'absolute', left: gutter, right: gutter, height: vs(40), borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24), backgroundColor: '#DCEBE7' },
  ghost1: { top: -vs(10), left: gutter + s(10), right: gutter + s(10) },
  ghost2: { top: -vs(20), left: gutter + s(20), right: gutter + s(20), backgroundColor: '#E6F0ED' },
  card: { backgroundColor: colors.white, borderRadius: ms(24), overflow: 'hidden' },
  stepperBox: { backgroundColor: colors.tealTint, paddingVertical: vs(20), paddingHorizontal: s(10) },
  body: { paddingHorizontal: s(18), paddingVertical: vs(18) },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  ownerSub: { marginTop: vs(2), fontSize: ms(13.5) },
  period: { marginTop: vs(18), fontSize: ms(15) },
  net: { marginTop: vs(4), marginBottom: vs(8) },
  checks: { flexDirection: 'row', alignItems: 'center', gap: s(12), backgroundColor: colors.sunk, borderRadius: ms(18), padding: s(14), marginTop: vs(18) },
  checkIcon: { width: ms(28), height: ms(28), borderRadius: ms(14), backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  checksSub: { marginTop: vs(2), fontSize: ms(13.5) },
  note: { marginTop: vs(16), fontSize: ms(14.5) },
  flex: { flex: 1 },
  doneRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(14) },
  doneIcon: { width: ms(48), height: ms(48), borderRadius: ms(24), backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  undo: { marginTop: vs(2) },
});
