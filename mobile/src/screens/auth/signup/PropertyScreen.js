/* Sign-up 6 of 7: which premises they own (so the account can be linked to the lease), co-owners, and a
   representative who may act for them. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, s, vs } from '../../../theme';
import { StepFrame, Input, AppText, Checkbox, PhotoArch, PickerSheet, Icon } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { signupLists } from '../../../mock/data';
import { useSignup, isPhone, isEmail } from './useSignup';

export default function PropertyScreen() {
  const nav = useNavigation();
  const { f, set, errors, check } = useSignup();
  const [hasRep, setHasRep] = useState(!!f.repName);
  const [pick, setPick] = useState(false);
  const company = f.kind !== 'Individual';
  const next = () => {
    const rules = { propertyName: !f.propertyCode.trim() && !f.propertyName.trim() && 'Enter the property code from your agreement, or its name and town.' };
    if (hasRep) Object.assign(rules, { repName: !f.repName.trim() && 'Enter the name.', repPhone: !isPhone(f.repPhone) && 'Enter a 10-digit number.', repEmail: !isEmail(f.repEmail) && 'That email does not look right.' });
    if (!check(rules)) return;
    nav.navigate('SignUpPassword');
  };
  return (
    <StepFrame step={6} steps={SIGNUP_STEPS} title="Your property" intro="Your account is linked to the lease, so rent and notices reach the right owner." onNext={next}>
      <Input label="Property code (on your agreement)" value={f.propertyCode} onChangeText={v => set('propertyCode')(v.toUpperCase())} autoCapitalize="characters" placeholder="TLD-HYD-004" style={styles.field} />
      <AppText variant="small" color="muted" style={styles.or}>Don't have the code? Tell us the place instead.</AppText>
      <View style={styles.row}>
        <Input label="Property name" value={f.propertyName} onChangeText={set('propertyName')} autoCapitalize="words" placeholder="Begumpet Central Lab" error={errors.propertyName} style={styles.half} />
        <Input label="Town" value={f.propertyTown} onChangeText={set('propertyTown')} autoCapitalize="words" style={styles.half} />
      </View>
      <Input label="Co-owners (optional)" value={f.coOwners} onChangeText={set('coOwners')} multiline placeholder="Names of anyone who owns it with you, and their share" autoCapitalize="words" style={styles.field} />
      <Checkbox checked={hasRep} onChange={v => { setHasRep(v); if (!v) { set('repName')(''); set('repPhone')(''); set('repEmail')(''); set('repRel')(''); } }} label={company ? 'Add the person who signs for the company' : 'Someone else may act for me'} style={styles.field} />
      {hasRep ? (
        <>
          <Input label="Representative name" value={f.repName} onChangeText={set('repName')} autoCapitalize="words" error={errors.repName} style={styles.field} />
          <Input label="Relationship" select value={f.repRel} placeholder="Pick one" onPress={() => setPick(true)} style={styles.field} />
          <View style={styles.row}>
            <Input label="Phone" prefix="+91" value={f.repPhone} onChangeText={set('repPhone')} keyboardType="phone-pad" error={errors.repPhone} style={styles.half} />
            <Input label="Email" value={f.repEmail} onChangeText={set('repEmail')} keyboardType="email-address" error={errors.repEmail} style={styles.half} />
          </View>
          <AppText variant="label" style={styles.label}>{company ? 'Board resolution' : 'Power of attorney'} (optional)</AppText>
          <View style={styles.photos}><PhotoArch state={f.poaFile ? 'photo' : 'optional'} label={f.poaFile ? 'Document' : 'Add document'} sub="Photo or PDF" width={150} ratio={0.9} onPress={() => set('poaFile')({ name: 'poa.pdf' })} /></View>
        </>
      ) : null}
      <View style={styles.note}><Icon name="info" size={18} color={colors.muted} /><AppText variant="small" color="muted" style={styles.flex}>Rent shares and the lease itself are set by the facilities team from the signed agreement, not here.</AppText></View>
      <PickerSheet open={pick} onClose={() => setPick(false)} title="Relationship" options={signupLists.relations} value={f.repRel} onSelect={set('repRel')} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ field: { marginBottom: vs(18) }, label: { marginBottom: vs(10) }, or: { marginTop: -vs(8), marginBottom: vs(14) }, row: { flexDirection: 'row', gap: s(12) }, half: { flex: 1, marginBottom: vs(18) }, photos: { flexDirection: 'row', marginBottom: vs(18) }, note: { flexDirection: 'row', gap: s(10), alignItems: 'flex-start' }, flex: { flex: 1 } });
