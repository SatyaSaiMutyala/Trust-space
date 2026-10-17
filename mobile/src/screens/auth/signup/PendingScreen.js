/* After sign-up: what happens next and where the account stands. Shown again at sign-in until the facilities team approves. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../../theme';
import { Screen, AppText, Arch, Icon, Stepper, Button, Footer } from '../../../components';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { resetSignup } from '../../../store/slices/signupSlice';

export default function PendingScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const f = useAppSelector(st => st.signup);
  return (
    <Screen footer={(
      <Footer stacked>
        <Button title="Back to sign in" variant="primary" onPress={() => { dispatch(resetSignup()); nav.popToTop(); }} />
        <Button title="Message the facilities team" variant="secondary" icon="message" onPress={() => {}} style={styles.msg} />
      </Footer>
    )}>
      <View style={styles.top}>
        <Arch width={100} height={110} bg={colors.tealTint}><View style={styles.iconWrap}><Icon name="check" size={44} color={colors.teal} strokeWidth={1.6} /></View></Arch>
        <AppText variant="h1" center style={styles.title}>Thank you, {f.name.split(' ')[0] || 'owner'}</AppText>
        <AppText variant="body" color="muted" center style={styles.body}>Your account is created. The facilities team now checks your PAN and bank account and links {f.propertyCode || f.propertyName || 'your property'} to it. You will get an SMS on +91 {f.phone} when it is ready, usually within one working day.</AppText>
      </View>
      <View style={styles.card}>
        <Stepper ring="amber" steps={[{ label: 'Submitted', state: 'done' }, { label: 'PAN check', state: 'current' }, { label: 'Bank check', state: 'todo' }, { label: 'Linked', state: 'todo' }]} />
      </View>
      <AppText variant="small" color="muted" center style={styles.foot}>Until then you can sign in and see this status. Nothing else is needed from you.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', paddingTop: vs(40), paddingHorizontal: s(10) },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: vs(22) },
  body: { marginTop: vs(10), fontSize: ms(15) },
  card: { backgroundColor: colors.tealTint, borderRadius: ms(20), paddingVertical: vs(20), paddingHorizontal: s(10), marginTop: vs(28) },
  foot: { marginTop: vs(20) },
  msg: { marginTop: vs(12) },
});
