/* Owner invoices tab from GET /invoices (scoped to the owner): amounts and status, New invoice button. A co-share
   (not on the agreement) sees their monthly rent payments instead and raises nothing. */
import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../theme';
import { Screen, AppText, ListRow, Chip, Button, Skeleton, ErrorState, EmptyState } from '../../components';
import { useList, useLookup, useAppSelector } from '../../store/hooks';
import { useOneQuery, errorMessage, inr, perLabel, invState, todayISO } from '../../store/api';

const TONE = { Paid: 'teal', Approved: 'teal', Verified: 'blue', Submitted: 'blue', Overdue: 'coral', Rejected: 'coral' };
const LABEL = { Submitted: 'Sent', Verified: 'Checked', Approved: 'Approved', Paid: 'Paid', Overdue: 'Overdue', Rejected: 'Rejected' };

export default function OwnerInvoicesScreen() {
  const nav = useNavigation();
  const { items, isLoading, error, refetch, hasMore, loadMore, isFetching } = useList('invoices', {}, { sort: 'date', order: 'desc' });
  const props = useLookup('properties');
  const today = todayISO();
  const { user } = useAppSelector(st => st.auth);
  const me = useOneQuery({ resource: 'owners', id: user?.ownerId }, { skip: !user?.ownerId });
  const cs = me.data?.data?.party === 'Co-share';
  return (
    <Screen tabs>
      <AppText variant="display" style={styles.title}>{cs ? 'Rent payments' : 'Invoices'}</AppText>
      {cs ? <AppText variant="body" color="muted" style={styles.btn}>Your share of the rent is generated as a payment each month, with TDS on your PAN, and paid to your bank.</AppText> : <Button title="New invoice" variant="primary" icon="plus" onPress={() => nav.navigate('NewInvoice')} style={styles.btn} />}
      {isLoading ? <Skeleton h={160} r={18} /> : error ? <ErrorState title="Couldn't load your invoices" body={errorMessage(error)} action="Try again" onAction={refetch} /> : !items.length ? <EmptyState title={cs ? 'No payments yet' : 'No invoices yet'} body={cs ? 'Your rent payments appear here on the 1st of each month.' : 'Rent invoices appear here on the 1st of each month.'} /> : items.map((x, i) => {
        const st = invState(x, today);
        return <ListRow key={x.id} title={`${perLabel(x.period)} ${x.voucher ? 'rent payment' : x.type.toLowerCase()}`} sub={`${props.name(x.propertyId)} · ${x.number}${st === 'Paid' && x.paidDate ? ` · paid ${x.paidDate.slice(8, 10)}/${x.paidDate.slice(5, 7)}` : ''}`} right={<><AppText variant="monoMd">{inr(x.net)}</AppText><Chip label={LABEL[st] || st} tone={TONE[st] || 'grey'} size="sm" /></>} divider={i < items.length - 1} />;
      })}
      {hasMore ? <Button title={isFetching ? 'Loading…' : 'Load more'} variant="tonal" size="md" onPress={loadMore} style={styles.more} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { marginTop: vs(14) }, btn: { marginVertical: vs(18) }, more: { marginTop: vs(16), alignSelf: 'center' } });
