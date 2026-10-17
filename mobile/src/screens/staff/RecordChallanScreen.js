/* Record challan: the amount the late TDS card asks for, CIN, date, bank, how it was paid, receipt photo. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Input, Segmented, PhotoArch, Footer, Button } from '../../components';
import { challan } from '../../mock/data';

export default function RecordChallanScreen() {
  const nav = useNavigation();
  const [f, setF] = useState({ cin: '', date: '16 Oct 2026', bank: challan.banks[0], amount: challan.total.replace('₹', ''), how: 'net' });
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  return (
    <Screen footer={(
      <Footer hint={`This clears ${challan.month.split(' ')[0]}. Interest of ${challan.interest} for ${challan.daysLate} days is included.`}>
        <Button title="Save challan" variant="primary" full onPress={() => nav.goBack()} />
      </Footer>
    )}>
      <Header heading="Record challan" sub={`${challan.month} TDS`} />
      <View style={styles.summary}>
        {[['To deposit', challan.toDeposit], ['Interest', challan.interest], ['Total', challan.total]].map(([l, v], i) => (
          <View key={l} style={[styles.sumCol, i === 2 && styles.sumTotal]}>
            <AppText variant="small" color={i === 2 ? 'coralInk' : 'muted'}>{l}</AppText>
            <AppText variant="monoMd" color={i === 2 ? 'coralInk' : 'ink'} style={styles.sumVal}>{v}</AppText>
          </View>
        ))}
      </View>
      <Input label="Challan number (CIN)" value={f.cin} onChangeText={set('cin')} placeholder="e.g. 0004612" keyboardType="numeric" style={styles.field} />
      <View style={styles.row}>
        <Input label="Paid on" select value={f.date} onPress={() => {}} style={styles.half} />
        <Input label="Amount" prefix="₹" value={f.amount} onChangeText={set('amount')} keyboardType="numeric" style={styles.half} />
      </View>
      <Input label="Bank" select value={f.bank} onPress={() => {}} style={styles.field} />
      <AppText variant="label" style={styles.label}>Paid by</AppText>
      <Segmented value={f.how} onChange={set('how')} options={[{ label: 'Net banking', value: 'net' }, { label: 'Cheque', value: 'cheque' }, { label: 'Counter', value: 'counter' }]} style={styles.field} />
      <AppText variant="label" style={styles.label}>Receipt</AppText>
      <View style={styles.receipt}><PhotoArch state="optional" label="Add the receipt" sub="Photo or PDF, optional" width={170} ratio={0.85} onPress={() => {}} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: ms(15) },
  title: { marginTop: vs(2) },
  summary: { flexDirection: 'row', backgroundColor: colors.sunk, borderRadius: ms(20), marginTop: vs(16), marginBottom: vs(20), overflow: 'hidden' },
  sumCol: { flex: 1, padding: s(14), paddingVertical: vs(16) },
  sumTotal: { backgroundColor: colors.coralTint },
  sumVal: { marginTop: vs(4) },
  field: { marginBottom: vs(18) },
  row: { flexDirection: 'row', gap: s(12) },
  half: { flex: 1, marginBottom: vs(18) },
  label: { marginBottom: vs(10) },
  receipt: { alignItems: 'flex-start' },
});
