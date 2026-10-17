/* Owner invoices tab: list with amounts and status, New invoice button. */
import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../theme';
import { Screen, AppText, ListRow, Chip, Button } from '../../components';
import { ownerInvoices } from '../../mock/data';

export default function OwnerInvoicesScreen() {
  const nav = useNavigation();
  return (
    <Screen tabs>
      <AppText variant="display" style={styles.title}>Invoices</AppText>
      <Button title="New invoice" variant="primary" icon="plus" onPress={() => nav.navigate('NewInvoice')} style={styles.btn} />
      {ownerInvoices.map((x, i) => (
        <ListRow key={i} title={x.title} sub={x.sub} right={<><AppText variant="monoMd">{x.amount}</AppText><Chip label={x.chip} tone={x.tone} size="sm" /></>} onPress={() => {}} divider={i < ownerInvoices.length - 1} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { marginTop: vs(14) }, btn: { marginVertical: vs(18) } });
