/* Notifications: one row per event, newest first, unread marked with a dot. Tap opens the thing it is about; the ✕ on
   a row deletes it; "Delete all" clears the list after a confirmation; "View all" shows older ones beyond the latest. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, tones, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Icon, IconButton, EmptyState, ConfirmDialog } from '../../components';
import { notifications as sample } from '../../mock/data';

const SHOW = 5;

export default function NotificationsScreen() {
  const nav = useNavigation();
  const [items, setItems] = useState(sample);
  const [all, setAll] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const unread = items.filter(n => !n.read).length;
  const shown = all ? items : items.slice(0, SHOW);
  const open = n => { setItems(xs => xs.map(x => (x.id === n.id ? { ...x, read: true } : x))); if (n.to) nav.navigate(n.to); };
  const remove = id => setItems(xs => xs.filter(x => x.id !== id));
  return (
    <Screen>
      <Header heading="Notifications" sub={unread ? `${unread} unread` : 'All read'}
        right={items.length ? <Pressable onPress={() => setAskClear(true)} hitSlop={8}><AppText variant="smallSemi" color="coralInk">Delete all</AppText></Pressable> : null} />
      {!items.length ? (
        <EmptyState title="Nothing new" body="You are up to date. New approvals, repairs and messages will show here." />
      ) : (
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
      <ConfirmDialog open={askClear} icon="alert-triangle" tone="danger" title="Delete all notifications?" text="This clears the list on this phone. Nothing else changes." confirmLabel="Delete all" onCancel={() => setAskClear(false)} onConfirm={() => { setAskClear(false); setItems([]); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingVertical: vs(12), marginHorizontal: -s(8), paddingHorizontal: s(8), borderRadius: ms(12) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft, borderRadius: 0 },
  unreadRow: { backgroundColor: '#F7FBFA' },
  pressed: { opacity: 0.8 },
  icon: { width: ms(40), height: ms(40), borderRadius: ms(20), alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  dot: { width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: colors.teal },
  sub: { marginTop: vs(2) },
  viewAll: { alignSelf: 'center', paddingVertical: vs(16) },
  flex: { flex: 1 },
});
