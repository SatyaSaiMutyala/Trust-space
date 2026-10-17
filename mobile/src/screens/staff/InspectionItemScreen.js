/* Inspection item (design p.11): photo header with close / camera and the Take-over / Today toggle, white sheet with
   progress segments, item name, condition chips, Who pays?, Remarks, Skip / Save, next item. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, IconButton, Segmented, ProgressSegments, ChoiceChip, Input, Footer, Button, PhotoGradient } from '../../components';
import { inspection } from '../../mock/data';

export default function InspectionItemScreen() {
  const nav = useNavigation();
  const [when, setWhen] = useState('today');
  const [choice, setChoice] = useState('Damaged');
  const [payer, setPayer] = useState('deposit');
  const [remark, setRemark] = useState(inspection.remark);
  const needsPayer = ['Damaged', 'Missing', 'Minor issue'].includes(choice);
  return (
    <Screen padded={false} edges={['left', 'right']} footer={(
      <Footer>
        <Button title="Skip" variant="secondary" onPress={() => {}} style={styles.skip} />
        <Button title="Save, next item" variant="primary" full onPress={() => nav.navigate('AreaPhotos')} />
      </Footer>
    )}>
      <View style={styles.photo}>
        <PhotoGradient dark />
        <View style={styles.door}><View style={styles.doorLeaf} /><View style={styles.doorLeaf} /></View>
        <View style={styles.photoBar}>
          <IconButton name="x" variant="dark" onPress={() => nav.goBack()} accessibilityLabel="Close" />
          <View style={styles.flex}>
            <AppText variant="title" color="white">{inspection.title}</AppText>
            <AppText variant="small" color={colors.onTealMuted}>{inspection.done}</AppText>
          </View>
          <IconButton name="camera" variant="dark" onPress={() => {}} accessibilityLabel="Take photo" />
        </View>
        <Segmented tone="dark" shape="pill" compact value={when} onChange={setWhen} style={styles.toggle} options={[{ label: 'Take-over', value: 'takeover' }, { label: 'Today', value: 'today' }]} />
      </View>
      <View style={styles.sheet}>
        <ProgressSegments items={inspection.segments.map(v => ({ value: v }))} height={7} />
        <AppText variant="body" color="muted" style={styles.group}>{inspection.group}</AppText>
        <AppText variant="h1" style={styles.item}>{inspection.item}</AppText>
        <AppText variant="body" color="muted" style={styles.takeover}>At take-over: <AppText variant="bodySemi" color="teal">{inspection.takeover}</AppText>, {inspection.takeoverWhen}</AppText>
        <AppText variant="h4" weight="semibold" style={styles.label}>Condition today</AppText>
        <View style={styles.choices}>{inspection.choices.map(c => <ChoiceChip key={c} label={c} selected={choice === c} onPress={() => setChoice(c)} />)}</View>
        {needsPayer ? (
          <>
            <AppText variant="h4" weight="semibold" style={styles.label}>Who pays?</AppText>
            <Segmented value={payer} onChange={setPayer} options={inspection.payers} />
          </>
        ) : null}
        <AppText variant="h4" weight="semibold" style={styles.label}>Remarks</AppText>
        <Input value={remark} onChangeText={setRemark} multiline placeholder="What did you see?" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { height: vs(260), backgroundColor: colors.photoDark, overflow: 'hidden' },
  door: { position: 'absolute', left: '28%', right: '28%', top: '12%', bottom: -20, flexDirection: 'row', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 8 },
  doorLeaf: { flex: 1, borderRightWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  photoBar: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(14), paddingTop: vs(54) },
  toggle: { position: 'absolute', bottom: vs(26), alignSelf: 'center', width: s(200) },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: ms(28), borderTopRightRadius: ms(28), marginTop: -vs(24), paddingHorizontal: gutter, paddingTop: vs(20) },
  group: { marginTop: vs(22), fontSize: ms(15) },
  item: { marginTop: vs(2) },
  takeover: { marginTop: vs(6), fontSize: ms(15) },
  label: { marginTop: vs(24), marginBottom: vs(12), fontSize: ms(17) },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10) },
  skip: { paddingHorizontal: s(22) },
  flex: { flex: 1 },
});
