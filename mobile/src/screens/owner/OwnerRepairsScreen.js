/* Owner repairs tab: tickets on the owner's premises and a Report an issue button. */
import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../theme';
import { Screen, AppText, ListRow, Chip, Button } from '../../components';
import { repairsList } from '../../mock/data';

export default function OwnerRepairsScreen() {
  const nav = useNavigation();
  const mine = repairsList.slice(0, 2);
  return (
    <Screen tabs>
      <AppText variant="display" style={styles.title}>Repairs</AppText>
      <Button title="Report an issue" variant="primary" icon="plus" onPress={() => nav.navigate('RaiseTicket')} style={styles.btn} />
      {mine.map((t, i) => (
        <ListRow key={t.code} title={t.title} sub={`${t.code} · ${t.sub}`} right={<Chip label={t.chip} tone={t.tone} size="sm" />} chevron onPress={() => nav.navigate('TicketDetail')} divider={i < mine.length - 1} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { marginTop: vs(14) }, btn: { marginVertical: vs(18) } });
