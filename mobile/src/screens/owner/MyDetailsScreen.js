/* My details: contact details the owner can edit, PAN / GST / bank that the facilities team verifies, properties. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Avatar, Input, Chip, KeyValueRow, Footer, Button, Icon } from '../../components';
import { ownerDetails } from '../../mock/data';

function VerifiedBlock({ title, chip, tone, rows }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <AppText variant="h4" weight="semibold">{title}</AppText>
        <Chip label={chip} tone={tone} />
      </View>
      {rows.map(([l, v], i) => <KeyValueRow key={l} label={l} value={v} divider={i < rows.length - 1} />)}
    </View>
  );
}

export default function MyDetailsScreen() {
  const nav = useNavigation();
  const d = ownerDetails;
  const [f, setF] = useState({ phone: d.phone, email: d.email, address: d.address });
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  return (
    <Screen footer={<Footer><Button title="Save changes" variant="primary" full onPress={() => nav.goBack()} /></Footer>}>
      <Header heading="My details" />
      <View style={styles.who}>
        <Avatar initials={d.initials} size={64} />
        <View style={styles.flex}>
          <AppText variant="h3">{d.name}</AppText>
          <AppText variant="body" color="muted">{d.properties.join(' · ')}</AppText>
        </View>
      </View>
      <Input label="Mobile number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" style={styles.field} />
      <Input label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" style={styles.field} />
      <Input label="Address" value={f.address} onChangeText={set('address')} multiline autoCapitalize="sentences" style={styles.field} />
      <VerifiedBlock title="PAN" chip={d.pan.chip} tone={d.pan.tone} rows={[['PAN', d.pan.number], ['TDS on rent', '10%']]} />
      <VerifiedBlock title="GST" chip={d.gst.chip} tone={d.gst.tone} rows={[['GSTIN', d.gst.number]]} />
      <VerifiedBlock title="Bank" chip={d.bank.chip} tone={d.bank.tone} rows={[['Bank', d.bank.name], ['Account', d.bank.account], ['IFSC', d.bank.ifsc]]} />
      <View style={styles.note}>
        <Icon name="lock" size={20} color={colors.muted} />
        <AppText variant="small" color="muted" style={styles.flex}>PAN, GST and bank details are changed by the facilities team after checking the documents. Message us to update them.</AppText>
      </View>
      <Button title="Request a change" variant="tonal" size="md" icon="message" onPress={() => nav.navigate('Thread')} style={styles.ask} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4) },
  who: { flexDirection: 'row', alignItems: 'center', gap: s(14), marginTop: vs(16), marginBottom: vs(22) },
  field: { marginBottom: vs(18) },
  block: { backgroundColor: colors.sunk, borderRadius: ms(20), paddingHorizontal: s(16), paddingVertical: vs(6), marginBottom: vs(14) },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(10) },
  note: { flexDirection: 'row', gap: s(10), alignItems: 'flex-start', marginTop: vs(4) },
  ask: { marginTop: vs(14), alignSelf: 'flex-start' },
  flex: { flex: 1 },
});
