/* Sign-up 2 of 7: who the owner is — type, name, email, alternate phone, how they like to be contacted. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { s, vs } from '../../../theme';
import { StepFrame, Input, FilterChip, AppText, Segmented, PickerSheet } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { signupLists } from '../../../mock/data';
import { useSignup, isEmail, isPhone } from './useSignup';

export default function AboutScreen() {
  const nav = useNavigation();
  const { f, set, errors, check } = useSignup();
  const [pick, setPick] = useState(false);
  const next = () => {
    if (!check({ name: !f.name.trim() && 'Enter the name exactly as on the PAN card.', email: !isEmail(f.email) && 'That email does not look right.', altPhone: f.altPhone && !isPhone(f.altPhone) && 'Enter a 10-digit number.' })) return;
    nav.navigate('SignUpAddress');
  };
  return (
    <StepFrame step={2} steps={SIGNUP_STEPS} title="About you" onNext={next}>
      <AppText variant="label" style={styles.label}>Owner type</AppText>
      <View style={styles.chips}>{signupLists.kinds.map(k => <FilterChip key={k} label={k} selected={f.kind === k} onPress={() => set('kind')(k)} />)}</View>
      <Input label={f.kind === 'Individual' ? 'Full name, as on PAN' : `${f.kind} name, as on PAN`} value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} style={styles.field} />
      <Input label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" placeholder="Invoices and statements go here" error={errors.email} style={styles.field} />
      <Input label="Alternate phone (optional)" prefix="+91" value={f.altPhone} onChangeText={set('altPhone')} keyboardType="phone-pad" error={errors.altPhone} style={styles.field} />
      <AppText variant="label" style={styles.label}>Preferred contact</AppText>
      <Segmented value={f.prefContact} onChange={set('prefContact')} options={signupLists.contact.map(c => ({ label: c, value: c }))} style={styles.field} />
      <Input label="Best time to call" select value={f.callHours} onPress={() => setPick(true)} style={styles.field} />
      <PickerSheet open={pick} onClose={() => setPick(false)} title="Best time to call" options={signupLists.callHours} value={f.callHours} onSelect={set('callHours')} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ label: { marginBottom: vs(10) }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginBottom: vs(20) }, field: { marginBottom: vs(18) } });
