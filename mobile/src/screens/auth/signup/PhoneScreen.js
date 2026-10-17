/* Sign-up 1 of 7: mobile number. The one-time code goes to this number; WhatsApp notices too unless another number is given. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../../theme';
import { StepFrame, Input, Checkbox, AppText } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { useSignup, isPhone } from './useSignup';

export default function PhoneScreen() {
  const nav = useNavigation();
  const { f, set, errors, check } = useSignup();
  const next = () => {
    if (!check({ phone: !isPhone(f.phone) && 'Enter the 10-digit mobile number.', whatsapp: !f.whatsappSame && !isPhone(f.whatsapp) && 'Enter a 10-digit WhatsApp number.' })) return;
    nav.navigate('SignUpOtp');
  };
  return (
    <StepFrame step={1} steps={SIGNUP_STEPS} title="Create your owner account" intro="Rent payments and notices are tied to this number. We will text a code to confirm it." nextTitle="Send the code" onNext={next}>
      <Input label="Mobile (primary)" prefix="+91" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="98480 21734" error={errors.phone} style={styles.field} />
      <Checkbox checked={f.whatsappSame} onChange={set('whatsappSame')} label="WhatsApp messages come to the same number" style={styles.check} />
      {!f.whatsappSame ? <Input label="WhatsApp number" prefix="+91" value={f.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" error={errors.whatsapp} style={styles.field} /> : null}
      <View style={styles.note}>
        <AppText variant="small" color="muted">Already have an account? <AppText variant="smallSemi" color="teal" onPress={() => nav.goBack()}>Sign in</AppText></AppText>
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ field: { marginBottom: vs(18) }, check: { marginBottom: vs(18) }, note: { marginTop: vs(8) } });
