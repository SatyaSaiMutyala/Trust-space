/* Add a location (staff site scouting and franchise partners): name, town, type, address, measurements, photos, why it suits. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Input, FilterChip, PhotoArch, Footer, Button } from '../../components';
import { siteForm } from '../../mock/data';

export default function AddSiteScreen() {
  const nav = useNavigation();
  const role = useAppSelector(st => st.auth.role);
  const [f, setF] = useState({ name: '', town: siteForm.towns[0], type: siteForm.types[0], address: '', sqft: '', rent: '', frontage: '', floor: siteForm.floors[0], why: '' });
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  return (
    <Screen footer={(
      <Footer hint="Saved on this phone as you type. You can finish the evaluation later.">
        <Button title="Save draft" variant="secondary" full onPress={() => nav.goBack()} />
        <Button title={role === 'franchise' ? 'Send for review' : 'Start evaluation'} variant="primary" full onPress={() => nav.replace('SiteEvaluation')} />
      </Footer>
    )}>
      <Header />
      <AppText variant="body" color="muted" style={styles.eyebrow}>{role === 'franchise' ? 'A place you have found' : 'Site scouting'}</AppText>
      <AppText variant="display" style={styles.title}>Add a location</AppText>
      <Input label="Name or landmark" value={f.name} onChangeText={set('name')} placeholder="e.g. Ramnagar main road" autoCapitalize="words" style={styles.field} />
      <Input label="Town" select value={f.town} onPress={() => {}} style={styles.field} />
      <AppText variant="label" style={styles.label}>What will it be?</AppText>
      <View style={styles.chips}>{siteForm.types.map(t => <FilterChip key={t} label={t} size="lg" selected={f.type === t} onPress={() => set('type')(t)} />)}</View>
      <Input label="Address" value={f.address} onChangeText={set('address')} multiline placeholder="Door number, street, landmark" autoCapitalize="sentences" style={styles.field} />
      <View style={styles.row}>
        <Input label="Measured sq ft" value={f.sqft} onChangeText={set('sqft')} keyboardType="numeric" placeholder="812" style={styles.half} />
        <Input label="Rent asked" prefix="₹" value={f.rent} onChangeText={set('rent')} keyboardType="numeric" placeholder="38,000" style={styles.half} />
      </View>
      <View style={styles.row}>
        <Input label="Frontage, ft" value={f.frontage} onChangeText={set('frontage')} keyboardType="numeric" placeholder="22" style={styles.half} />
        <Input label="Floor" select value={f.floor} onPress={() => {}} style={styles.half} />
      </View>
      <AppText variant="label" style={styles.label}>Photos and video</AppText>
      <View style={styles.photos}>
        <PhotoArch state="needed" label="Front view" sub="Needed" ratio={1} onPress={() => {}} style={styles.flex} />
        <PhotoArch state="optional" label="Walk-around video" sub="Optional, 2 min" ratio={1} onPress={() => {}} style={styles.flex} />
      </View>
      <Input label="Why it suits" value={f.why} onChangeText={set('why')} multiline placeholder="Hospitals and clinics nearby, parking, visibility…" autoCapitalize="sentences" style={styles.field} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: ms(15) },
  title: { marginTop: vs(2), marginBottom: vs(16) },
  field: { marginBottom: vs(18) },
  label: { marginBottom: vs(10) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginBottom: vs(20) },
  row: { flexDirection: 'row', gap: s(12) },
  half: { flex: 1, marginBottom: vs(18) },
  photos: { flexDirection: 'row', gap: s(12), marginBottom: vs(20) },
  flex: { flex: 1 },
});
