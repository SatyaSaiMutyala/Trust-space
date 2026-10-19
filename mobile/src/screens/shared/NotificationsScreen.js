/* Notifications from GET /mobile/notifications: one row per event, newest first, unread marked with a dot. Tap opens the
   thing it is about and marks it read; ✕ deletes a row; "Delete all" clears the feed after a confirmation; the latest
   few show first with "View all" for the rest. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, tones, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Icon, IconButton, EmptyState, ErrorState, ConfirmDialog, Skeleton } from '../../components';
import { useNotificationsQuery, useNotificationsReadMutation, useNotificationDeleteMutation, useNotificationsClearMutation, errorMessage } from '../../store/api';

const SHOW = 6;
const PARAM = { ToApprove: 'id', TicketDetail: 'id', SignOff: 'id', SiteEvaluation: 'id', Thread: 'propertyId', Invoices: null };

export default function NotificationsScreen() {
  const nav = useNavigation();
  const { data, isLoading, error, refetch } = useNotificationsQuery();
  const [markRead] = useNotificationsReadMutation();
  const [remove] = useNotificationDeleteMutation();
  const [clear, clearState] = useNotificationsClearMutation();
  const [all, setAll] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const items = data?.data?.items || [];
  const unread = data?.data?.unread || 0;
  const shown = all ? items : items.slice(0, SHOW);
  const open = n => { if (!n.read) markRead([n.id]); const k = PARAM[n.to]; nav.navigate(n.to, k && n.ref ? { [k]: n.ref } : undefined); };
  return (
    <Screen>
      <Header heading="Notifications" sub={isLoading ? '' : unread ? `${unread} unread` : items.length ? 'All read' : ''}
        right={items.length ? (
          <View style={styles.actions}>
            {unread ? <Pressable onPress={() => markRead()} hitSlop={8}><AppText variant="smallSemi" color="teal">Read all</AppText></Pressable> : null}
            <Pressable onPress={() => setAskClear(true)} hitSlop={8}><AppText variant="smallSemi" color="coralInk">Delete all</AppText></Pressable>
          </View>
        ) : null} />
      {isLoading ? [0, 1, 2].map(i => <View key={i} style={styles.skel}><Skeleton circle size={40} /><View style={styles.flex}><Skeleton w="70%" h={14} /><Skeleton w="50%" h={12} style={styles.skelGap} /></View></View>)
        : error ? <ErrorState title="Couldn't load notifications" body={errorMessage(error)} action="Try again" onAction={refetch} />
          : !items.length ? <EmptyState title="Nothing new" body="You are up to date. New approvals, repairs and messages will show here." /> : (
            <>
              {shown.map((n, i) => {
                const t = tones[n.tone] || tones.grey;
                return (
                  <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button" style={({ pressed }) => [styles.row, i < shown.length - 1 && styles.divider, !n.read && styles.unreadRow, pressed && styles.pressed]}>
                    <View style={[styles.icon, { backgroundColor: t.bg }]}><Icon name={n.icon} size={20} color={t.dot} /></View>
                    <View style={styles.flex}>
                      <View style={styles.titleRow}>
                        {!n.read ? <View style={styles.dot} /> : null}
                        <AppText variant={n.read ? 'body' : 'bodySemi'} numberOfLines={1} style={styles.flex}>{n.title}</AppText>
                        <AppText variant="caption" color="muted">{n.when}</AppText>
                      </View>
                      <AppText variant="small" color="muted" numberOfLines={2} style={styles.sub}>{n.sub}</AppText>
                    </View>
                    <IconButton name="x" size={32} iconSize={16} color={colors.muted} onPress={() => remove(n.id)} accessibilityLabel={`Delete: ${n.title}`} />
                  </Pressable>
                );
              })}
              {items.length > SHOW ? (
                <Pressable onPress={() => setAll(a => !a)} hitSlop={8} style={styles.viewAll}>
                  <AppText variant="smallSemi" color="teal">{all ? 'Show less' : `View all ${items.length}`}</AppText>
                </Pressable>
              ) : null}
            </>
          )}
      <ConfirmDialog open={askClear} icon="alert-triangle" tone="danger" title="Delete all notifications?" text="This clears your list. Nothing else changes." confirmLabel="Delete all" loading={clearState.isLoading} onCancel={() => setAskClear(false)} onConfirm={async () => { await clear(); setAskClear(false); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: s(14) },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingVertical: vs(12), marginHorizontal: -s(8), paddingHorizontal: s(8), borderRadius: ms(12) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft, borderRadius: 0 },
  unreadRow: { backgroundColor: '#F7FBFA' },
  pressed: { opacity: 0.8 },
  icon: { width: ms(40), height: ms(40), borderRadius: ms(20), alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  dot: { width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: colors.teal },
  sub: { marginTop: vs(2) },
  viewAll: { alignSelf: 'center', paddingVertical: vs(16) },
  skel: { flexDirection: 'row', gap: s(14), alignItems: 'center', paddingVertical: vs(14) },
  skelGap: { marginTop: vs(8) },
  flex: { flex: 1 },
});
