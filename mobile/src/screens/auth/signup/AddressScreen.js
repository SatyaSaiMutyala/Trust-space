/* Sign-up 3 of 7: residential / billing address, and where legal notices go. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { s, vs } from '../../../theme';
import { StepFrame, Input, Checkbox, AppText, PickerSheet } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { signupLists } from '../../../mock/data';
import { useSignup, isPin, isEmail } from './useSignup';

export default function AddressScreen() {
  const nav = useNavigation();
  const { f, set, errors, check } = useSignup();
  const [pick, setPick] = useState(null); // 'addrState' | 'nState'
  const next = () => {
    const rules = { addrLine: !f.addrLine.trim() && 'Enter the address.', addrCity: !f.addrCity.trim() && 'Enter the city.', addrPin: !isPin(f.addrPin) && 'Enter the 6-digit PIN code.', noticeEmail: !isEmail(f.noticeEmail) && 'That email does not look right.' };
    if (!f.noticeSame) Object.assign(rules, { nLine: !f.nLine.trim() && 'Enter the address for notices.', nCity: !f.nCity.trim() && 'Enter the city.', nPin: !isPin(f.nPin) && 'Enter the 6-digit PIN code.' });
    if (!check(rules)) return;
    nav.navigate('SignUpPan');
  };
  const Block = ({ prefix, attn }) => (
    <>
      {attn ? <Input label="Attention / care of (optional)" value={f.nAttn} onChangeText={set('nAttn')} autoCapitalize="words" style={styles.field} /> : null}
      <Input label="Address" value={f[prefix + 'Line']} onChangeText={set(prefix + 'Line')} multiline placeholder="Door number, street, area" autoCapitalize="sentences" error={errors[prefix + 'Line']} style={styles.field} />
      <View style={styles.row}>
        <Input label="City" value={f[prefix + 'City']} onChangeText={set(prefix + 'City')} autoCapitalize="words" error={errors[prefix + 'City']} style={styles.half} />
        <Input label="PIN code" value={f[prefix + 'Pin']} onChangeText={set(prefix + 'Pin')} keyboardType="number-pad" error={errors[prefix + 'Pin']} style={styles.half} />
      </View>
      <Input label="State" select value={f[prefix + 'State']} onPress={() => setPick(prefix + 'State')} style={styles.field} />
    </>
  );
  return (
    <StepFrame step={3} steps={SIGNUP_STEPS} title="Your address" onNext={next}>
      <AppText variant="h4" weight="semibold" style={styles.sub}>Residential / billing address</AppText>
      <Block prefix="addr" />
      <Checkbox checked={f.noticeSame} onChange={set('noticeSame')} label="Legal notices go to the same address" style={styles.field} />
      {!f.noticeSame ? (<><AppText variant="h4" weight="semibold" style={styles.sub}>Address for notices</AppText><Block prefix="n" attn /></>) : null}
      <Input label="Email for notices (optional)" value={f.noticeEmail} onChangeText={set('noticeEmail')} keyboardType="email-address" error={errors.noticeEmail} style={styles.field} />
      <PickerSheet open={!!pick} onClose={() => setPick(null)} title="State" options={signupLists.states} value={pick ? f[pick] : ''} onSelect={v => pick && set(pick)(v)} searchable />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ sub: { marginBottom: vs(12) }, field: { marginBottom: vs(18) }, row: { flexDirection: 'row', gap: s(12) }, half: { flex: 1, marginBottom: vs(18) } });
