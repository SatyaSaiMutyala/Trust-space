/* Sign-up 5 of 7: the account rent is paid into, with a cancelled cheque for verification. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { s, vs } from '../../../theme';
import { StepFrame, Input, AppText, Segmented, PhotoArch, Dropdown, PhotoPickerSheet, usePhotoPicker } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { signupLists } from '../../../mock/data';
import { useSignup, isIfsc } from './useSignup';

export default function BankScreen() {
  const nav = useNavigation();
  const { f, set, errors, check } = useSignup();
  const [pick, pickerProps] = usePhotoPicker();
  const [pickErr, setPickErr] = useState('');
  const grab = async () => { const files = await pick({ title: 'Cancelled cheque or bank letter' }); if (files.error) { setPickErr(files.error); return; } if (files[0]) set('chequeFile')({ uri: files[0].uri, type: files[0].type, name: files[0].name }); };
  const next = () => {
    if (!check({ bankName: !f.bankName && 'Pick the bank.', ifsc: !isIfsc(f.ifsc) && 'IFSC is 11 characters, like SBIN0003412.', acctHolder: !f.acctHolder.trim() && 'Enter the account holder name.', acctNo: !/^\d{9,18}$/.test(f.acctNo) && 'Enter the account number (9 to 18 digits).', acctNo2: f.acctNo2 !== f.acctNo && 'The account numbers do not match.', chequeFile: !f.chequeFile && 'Add a cancelled cheque or bank letter.' })) return;
    nav.navigate('SignUpProperty');
  };
  return (
    <StepFrame step={5} steps={SIGNUP_STEPS} title="Bank account" intro="Rent after TDS is paid here. The name must match the PAN." onNext={next}>
      <Dropdown label="Bank" value={f.bankName} options={signupLists.banks} onSelect={set('bankName')} placeholder="Pick the bank" searchable error={errors.bankName} style={styles.field} />
      <View style={styles.row}>
        <Input label="IFSC" value={f.ifsc} onChangeText={v => set('ifsc')(v.toUpperCase())} autoCapitalize="characters" placeholder="SBIN0003412" error={errors.ifsc} style={styles.half} />
        <Input label="Branch" value={f.bankBranch} onChangeText={set('bankBranch')} autoCapitalize="words" style={styles.half} />
      </View>
      <Input label="Account holder name" value={f.acctHolder || f.panName || f.name} onChangeText={set('acctHolder')} autoCapitalize="words" error={errors.acctHolder} style={styles.field} />
      <Input label="Account number" value={f.acctNo} onChangeText={set('acctNo')} keyboardType="number-pad" secure error={errors.acctNo} style={styles.field} />
      <Input label="Confirm account number" value={f.acctNo2} onChangeText={set('acctNo2')} keyboardType="number-pad" error={errors.acctNo2} style={styles.field} />
      <AppText variant="label" style={styles.label}>Account type</AppText>
      <Segmented value={f.acctType} onChange={set('acctType')} options={signupLists.acctTypes.map(a => ({ label: a, value: a }))} style={styles.field} />
      <Input label="UPI ID (optional)" value={f.upi} onChangeText={set('upi')} placeholder="name@bank" style={styles.field} />
      <AppText variant="label" style={styles.label}>Cancelled cheque / bank letter</AppText>
      <View style={styles.photos}><PhotoArch state={f.chequeFile ? 'photo' : 'needed'} label={f.chequeFile ? 'Cheque' : 'Add the cheque'} sub="Needed" width={150} ratio={0.9} onPress={grab} uri={f.chequeFile?.uri} /></View>
      {errors.chequeFile || pickErr ? <AppText variant="smallSemi" color="coralInk" style={styles.err}>{errors.chequeFile || pickErr}</AppText> : null}
      <PhotoPickerSheet {...pickerProps} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ field: { marginBottom: vs(18) }, label: { marginBottom: vs(10) }, row: { flexDirection: 'row', gap: s(12) }, half: { flex: 1, marginBottom: vs(18) }, photos: { flexDirection: 'row', marginBottom: vs(18) }, err: { marginTop: -vs(10), marginBottom: vs(14) } });
