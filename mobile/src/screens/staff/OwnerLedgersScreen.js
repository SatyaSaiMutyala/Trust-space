/* Owner ledger (design p.21 "Error"): what went wrong, Try again; a toast for an oversized upload. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '../../theme';
import { Screen, AppText, Header, ErrorState, Toast, ListRow, Chip, Tile } from '../../components';
import { invoicesList } from '../../mock/data';

export default function OwnerLedgersScreen() {
  const [failed, setFailed] = useState(true);
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <Header />
      <AppText variant="display" style={styles.title}>Owner ledger</AppText>
      {failed ? (
        <>
          <ErrorState title="Couldn't load this ledger" body="The server took too long to reply. Your filters are kept. Try again, or check back in a few minutes." action="Try again" onAction={() => setFailed(false)} />
          <View style={[styles.toastWrap, { bottom: insets.bottom + vs(16) }]}>
            <Toast lead="The video is 26 MB." text="Files can be up to 20 MB. Record a shorter clip or switch to 720p." />
          </View>
        </>
      ) : (
        <>
          <AppText variant="body" color="muted" style={styles.sub}>K. Srinivasa Rao · FY 26-27</AppText>
          <View style={styles.tiles}>
            <Tile tone="mist" label="Paid" value="₹15,60,000" compact />
            <Tile tone="blue" label="In process" value="₹2,59,200" compact />
          </View>
          {invoicesList.map((x, i) => <ListRow key={i} title={x.sub.split(' · ')[1]} sub={x.sub.split(' · ')[0]} right={<><AppText variant="monoMd">{x.amount}</AppText><Chip label={x.chip} tone={x.tone} size="sm" /></>} divider={i < invoicesList.length - 1} />)}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4) },
  sub: { marginTop: vs(4), fontSize: ms(15) },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(16), marginBottom: vs(8) },
  toastWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: s(4) },
});
