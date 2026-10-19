/* One checklist section (design p.21): offline banner when changes wait on this phone, section title, progress, one
   card per item with its condition, value, remark and photos ("Waiting" on photos not uploaded yet). Tap an item to
   record it; "Save and next item" opens the first one still to do. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Banner, ProgressBar, Card, Chip, Arch, Footer, Button, Skeleton, ErrorState } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useInspection } from '../../store/useInspection';
import { COND_TONE, RESP_LABEL, photoUri, itemDone, kindLabel } from './inspectionUi';

export default function InspectionAreaScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { id, sec: secName } = route.params || {};
  const { mediaToken } = useAppSelector(st => st.auth);
  const { view, inspection: I, isLoading, error, refetch, pending, offline } = useInspection(id);
  const sec = view?.sections.find(x => x.s === secName) || view?.sections[0];
  const items = sec?.items || [];
  const todo = items.find(it => !itemDone(it));
  const canEdit = !!view?.canEdit;
  return (
    <Screen padded={false} edges={offline || pending ? ['left', 'right'] : undefined} footer={canEdit && items.length ? (
      <Footer hint={offline ? 'Signing off needs a connection. Everything else works now.' : undefined} stacked>
        <Button title={todo ? 'Record next item' : 'All recorded — back to inspection'} variant="primary" onPress={() => (todo ? nav.navigate('InspectionItem', { id, k: todo.k }) : nav.goBack())} />
      </Footer>
    ) : null}>
      {offline || pending ? <Banner lead={offline ? "You're offline." : 'Uploading.'} text={`${pending || 'No'} change${pending === 1 ? '' : 's'} saved on this phone${offline ? ' and will upload when you are back online' : ''}.`} style={styles.banner} /> : null}
      <View style={styles.pad}>
        {isLoading ? <><Header heading="Checklist" /><Skeleton h={120} r={20} style={styles.item} /></>
          : error || !view ? <><Header heading="Checklist" /><ErrorState title="Couldn't open this section" body={error || 'Not found'} action="Try again" onAction={refetch} /></> : (
            <>
              <Header heading={sec.s} sub={`${view.property?.name || ''} ${kindLabel(I.kind)}`} />
              <ProgressBar value={sec.total ? sec.done / sec.total : 0} height={6} style={styles.progress} />
              {!items.length ? <AppText variant="body" color="muted">No fixtures listed yet. Add them from the inspection screen.</AppText> : null}
              {items.map(it => {
                const done = itemDone(it); const photos = it.photos || [];
                return (
                  <Card key={it.k} outlined style={styles.item} onPress={() => nav.navigate('InspectionItem', { id, k: it.k })}>
                    <View style={styles.itemHead}>
                      <AppText variant="title" style={styles.flex}>{it.label || 'Fixture'}{it.type === 'fixture' && it.qty ? ` × ${it.qty}` : ''}</AppText>
                      <Chip label={it.cond || (done ? 'Recorded' : 'To do')} tone={it.cond ? COND_TONE[it.cond] : done ? 'teal' : 'grey'} size="sm" />
                    </View>
                    {photos.length ? (
                      <View style={styles.photos}>
                        {photos.slice(0, 4).map((p, i) => (
                          <Arch key={i} photo width={64} height={70} bottomRadius={12} uri={photoUri(p, mediaToken)}>
                            {p.local ? <View style={styles.waiting}><AppText variant="captionSemi" color="white">Waiting</AppText></View> : null}
                          </Arch>
                        ))}
                        {photos.length > 4 ? <AppText variant="small" color="muted" style={styles.more}>+{photos.length - 4}</AppText> : null}
                      </View>
                    ) : null}
                    {it.type === 'count' || it.type === 'reading' ? <AppText variant="mono" color={it.val ? 'ink' : 'muted'} style={styles.sub}>{it.val ? `${it.val}${it.type === 'reading' && /kWh/.test(it.label) ? ' kWh' : ''}` : 'Value not recorded'}</AppText> : null}
                    {it.remark ? <AppText variant="small" color="muted" style={styles.sub}>{it.remark}</AppText> : null}
                    {I.kind === 'Move-out' && it.resp ? <AppText variant="small" color="muted" style={styles.sub}>{RESP_LABEL[it.resp]}{it.resp === 'TrustLab' && it.deduct ? ` · ₹${Math.round(it.deduct).toLocaleString('en-IN')}` : ''}</AppText> : null}
                    {!done && it.req ? <AppText variant="small" color="amberInk" style={styles.sub}>Photo required</AppText> : null}
                  </Card>
                );
              })}
            </>
          )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { paddingTop: vs(54) },
  pad: { paddingHorizontal: s(20) },
  progress: { marginTop: vs(12), marginBottom: vs(16) },
  item: { marginTop: vs(12) },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  photos: { flexDirection: 'row', alignItems: 'center', gap: s(10), marginTop: vs(12) },
  waiting: { position: 'absolute', bottom: 6, alignSelf: 'center', backgroundColor: 'rgba(16,32,30,0.8)', borderRadius: 999, paddingHorizontal: s(8), paddingVertical: 2 },
  more: { marginLeft: s(4) },
  sub: { marginTop: vs(8) },
  flex: { flex: 1 },
});
