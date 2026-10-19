/* Agreements and documents for the owner: lease agreements and annexures on file, and Form 16A per quarter
   (GET /tds/owner/:id/f16). Files open in the phone's viewer through their media link. */
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { colors, ms, vs } from '../../theme';
import { Screen, AppText, Header, Icon, IconButton, ListRow, Chip, Skeleton, ErrorState } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useOwnerF16Query, useListQuery, errorMessage, inr, fmtDate, fileUrl } from '../../store/api';
import { useLookup } from '../../store/hooks';

export default function AgreementsScreen() {
  const { user, mediaToken } = useAppSelector(st => st.auth);
  const f16 = useOwnerF16Query({ ownerId: user?.ownerId }, { skip: !user?.ownerId });
  const leases = useListQuery({ resource: 'leases', params: { limit: 20 } });
  const props = useLookup('properties');
  const open = id => Linking.openURL(fileUrl(id, mediaToken));
  const docs = (leases.data?.data || []).flatMap(L => (L.docs || []).map(d => ({ ...(typeof d === 'string' ? { id: d, name: 'Document' } : d), lease: L })));
  const q = f16.data?.data?.quarters || [];
  return (
    <Screen>
      <Header heading="Agreements" />
      <AppText variant="title" color="muted" style={styles.group}>Lease documents</AppText>
      {leases.isLoading ? <Skeleton h={60} r={14} /> : (leases.data?.data || []).map((L, i, arr) => (
        <ListRow key={L.id} left={<View style={styles.icon}><Icon name="file-text" size={22} color={colors.teal} /></View>} title={`Lease agreement · ${props.name(L.propertyId)}`} sub={`${L.ref} · ${fmtDate(L.start)} – ${fmtDate(L.end)}${L.registered ? ' · registered' : ''}`} right={<Chip label={L.status === 'Draft' ? 'Draft' : 'Signed'} tone={L.status === 'Draft' ? 'grey' : 'teal'} size="sm" />} divider={i < arr.length - 1} />
      ))}
      {docs.map((d, i) => <ListRow key={d.id + i} left={<View style={styles.icon}><Icon name="file" size={22} color={colors.teal} /></View>} title={d.name || 'Document'} sub={d.lease.ref} right={<IconButton name="download" variant="sunk" size={40} iconSize={20} color={colors.teal} onPress={() => open(d.id || d.file)} accessibilityLabel="Open document" />} />)}
      {!leases.isLoading && !(leases.data?.data || []).length ? <AppText variant="body" color="muted">No lease on file yet.</AppText> : null}
      <AppText variant="title" color="muted" style={styles.group}>Form 16A (TDS certificates)</AppText>
      {f16.isLoading ? <Skeleton h={60} r={14} /> : f16.error ? <ErrorState title="Couldn't load Form 16A" body={errorMessage(f16.error)} action="Try again" onAction={f16.refetch} /> : q.length ? q.map((x, i) => (
        <ListRow key={`${x.fy}-${x.q}`} left={<View style={styles.icon}><Icon name="download" size={22} color={x.file ? colors.teal : colors.muted} /></View>} title={`Form 16A, Q${x.q} FY ${x.fy}`} sub={`TDS ${inr(x.tds)} on ${inr(x.base)}${x.issuedOn ? ` · issued ${fmtDate(x.issuedOn)}` : ` · due ${fmtDate(x.due)}`}`}
          right={x.file ? <IconButton name="download" variant="sunk" size={40} iconSize={20} color={colors.teal} onPress={() => open(x.file)} accessibilityLabel="Download Form 16A" /> : <Chip label={x.issuedOn ? 'Issued' : 'Not yet'} tone={x.issuedOn ? 'teal' : 'grey'} size="sm" />} divider={i < q.length - 1} />
      )) : <AppText variant="body" color="muted">No TDS deducted yet this year.</AppText>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: vs(22), marginBottom: vs(2), fontSize: ms(15) },
  icon: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
