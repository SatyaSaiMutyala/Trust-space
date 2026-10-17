/* Messages tab: threads with stacked avatars, last line, time and unread count. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, vs } from '../../theme';
import { Screen, AppText, ListRow, AvatarGroup } from '../../components';
import { threadsList } from '../../mock/data';

export default function MessagesScreen() {
  const nav = useNavigation();
  return (
    <Screen tabs>
      <AppText variant="display" style={styles.title}>Messages</AppText>
      {threadsList.map((t, i) => (
        <ListRow key={t.title} left={<AvatarGroup people={t.avatars} size={40} />} title={t.title} sub={t.sub} onPress={() => nav.navigate('Thread')} divider={i < threadsList.length - 1}
          right={(
            <>
              <AppText variant="small" color="muted">{t.when}</AppText>
              {t.unread ? <View style={styles.unread}><AppText variant="captionSemi" color="white">{t.unread}</AppText></View> : null}
            </>
          )} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(14), marginBottom: vs(6) },
  unread: { minWidth: ms(22), height: ms(22), borderRadius: ms(11), backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ms(6) },
});
