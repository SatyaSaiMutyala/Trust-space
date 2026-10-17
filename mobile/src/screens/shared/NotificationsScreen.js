/* Notifications: what changed since you last looked. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tones, ms, vs } from '../../theme';
import { Screen, AppText, Header, ListRow, Icon } from '../../components';
import { notifications } from '../../mock/data';

export default function NotificationsScreen() {
  const nav = useNavigation();
  return (
    <Screen>
      <Header />
      <AppText variant="display" style={styles.title}>Notifications</AppText>
      {notifications.map((n, i) => {
        const t = tones[n.tone] || tones.grey;
        return (
          <ListRow key={i} left={<View style={[styles.icon, { backgroundColor: t.bg }]}><Icon name={n.icon} size={22} color={t.dot} /></View>} title={n.title} sub={n.sub} chevron onPress={() => nav.goBack()} divider={i < notifications.length - 1} />
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4), marginBottom: vs(8) },
  icon: { width: ms(44), height: ms(44), borderRadius: ms(22), alignItems: 'center', justifyContent: 'center' },
});
