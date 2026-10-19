/* List screens reached from "More": Properties, Site scouting, Leases, Exits, Owners, Rent & invoices, Deposits.
   All read the server lists (search, paging) and share one layout: header, search box, rows with a status chip. */
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, fonts } from '../../theme';
import { Screen, AppText, Header, Icon, ListRow, Chip, Avatar, Arch, Tile, Button, Skeleton, ErrorState, EmptyState } from '../../components';
import { useList, useLookup } from '../../store/hooks';
import { useDepositsQuery, errorMessage, inr, perLabel, fmtDate, leaseState, invState, todayISO } from '../../store/api';

/** Shared list page: search → server, "Load more" paging, loading / error / empty states. */
function ListPage({ title, eyebrow, placeholder, list, renderRow, action, onAdd, addTitle }) {
  const nav = useNavigation();
  const { items, total, hasMore, loadMore, search, setSearch, isLoading, isFetching, error, refetch } = list;
  return (
    <Screen>
      <Header heading={title} sub={eyebrow || (total ? `${total} found` : '')} right={action} />
      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" clearButtonMode="while-editing" />
      </View>
      {isLoading ? [0, 1, 2, 3].map(i => <View key={i} style={styles.skel}><Skeleton circle size={44} /><View style={styles.flex}><Skeleton w="60%" h={14} /><Skeleton w="40%" h={12} style={styles.skelGap} /></View></View>)
        : error ? <ErrorState title={`Couldn't load ${title.toLowerCase()}`} body={errorMessage(error)} action="Try again" onAction={refetch} />
          : !items.length ? <EmptyState title={search ? `Nothing matches “${search}”` : `No ${title.toLowerCase()} yet`} body={search ? 'Try another name or code.' : onAdd ? 'Add the first one.' : undefined} action={onAdd && !search ? addTitle : undefined} onAction={onAdd} />
            : items.map((it, i) => renderRow(it, i, nav, i < items.length - 1))}
      {hasMore ? <Button title={isFetching ? 'Loading…' : `Load more (${items.length} of ${total})`} variant="tonal" size="md" onPress={loadMore} disabled={isFetching} style={styles.more} /> : null}
    </Screen>
  );
}

const AddButton = ({ to, title }) => { const nav = useNavigation(); return <Button title={title} variant="tonal" size="sm" icon="plus" onPress={() => nav.navigate(to)} />; };
const PSTAT_TONE = { Active: 'teal', 'Under fit-out': 'blue', Pipeline: 'grey', 'Notice served': 'amber', Vacated: 'coral' };
const LSTAT_TONE = { Active: 'teal', 'Renewal due': 'amber', 'Notice period': 'amber', Draft: 'grey', Expired: 'coral', Terminated: 'coral' };
const STAGE_TONE = { Scouted: 'grey', Scrutiny: 'blue', Shortlisted: 'blue', Negotiation: 'blue', Acceptance: 'amber', Approved: 'teal', Agreement: 'teal', 'Take-over': 'teal', Operational: 'teal', Opened: 'teal', 'On hold': 'grey', Rejected: 'coral' };

export function PropertiesScreen() {
  const list = useList('properties', {}, { sort: 'name' });
  return (
    <ListPage title="Properties" placeholder="Search by name, code or city" list={list}
      renderRow={(p, i, nav, div) => <ListRow key={p.id} left={<Arch photo width={56} height={62} bottomRadius={12} />} title={p.name} sub={`${p.code} · ${p.type}${p.area ? ` · ${(+p.area).toLocaleString('en-IN')} sq ft` : ''}`} right={<Chip label={p.status} tone={PSTAT_TONE[p.status] || 'grey'} size="sm" />} chevron onPress={() => nav.navigate('PropertyDetail', { id: p.id })} divider={div} />} />
  );
}

export function SiteScoutingScreen() {
  const list = useList('sites', {}, { sort: 'createdAt', order: 'desc' });
  return (
    <ListPage title="Site scouting" placeholder="Search sites" list={list} action={<AddButton to="AddSite" title="Add site" />} onAdd={undefined}
      renderRow={(x, i, nav, div) => <ListRow key={x.id} left={<Arch photo width={56} height={62} bottomRadius={12} />} title={x.name} sub={`${[x.locality, x.city].filter(Boolean).join(', ')}${x.purpose ? ` · ${x.purpose}` : ''}${x.quotedRent ? ` · ${inr(x.quotedRent)}` : ''}`} right={<Chip label={x.stage} tone={STAGE_TONE[x.stage] || 'grey'} size="sm" />} chevron onPress={() => nav.navigate('SiteEvaluation', { id: x.id })} divider={div} />} />
  );
}

export function LeasesScreen() {
  const list = useList('leases', {}, { sort: 'start', order: 'desc' });
  const props = useLookup('properties');
  return (
    <ListPage title="Leases" placeholder="Search by reference" list={list}
      renderRow={(L, i, nav, div) => { const st = leaseState(L); return <ListRow key={L.id} title={props.name(L.propertyId) || L.ref} sub={`${L.ref} · ${fmtDate(L.start)} – ${fmtDate(L.end)} · ${inr(L.rent)}/mo`} right={<Chip label={st} tone={LSTAT_TONE[st] || 'grey'} size="sm" />} chevron onPress={() => nav.navigate('PropertyDetail', { id: L.propertyId, tab: 'Lease' })} divider={div} />; }} />
  );
}

