/* Record challan: the month and amount from the TDS register (or typed), CIN / BSR, date, mode, interest → POST /tds. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Input, Dropdown, Footer, Button } from '../../components';
import { useCreateRecordMutation, errorMessage, inr, perLabel, todayISO } from '../../store/api';

const MODES = ['Net banking (e-Pay Tax)', 'Debit card', 'Bank counter', 'UPI'];
const monthOptions = () => { const out = []; const d = new Date(); for (let k = 0; k < 14; k++) { const m = new Date(d.getFullYear(), d.getMonth() - k, 1); const p = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`; out.push({ label: perLabel(p), value: p }); } return out; };

export default function RecordChallanScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const pre = route.params || {};
  const [f, setF] = useState({ month: pre.month || monthOptions()[1].value, amount: pre.amount ? String(pre.amount) : '', interest: pre.interest ? String(pre.interest) : '0', paidOn: todayISO(), mode: MODES[0], bsr: '', challanNo: '' });
  const [errors, setErrors] = useState({});
  const [create, state] = useCreateRecordMutation();
  const set = k => v => { setF(x => ({ ...x, [k]: v })); setErrors(e => ({ ...e, [k]: undefined, form: undefined })); };
  const save = async () => {
    const e = {};
    if (!(+f.amount > 0)) e.amount = 'Enter the amount deposited.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.paidOn)) e.paidOn = 'Use the form 2026-10-19.';
    if (!f.challanNo.trim()) e.challanNo = 'Enter the challan number.';
    if (Object.keys(e).length) return setErrors(e);
    try {
      await create({ resource: 'tds', body: { kind: 'challan', ws: pre.ws || 'tdpl', month: f.month, amount: +f.amount, interest: +f.interest || 0, paidOn: f.paidOn, mode: f.mode, bsr: f.bsr.trim(), challanNo: f.challanNo.trim() } }).unwrap();
      nav.goBack();
    } catch (err) { setErrors({ form: errorMessage(err) }); }
  };
  const total = (+f.amount || 0) + (+f.interest || 0);
  return (
    <Screen footer={(
      <Footer hint={errors.form || (total ? `Total deposited ${inr(total)} for ${perLabel(f.month)}.` : undefined)} hintColor={errors.form ? 'coralInk' : 'muted'}>
        <Button title="Save challan" variant="primary" full onPress={save} loading={state.isLoading} />
      </Footer>
    )}>
      <Header heading="Record challan" sub={`${perLabel(f.month)} TDS`} />
      <View style={styles.summary}>
        {[['TDS', inr(+f.amount || 0)], ['Interest', inr(+f.interest || 0)], ['Total', inr(total)]].map(([l, v], i) => (
          <View key={l} style={[styles.sumCol, i === 2 && styles.sumTotal]}>
            <AppText variant="small" color={i === 2 ? 'coralInk' : 'muted'}>{l}</AppText>
            <AppText variant="monoMd" color={i === 2 ? 'coralInk' : 'ink'} style={styles.sumVal}>{v}</AppText>
          </View>
        ))}
      </View>
      <Dropdown label="Month of deduction" value={f.month} options={monthOptions()} onSelect={set('month')} style={styles.field} />
      <View style={styles.row}>
        <Input label="Amount" prefix="₹" value={f.amount} onChangeText={set('amount')} keyboardType="numeric" error={errors.amount} style={styles.half} />
        <Input label="Interest" prefix="₹" value={f.interest} onChangeText={set('interest')} keyboardType="numeric" style={styles.half} />
      </View>
      <View style={styles.row}>
        <Input label="Challan number" value={f.challanNo} onChangeText={set('challanNo')} keyboardType="numeric" placeholder="e.g. 10685" error={errors.challanNo} style={styles.half} />
        <Input label="BSR code" value={f.bsr} onChangeText={set('bsr')} keyboardType="numeric" placeholder="7 digits" style={styles.half} />
      </View>
      <Input label="Paid on" value={f.paidOn} onChangeText={set('paidOn')} placeholder="2026-10-19" error={errors.paidOn} style={styles.field} />
      <Dropdown label="Paid by" value={f.mode} options={MODES} onSelect={set('mode')} style={styles.field} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', backgroundColor: colors.sunk, borderRadius: ms(20), marginTop: vs(16), marginBottom: vs(20), overflow: 'hidden' },
  sumCol: { flex: 1, padding: s(14), paddingVertical: vs(16) },
  sumTotal: { backgroundColor: colors.coralTint },
  sumVal: { marginTop: vs(4) },
  field: { marginBottom: vs(18) },
  row: { flexDirection: 'row', gap: s(12) },
  half: { flex: 1, marginBottom: vs(18) },
});
