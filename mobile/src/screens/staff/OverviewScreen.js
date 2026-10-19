/* Staff home (design p.2): who/date, hero rent roll with donut, four tiles, "Needs you today" — from GET /mobile/overview.
   Shows the skeleton layout (design p.21) while loading and the error state with Try again if the call fails. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Avatar, IconButton, HeroCard, Donut, Tile, ListRow, CountBadge, SectionHeader, Skeleton, ErrorState } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useOverviewQuery, errorMessage, inr } from '../../store/api';

function Legend({ color, label }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="body" color="white" style={styles.legendText}>{label}</AppText>
    </View>
  );
}

function LoadingBody() {
  return (
    <View>
      <Skeleton h={170} r={22} tone="mist" style={styles.hero} />
      <View style={styles.tiles}><Skeleton h={96} r={18} style={styles.half} /><Skeleton h={96} r={18} style={styles.half} /></View>
      <View style={styles.tiles}><Skeleton h={96} r={18} style={styles.half} /><Skeleton h={96} r={18} style={styles.half} /></View>
      {[0, 1].map(i => (
        <View key={i} style={styles.skelRow}>
          <Skeleton circle size={40} />
          <View style={styles.flex}><Skeleton w="70%" h={14} /><Skeleton w="45%" h={12} style={styles.skelGap} /></View>
        </View>
      ))}
    </View>
  );
}

export default function OverviewScreen() {
  const nav = useNavigation();
  const user = useAppSelector(st => st.auth.user);
  const { data, isLoading, isFetching, error, refetch } = useOverviewQuery();
  const r = data?.data?.rentRoll; const t = data?.data?.tiles;
  const openNeed = it => nav.navigate(it.to, it.id ? { id: it.id } : undefined);
  return (
    <Screen tabs>
      <View style={styles.top}>
        <Pressable style={styles.who} accessibilityRole="button" accessibilityLabel="Profile" onPress={() => nav.navigate('More')}>
          <Avatar initials={user?.initials || '?'} tone="mist" size={34} />
          <AppText variant="body" color="muted" style={styles.whoText} numberOfLines={1}>{user?.name}{user?.team ? `, ${user.team}` : ''}</AppText>
        </Pressable>
        <View style={styles.topRight}>
          <IconButton name="search" onPress={() => nav.navigate('Search')} iconSize={24} accessibilityLabel="Search" />
          <View>
            <IconButton name="bell" onPress={() => nav.navigate('Notifications')} iconSize={24} accessibilityLabel="Notifications" />
            {data?.data?.needsTotal ? <View style={styles.bellDot} /> : null}
          </View>
        </View>
      </View>
      <AppText variant="body" color="muted" style={styles.date}>{data?.data?.dateLabel || ' '}</AppText>
      <AppText variant="display">Overview</AppText>

      {isLoading ? <LoadingBody /> : error ? (
        <ErrorState title="Couldn't load the overview" body={errorMessage(error)} action="Try again" onAction={refetch} />
      ) : (
        <>
          <HeroCard style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={styles.flex}>
                <AppText variant="body" color={colors.onTealMuted} style={styles.heroLabel}>{r.month} rent roll</AppText>
                <AppText variant="monoXl" color="white" style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>{inr(r.amount)}</AppText>
                <AppText variant="body" color={colors.onTealMuted}>{r.leases} lease{r.leases === 1 ? '' : 's'}, {r.sqft.toLocaleString('en-IN')} sq ft</AppText>
              </View>
              <Donut size={70} stroke={8} segments={[{ value: r.paidPct, color: colors.white }, { value: r.processPct, color: '#8FD3C7' }, { value: r.overduePct, color: '#E8956B' }, { value: Math.max(0, 100 - r.paidPct - r.processPct - r.overduePct), color: 'rgba(255,255,255,0.18)' }]} track="rgba(255,255,255,0.18)">
                <AppText variant="title" color="white" style={styles.donutText}>{r.paidPct}%</AppText>
              </Donut>
            </View>
            <View style={styles.heroLine} />
            <View style={styles.legendRow}>
              <Legend color={colors.white} label={`Paid ${r.paidPct}%`} />
              <Legend color="#8FD3C7" label={`In process ${r.processPct}%`} />
              <Legend color="#E8956B" label={`Overdue ${r.overduePct}%`} />
            </View>
          </HeroCard>

          <View style={styles.tiles}>
            <Tile tone="amber" label="Payable to owners" value={inr(t.payable.amount)} sub={t.payable.overdue ? `${inr(t.payable.overdue)} overdue` : `${t.payable.invoices} invoice${t.payable.invoices === 1 ? '' : 's'} open`} subTone={t.payable.overdue ? 'coral' : undefined} onPress={() => nav.navigate('Invoices')} />
            <Tile tone="coral" label="Open repairs" value={String(t.repairs.open)} sub={t.repairs.pastSla ? `${t.repairs.pastSla} past SLA` : t.repairs.critical ? `${t.repairs.critical} critical` : 'None past SLA'} subTone={t.repairs.pastSla ? 'coral' : undefined} onPress={() => nav.navigate('Repairs')} />
          </View>
          <View style={styles.tiles}>
            <Tile tone="mist" label="Deposits held" value={inr(t.deposits.held)} sub={`${t.deposits.leases} lease${t.deposits.leases === 1 ? '' : 's'}`} onPress={() => nav.navigate('Deposits')} />
            <Tile tone="blue" label="Site pipeline" value={String(t.pipeline.sites)} sub={t.pipeline.waiting ? `${t.pipeline.waiting} waiting for approval` : 'None waiting'} onPress={() => nav.navigate('SiteScouting')} />
          </View>

          <SectionHeader title="Needs you today" action={data.data.needsTotal ? `All ${data.data.needsTotal}` : undefined} actionColor="muted" />
          {data.data.needs.length ? data.data.needs.map((it, i) => (
            <ListRow key={it.key} left={<CountBadge n={it.n} tone={it.tone} />} title={it.title} sub={it.sub} chevron onPress={() => openNeed(it)} divider={i < data.data.needs.length - 1} />
          )) : <AppText variant="body" color="muted" style={styles.none}>Nothing is waiting for you. {isFetching ? 'Refreshing…' : ''}</AppText>}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: vs(6) },
  who: { flexDirection: 'row', alignItems: 'center', gap: s(12), flex: 1 },
  whoText: { fontSize: ms(15), flexShrink: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  bellDot: { position: 'absolute', top: ms(9), right: ms(9), width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: colors.amber },
  date: { marginTop: vs(20), fontSize: ms(15) },
  hero: { marginTop: vs(16) },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  heroLabel: { fontSize: ms(15) },
  heroAmount: { marginVertical: vs(4) },
  donutText: { fontSize: ms(16) },
  heroLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: vs(18), marginBottom: vs(14) },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: s(10) },
  legend: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  legendDot: { width: ms(10), height: ms(10), borderRadius: ms(3) },
  legendText: { fontSize: ms(13.5) },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(12) },
  half: { flex: 1 },
  flex: { flex: 1 },
  skelRow: { flexDirection: 'row', gap: s(14), alignItems: 'center', marginTop: vs(26) },
  skelGap: { marginTop: vs(10) },
  none: { paddingVertical: vs(12) },
});
