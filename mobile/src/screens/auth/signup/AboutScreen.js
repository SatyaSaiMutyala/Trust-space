/* Sign-up 2 of 7: who the owner is — type, name, mobile, WhatsApp, how they like to be contacted. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { s, vs } from '../../../theme';
import { StepFrame, Input, FilterChip, AppText, Segmented, Dropdown, Checkbox } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { signupLists } from '../../../mock/data';
import { useSignup, isPhone } from './useSignup';

export default function AboutScreen() {
  const nav = useNavigation();
  const { f, set, errors, check } = useSignup();
  const next = () => {
    if (!check({ name: !f.name.trim() && 'Enter the name exactly as on the PAN card.', phone: !isPhone(f.phone) && 'Enter the 10-digit mobile number.', whatsapp: !f.whatsappSame && !isPhone(f.whatsapp) && 'Enter a 10-digit WhatsApp number.', altPhone: f.altPhone && !isPhone(f.altPhone) && 'Enter a 10-digit number.' })) return;
    nav.navigate('SignUpAddress');
  };
  return (
    <StepFrame step={2} steps={SIGNUP_STEPS} title="About you" onNext={next}>
      <AppText variant="label" style={styles.label}>Owner type</AppText>
      <View style={styles.chips}>{signupLists.kinds.map(k => <FilterChip key={k} label={k} selected={f.kind === k} onPress={() => set('kind')(k)} />)}</View>
      <Input label={f.kind === 'Individual' ? 'Full name, as on PAN' : `${f.kind} name, as on PAN`} value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} style={styles.field} />
      <Input label="Mobile (primary)" prefix="+91" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="98480 21734" error={errors.phone} style={styles.field} />
      <Checkbox checked={f.whatsappSame} onChange={set('whatsappSame')} label="WhatsApp messages come to the same number" style={styles.field} />
      {!f.whatsappSame ? <Input label="WhatsApp number" prefix="+91" value={f.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" error={errors.whatsapp} style={styles.field} /> : null}
      <Input label="Alternate phone (optional)" prefix="+91" value={f.altPhone} onChangeText={set('altPhone')} keyboardType="phone-pad" error={errors.altPhone} style={styles.field} />
      <AppText variant="label" style={styles.label}>Preferred contact</AppText>
      <Segmented value={f.prefContact} onChange={set('prefContact')} options={signupLists.contact.map(c => ({ label: c, value: c }))} style={styles.field} />
      <Dropdown label="Best time to call" value={f.callHours} options={signupLists.callHours} onSelect={set('callHours')} style={styles.field} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ label: { marginBottom: vs(10) }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginBottom: vs(20) }, field: { marginBottom: vs(18) } });