export function ExitsScreen() {
  const list = useList('leases', {}, { sort: 'end' });
  const props = useLookup('properties');
  const exits = { ...list, items: list.items.filter(L => L.exit && (L.exit.noticeDate || L.exit.stage >= 1)) };
  return (
    <ListPage title="Exits" placeholder="Search by reference" list={exits}
      renderRow={(L, i, nav, div) => { const x = L.exit || {}; const st = x.stage >= 5 ? 'Terminated' : 'In notice'; return <ListRow key={L.id} title={props.name(L.propertyId) || L.ref} sub={`${x.noticeDate ? `Notice served ${fmtDate(x.noticeDate)}` : L.ref}${x.effective ? ` · vacate ${fmtDate(x.effective)}` : ''}`} right={<Chip label={st} tone={st === 'Terminated' ? 'coral' : 'amber'} size="sm" />} chevron onPress={() => nav.navigate('PropertyDetail', { id: L.propertyId, tab: 'Lease' })} divider={div} />; }} />
  );
}

export function OwnersScreen() {
  const list = useList('owners', {}, { sort: 'name' });
  const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <ListPage title="Owners" placeholder="Search by name, PAN or phone" list={list}
      renderRow={(o, i, nav, div) => <ListRow key={o.id} left={<Avatar initials={initials(o.name)} tone={i % 2 ? 'mist' : 'teal'} size={46} />} title={o.name} sub={`${o.kind || 'Individual'}${o.pan ? ` · ${o.pan}` : ' · no PAN, TDS 20%'}${o.phone ? ` · ${o.phone}` : ''}`} right={!o.pan ? <Chip label="No PAN" tone="coral" size="sm" /> : o.panStatus && o.panStatus !== 'Valid' ? <Chip label={o.panStatus} tone="amber" size="sm" /> : null} chevron onPress={() => nav.navigate('Thread', { ownerId: o.id })} divider={div} />} />
  );
}

export function InvoicesScreen() {
  const list = useList('invoices', {}, { sort: 'date', order: 'desc' });
  const owners = useLookup('owners'); const props = useLookup('properties');
  const today = todayISO();
  return (
    <ListPage title="Rent & invoices" placeholder="Search number, month or type" list={list} action={<AddButton to="ToApprove" title="Approve" />}
      renderRow={(x, i, nav, div) => { const st = invState(x, today); return <ListRow key={x.id} title={owners.name(x.ownerId) || x.number} sub={`${props.name(x.propertyId)} · ${perLabel(x.period)} ${x.type.toLowerCase()} · ${x.number}`} right={<><AppText variant="monoMd">{inr(x.net)}</AppText><Chip label={st === 'Verified' ? 'To approve' : st} tone={st === 'Paid' ? 'teal' : st === 'Overdue' || st === 'Rejected' ? 'coral' : st === 'Verified' ? 'amber' : 'blue'} size="sm" /></>} onPress={() => nav.navigate(st === 'Verified' ? 'ToApprove' : 'ToApprove', { id: x.id })} divider={div} />; }} />
  );
}

export function DepositsScreen() {
  const nav = useNavigation();
  const { data, isLoading, error, refetch } = useDepositsQuery();
  const props = useLookup('properties');
  const d = data?.data;
  return (
    <Screen>
      <Header heading="Deposits" sub={d ? `${d.leases.length} lease${d.leases.length === 1 ? '' : 's'}` : ''} />
      {isLoading ? <Skeleton h={88} r={18} style={styles.tileSkel} /> : error ? <ErrorState title="Couldn't load deposits" body={errorMessage(error)} action="Try again" onAction={refetch} /> : (
        <>
          <View style={styles.tiles}>
            <Tile tone="mist" label="Held" value={inr(d.held)} compact />
            <Tile tone="amber" label="Adjusted against rent" value={inr(d.leases.reduce((a, l) => a + (l.adjusted || 0), 0))} compact />
          </View>
          {d.leases.map((l, i) => (
            <ListRow key={l.leaseId} title={props.name(l.propertyId) || l.leaseId} sub={`Deposit ${inr(l.deposit)}${l.adjusted ? ` · ${inr(l.adjusted)} adjusted` : ''}`} right={<AppText variant="monoMd">{inr(l.held)}</AppText>} chevron onPress={() => nav.navigate('PropertyDetail', { id: l.propertyId, tab: 'Lease' })} divider={i < d.leases.length - 1} />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: s(12), backgroundColor: colors.sunk, borderRadius: ms(16), height: vs(46), paddingHorizontal: s(16), marginTop: vs(12), marginBottom: vs(6) },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: ms(15), color: colors.ink, paddingVertical: 0 },
  skel: { flexDirection: 'row', gap: s(14), alignItems: 'center', paddingVertical: vs(14) },
  skelGap: { marginTop: vs(8) },
  flex: { flex: 1 },
  more: { marginTop: vs(16), alignSelf: 'center' },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(16), marginBottom: vs(8) },
  tileSkel: { marginTop: vs(16) },
});
