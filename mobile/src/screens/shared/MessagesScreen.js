/* Messages tab from GET /mobile/threads: one conversation per property with the owners' avatars, the last line,
   when, and the unread count. Refreshes when the tab comes back into view. */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, ms, vs } from '../../theme';
import { Screen, AppText, ListRow, AvatarGroup, Input, Skeleton, ErrorState, EmptyState } from '../../components';
import { useThreadsQuery, errorMessage } from '../../store/api';

/** "10:31" today, "Yesterday", a weekday within the week, else "05 Oct". */
export function whenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function MessagesScreen() {
  const nav = useNavigation();
  const { data, isLoading, error, refetch, isFetching } = useThreadsQuery();
  const [q, setQ] = useState('');
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
  const d = data?.data;
  const list = (d?.threads || []).filter(t => !q || `${t.title} ${t.code} ${t.city} ${t.people.map(p => p.name).join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const preview = t => (t.last ? `${t.last.from === d.side ? 'You: ' : ''}${t.last.kind && t.last.kind !== 'Message' ? `${t.last.kind}: ` : ''}${t.last.text || (t.last.files ? 'Attachment' : '')}` : 'No messages yet');
  return (
    <Screen tabs>
      <AppText variant="display" style={styles.title}>Messages</AppText>
      {d?.unread ? <AppText variant="body" color="muted" style={styles.sub}>{data.message}</AppText> : null}
      {(d?.threads || []).length > 5 ? <Input value={q} onChangeText={setQ} placeholder="Search property or owner" compact style={styles.search} /> : null}
      {isLoading ? <><Skeleton h={64} r={16} style={styles.skel} /><Skeleton h={64} r={16} style={styles.skel} /><Skeleton h={64} r={16} style={styles.skel} /></>
        : error && !d ? <ErrorState title="Couldn't load messages" body={errorMessage(error)} action="Try again" onAction={refetch} />
          : !list.length ? <EmptyState title={q ? 'No match' : 'No conversations yet'} body={q ? 'Try another name.' : 'Open a property and tap Message to start one.'} />
            : list.map((t, i) => (
              <ListRow key={t.propertyId} left={<AvatarGroup people={t.people.map(p => ({ initials: p.initials }))} size={40} />} title={t.title} sub={preview(t)} subColor={t.unread ? 'ink' : 'muted'}
                onPress={() => nav.navigate('Thread', { propertyId: t.propertyId })} divider={i < list.length - 1}
                right={(
                  <View style={styles.right}>
                    <AppText variant="small" color={t.unread ? 'teal' : 'muted'}>{whenLabel(t.last?.at)}</AppText>
                    {t.unread ? <View style={styles.unread}><AppText variant="captionSemi" color="white">{t.unread}</AppText></View> : null}
                  </View>
                )} />
            ))}
      {isFetching && !isLoading ? <AppText variant="caption" color="muted" center style={styles.skel}>Refreshing…</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(14), marginBottom: vs(6) },
  sub: { marginBottom: vs(8) },
  search: { marginBottom: vs(10) },
  skel: { marginTop: vs(12) },
  right: { alignItems: 'flex-end', gap: vs(6) },
  unread: { minWidth: ms(22), height: ms(22), borderRadius: ms(11), backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(6) },
});
