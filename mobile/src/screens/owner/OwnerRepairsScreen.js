/* Owner repairs tab from GET /tickets (scoped to the owner's premises), and Report an issue. */
import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../theme';
import { Screen, AppText, ListRow, Chip, Button, Skeleton, ErrorState, EmptyState } from '../../components';
import { useList, useLookup } from '../../store/hooks';
import { errorMessage, PRI_LABEL } from '../../store/api';

const TONE = { Open: 'blue', Assigned: 'blue', 'In progress': 'blue', 'Awaiting owner': 'amber', Resolved: 'teal', Closed: 'teal' };
const LABEL = { 'Awaiting owner': 'Waiting for you' };

export default function OwnerRepairsScreen() {
  const nav = useNavigation();
  const { items, isLoading, error, refetch } = useList('tickets', {}, { sort: 'createdAt', order: 'desc', limit: 30 });
  const props = useLookup('properties');
  return (
    <Screen tabs>
      <AppText variant="display" style={styles.title}>Repairs</AppText>
      <Button title="Report an issue" variant="primary" icon="plus" onPress={() => nav.navigate('RaiseTicket')} style={styles.btn} />
      {isLoading ? <Skeleton h={160} r={18} /> : error ? <ErrorState title="Couldn't load repairs" body={errorMessage(error)} action="Try again" onAction={refetch} /> : !items.length ? <EmptyState title="No repairs" body="Nothing has been raised on your premises." /> : items.map((t, i) => (
        <ListRow key={t.id} title={t.title} sub={`${t.no} · ${props.name(t.propertyId)} · ${PRI_LABEL[t.priority] || t.priority}`} right={<Chip label={LABEL[t.status] || t.status} tone={TONE[t.status] || 'grey'} size="sm" />} chevron onPress={() => nav.navigate('TicketDetail', { id: t.id })} divider={i < items.length - 1} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { marginTop: vs(14) }, btn: { marginVertical: vs(18) } });
