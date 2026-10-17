/* Checklist area (design p.21 "Offline"): offline banner, area title, progress, item cards with waiting photos,
   Save and next item; works without a connection. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { s, vs } from '../../theme';
import { Screen, AppText, Header, Banner, ProgressBar, Card, Chip, Arch, Footer, Button } from '../../components';
import { offlineArea } from '../../mock/data';

export default function InspectionAreaScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const ui = useAppSelector(st => st.ui);
  const offline = route.params?.offline ?? ui.offline; // the Inspect list opens it in the offline state the design shows
  return (
    <Screen padded={false} edges={offline ? ['left', 'right'] : undefined} footer={(
      <Footer hint="Signing off needs a connection. Everything else works now." stacked>
        <Button title="Save and next item" variant="primary" onPress={() => nav.navigate('InspectionItem')} />
      </Footer>
    )}>
      {offline ? <Banner lead="You're offline." text={`${ui.pendingChanges} changes and ${ui.pendingPhotos} photos are saved on this phone and will upload when you're back online.`} style={styles.banner} /> : null}
      <View style={styles.pad}>
        <Header heading={offlineArea.area} sub={offlineArea.title} back={!offline} style={offline && styles.noBack} />
        <ProgressBar value={offlineArea.progress} height={6} style={styles.progress} />
        {offlineArea.items.map(it => (
          <Card key={it.title} outlined style={styles.item} onPress={() => nav.navigate('InspectionItem')}>
            <View style={styles.itemHead}>
              <AppText variant="title" style={styles.flex}>{it.title}</AppText>
              <Chip label={it.chip} tone={it.tone} size="sm" />
            </View>
            {it.photos ? (
              <View style={styles.photos}>
                {Array.from({ length: it.photos }).map((_, i) => (
                  <Arch key={i} photo width={64} height={70} bottomRadius={12}>
                    <View style={styles.waiting}><AppText variant="captionSemi" color="white">Waiting</AppText></View>
                  </Arch>
                ))}
              </View>
            ) : null}
            {it.value ? <AppText variant="mono" color="muted" style={styles.sub}>{it.value}</AppText> : null}
            {it.sub ? <AppText variant="small" color="muted" style={styles.sub}>{it.sub}</AppText> : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { paddingTop: vs(54) },
  pad: { paddingHorizontal: s(20) },
  noBack: { marginLeft: 0 },
  title: { marginTop: -vs(6) },
  progress: { marginTop: vs(12), marginBottom: vs(16) },
  item: { marginTop: vs(12) },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  photos: { flexDirection: 'row', gap: s(10), marginTop: vs(12) },
  waiting: { position: 'absolute', bottom: 6, alignSelf: 'center', backgroundColor: 'rgba(16,32,30,0.8)', borderRadius: 999, paddingHorizontal: s(8), paddingVertical: 2 },
  sub: { marginTop: vs(8) },
  flex: { flex: 1 },
});
