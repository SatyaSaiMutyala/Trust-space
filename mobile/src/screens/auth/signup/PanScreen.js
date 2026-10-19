/* Sign-up 4 of 7: PAN (decides TDS 10% vs 20%) with a photo of the card, and GST if registered. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, s, vs } from '../../../theme';
import { StepFrame, Input, AppText, PhotoArch, Icon, PhotoPickerSheet, usePhotoPicker } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { useSignup, isPan, isGstin } from './useSignup';

export default function PanScreen() {
  const nav = useNavigation();
  const { f, set, errors, check } = useSignup();
  const [pick, pickerProps] = usePhotoPicker();
  const [pickErr, setPickErr] = useState('');
  const grab = (key, title) => async () => { const files = await pick({ title }); if (files.error) { setPickErr(files.error); return; } if (files[0]) set(key)({ uri: files[0].uri, type: files[0].type, name: files[0].name }); };
  const next = () => {
    if (!check({ pan: !isPan(f.pan) && 'PAN is 10 characters, like ABCPK1234F.', panName: !f.panName.trim() && 'Enter the name printed on the PAN card.', panFile: !f.panFile && 'Add a photo of the PAN card.', gstin: !isGstin(f.gstin) && 'GSTIN is 15 characters, like 36ABCPK1234F1Z5.' })) return;
    nav.navigate('SignUpBank');
  };
  return (
    <StepFrame step={4} steps={SIGNUP_STEPS} title="PAN and GST" intro="With a valid PAN, TDS on your rent is 10%. Without one it has to be 20%." onNext={next}>
      <Input label="PAN" value={f.pan} onChangeText={v => set('pan')(v.toUpperCase())} autoCapitalize="characters" placeholder="ABCPK1234F" error={errors.pan} style={styles.field} />
      <Input label="Name as per PAN" value={f.panName || f.name} onChangeText={set('panName')} autoCapitalize="words" error={errors.panName} style={styles.field} />
      <AppText variant="label" style={styles.label}>PAN card copy</AppText>
      <View style={styles.photos}>
        <PhotoArch state={f.panFile ? 'photo' : 'needed'} label={f.panFile ? 'PAN card' : 'PAN card photo'} sub="Needed" width={150} ratio={0.9} onPress={grab('panFile', 'PAN card')} uri={f.panFile?.uri} />
      </View>
      {errors.panFile ? <AppText variant="smallSemi" color="coralInk" style={styles.err}>{errors.panFile}</AppText> : null}
      <Input label="GSTIN (if registered)" value={f.gstin} onChangeText={v => set('gstin')(v.toUpperCase())} autoCapitalize="characters" placeholder="36ABCPK1234F1Z5" error={errors.gstin} style={styles.field} />
      {f.gstin ? (
        <>
          <AppText variant="label" style={styles.label}>GST certificate</AppText>
          <View style={styles.photos}><PhotoArch state={f.gstFile ? 'photo' : 'optional'} label={f.gstFile ? 'GST certificate' : 'Add certificate'} sub="Photo or PDF" width={150} ratio={0.9} onPress={grab('gstFile', 'GST certificate')} uri={f.gstFile?.uri} /></View>
        </>
      ) : null}
      {pickErr ? <AppText variant="smallSemi" color="coralInk" style={styles.err}>{pickErr}</AppText> : null}
      <View style={styles.note}><Icon name="lock" size={18} color={colors.muted} /><AppText variant="small" color="muted" style={styles.flex}>The PAN is checked with the Income Tax portal before the first payment.</AppText></View>
      <PhotoPickerSheet {...pickerProps} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ field: { marginBottom: vs(18) }, label: { marginBottom: vs(10) }, photos: { flexDirection: 'row', marginBottom: vs(18) }, err: { marginTop: -vs(10), marginBottom: vs(14) }, note: { flexDirection: 'row', gap: s(10), alignItems: 'flex-start' }, flex: { flex: 1 } });
