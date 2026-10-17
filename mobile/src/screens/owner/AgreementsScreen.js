/* Agreements and documents for the owner, grouped by property, each downloadable. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, vs } from '../../theme';
import { Screen, AppText, Header, Icon, IconButton, ListRow, Chip } from '../../components';
import { agreements } from '../../mock/data';

export default function AgreementsScreen() {
  return (
    <Screen>
      <Header heading="Agreements" />
      {agreements.map(g => (
        <View key={g.group}>
          <AppText variant="title" color="muted" style={styles.group}>{g.group}</AppText>
          {g.items.map((d, i) => (
            <ListRow key={d.title} left={<View style={styles.icon}><Icon name={d.icon} size={22} color={colors.teal} /></View>} title={d.title} sub={d.sub} divider={i < g.items.length - 1}
              right={d.chip ? <Chip label={d.chip} tone={d.tone} size="sm" /> : <IconButton name="download" variant="sunk" size={40} iconSize={20} color={colors.teal} onPress={() => {}} accessibilityLabel={`Download ${d.title}`} />} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4) },
  group: { marginTop: vs(22), marginBottom: vs(2), fontSize: ms(15) },
  icon: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
