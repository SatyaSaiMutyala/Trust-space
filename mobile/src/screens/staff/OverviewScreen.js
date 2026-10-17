/* Staff home (design p.2): who/date, hero rent roll with donut, four tiles, "Needs you today" list.
   Shows the loading skeleton layout (design p.21) for the first moment. */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Avatar, IconButton, HeroCard, Donut, Tile, ListRow, CountBadge, SectionHeader, Skeleton } from '../../components';
import { overview, staffUser } from '../../mock/data';
import { useAppSelector } from '../../store/hooks';

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
      <Skeleton h={190} r={24} tone="mist" style={styles.hero} />
      <View style={styles.tiles}><Skeleton h={112} r={20} style={styles.half} /><Skeleton h={112} r={20} style={styles.half} /></View>
      <View style={styles.tiles}><Skeleton h={112} r={20} style={styles.half} /><Skeleton h={112} r={20} style={styles.half} /></View>
      {[0, 1].map(i => (
        <View key={i} style={styles.skelRow}>
          <Skeleton circle size={44} />
          <View style={styles.flex}><Skeleton w="70%" h={14} /><Skeleton w="45%" h={12} style={styles.skelGap} /></View>
        </View>
      ))}
      <AppText variant="small" color="muted" center style={styles.updating}>Updating. Showing figures from 08:14 today.</AppText>
    </View>
  );
}

export default function OverviewScreen() {
  const nav = useNavigation();
  const user = useAppSelector(st => st.auth.user) || staffUser;
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, []);
  const r = overview.rentRoll;
  return (
    <Screen tabs>
      <View style={styles.top}>
        <Pressable style={styles.who} accessibilityRole="button" accessibilityLabel="Profile">
          <Avatar initials={user.initials || 'RT'} tone="mist" size={34} />
          <AppText variant="body" color="muted" style={styles.whoText} numberOfLines={1}>{user.name}, {user.team || 'Facilities'}</AppText>
        </Pressable>
        <View style={styles.topRight}>
          <IconButton name="search" onPress={() => nav.navigate('Search')} iconSize={24} accessibilityLabel="Search" />
          <View>
            <IconButton name="bell" onPress={() => nav.navigate('Notifications')} iconSize={24} accessibilityLabel="Notifications" />
            <View style={styles.bellDot} />
          </View>
        </View>
      </View>
      <AppText variant="body" color="muted" style={styles.date}>{overview.date}</AppText>
      <AppText variant="display">Overview</AppText>

      {loading ? <LoadingBody /> : (
        <>
          <HeroCard style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={styles.flex}>
                <AppText variant="body" color={colors.onTealMuted} style={styles.heroLabel}>{r.month} rent roll</AppText>
                <AppText variant="monoXl" color="white" style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>{r.amount}</AppText>
                <AppText variant="body" color={colors.onTealMuted}>{r.leases} leases, {r.sqft} sq ft</AppText>
              </View>
              <Donut size={70} stroke={8} segments={[{ value: r.paidPct, color: colors.white }, { value: r.processPct, color: '#8FD3C7' }, { value: r.overduePct, color: '#E8956B' }]} track="rgba(255,255,255,0.18)">
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
            <Tile {...overview.tiles[0]} onPress={() => nav.navigate('Invoices')} />
            <Tile {...overview.tiles[1]} onPress={() => nav.navigate('Repairs')} />
          </View>
          <View style={styles.tiles}>
            <Tile {...overview.tiles[2]} onPress={() => nav.navigate('Deposits')} />
            <Tile {...overview.tiles[3]} onPress={() => nav.navigate('SiteScouting')} />
          </View>

          <SectionHeader title="Needs you today" action={`All ${overview.needsTotal}`} onAction={() => {}} />
          {overview.needs.map((it, i) => (
            <ListRow key={i} left={<CountBadge n={it.n} tone={it.tone} />} title={it.title} sub={it.sub} chevron onPress={() => nav.navigate(it.to)} divider={i < overview.needs.length - 1} />
          ))}
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
  updating: { marginTop: vs(40) },
});
