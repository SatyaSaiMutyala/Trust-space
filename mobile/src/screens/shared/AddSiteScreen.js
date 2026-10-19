/* Add a location → POST /sites under a scouting requirement: name, where, type, measurements, rent asked, owner, why
   it suits. Then straight into the evaluation. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Input, FilterChip, Footer, Button, Dropdown } from '../../components';
import { useListQuery, useCreateRecordMutation, errorMessage, todayISO } from '../../store/api';
import { useAppSelector } from '../../store/hooks';

const TYPES = ['Collection centre', 'Laboratory', 'Polyclinic', 'Hospital'];
const FLOORS = ['Ground floor', '1st floor', 'Ground + 1st', 'Basement + ground'];

export default function AddSiteScreen() {
  const nav = useNavigation();
  const { user, role } = useAppSelector(st => st.auth);
  const reqs = useListQuery({ resource: 'reqs', params: { status: 'Open', limit: 50 } });
  const last = useListQuery({ resource: 'sites', params: { sort: 'code', order: 'desc', limit: 1 } });
  const [create, state] = useCreateRecordMutation();
  const [f, setF] = useState({ reqId: '', name: '', locality: '', purpose: TYPES[0], address: '', area: '', measuredArea: '', quotedRent: '', quotedDeposit: '', frontage: '', floor: FLOORS[0], ownerName: '', why: '' });
  const [errors, setErrors] = useState({});
  const set = k => v => { setF(x => ({ ...x, [k]: v })); setErrors(e => ({ ...e, [k]: undefined, form: undefined })); };
  const reqList = reqs.data?.data || [];
  const req = reqList.find(r => r.id === (f.reqId || reqList[0]?.id));
  const submit = async () => {
    const e = {};
    if (!req) e.reqId = 'Pick the requirement this site answers.';
    if (f.name.trim().length < 3) e.name = 'Give the place a name or landmark.';
    if (Object.keys(e).length) return setErrors(e);
    const lastNo = parseInt(String(last.data?.data?.[0]?.code || '').split('-')[1]) || 0;
    const at = new Date().toISOString();
    const body = { reqId: req.id, code: `SITE-${String(lastNo + 1).padStart(3, '0')}`, name: f.name.trim(), locality: f.locality.trim() || req.area, city: req.city, state: req.state, address: f.address.trim(), purpose: f.purpose || req.purpose, floor: f.floor, area: +f.area || undefined, measuredArea: +f.measuredArea || undefined, frontage: +f.frontage || undefined, quotedRent: +f.quotedRent || undefined, quotedDeposit: +f.quotedDeposit || undefined, ownerName: f.ownerName.trim(), broker: 'Direct', scoutedBy: user?.name || (role === 'franchise' ? 'Franchise partner' : 'Staff'), scoutedOn: todayISO(), stage: 'Scouted', photos: [], checks: {}, catch: f.why.trim() ? { case: f.why.trim() } : {}, log: [{ at, by: user?.name || '', text: 'Site added from the phone' }], createdAt: at };
    try { const r = await create({ resource: 'sites', body }).unwrap(); nav.replace('SiteEvaluation', { id: r.data?.id }); } catch (err) { setErrors({ form: errorMessage(err) }); }
  };
  return (
    <Screen footer={(
      <Footer hint={errors.form || 'You can finish the checklist and photos after saving.'} hintColor={errors.form ? 'coralInk' : 'muted'}>
        <Button title={role === 'franchise' ? 'Save location' : 'Save and evaluate'} variant="primary" full onPress={submit} loading={state.isLoading} />
      </Footer>
    )}>
      <Header heading="Add a location" sub={role === 'franchise' ? 'A place you have found' : 'Site scouting'} />
      <Dropdown label="Scouting requirement" value={f.reqId || reqList[0]?.id || ''} options={reqList.map(r => ({ label: `${r.code} · ${r.city} – ${r.area}`, value: r.id }))} onSelect={set('reqId')} error={errors.reqId} placeholder={reqs.isLoading ? 'Loading…' : 'No open requirements'} style={styles.field} />
      <Input label="Name or landmark" value={f.name} onChangeText={set('name')} placeholder="e.g. Ramnagar main road" autoCapitalize="words" error={errors.name} style={styles.field} />
      <Input label="Locality" value={f.locality} onChangeText={set('locality')} placeholder={req?.area || 'Area'} autoCapitalize="words" style={styles.field} />
      <AppText variant="label" style={styles.label}>What will it be?</AppText>
      <View style={styles.chips}>{TYPES.map(t => <FilterChip key={t} label={t} selected={f.purpose === t} onPress={() => set('purpose')(t)} />)}</View>
      <Input label="Address" value={f.address} onChangeText={set('address')} multiline placeholder="Door number, street, landmark" autoCapitalize="sentences" style={styles.field} />
      <View style={styles.row}>
        <Input label="Quoted sq ft" value={f.area} onChangeText={set('area')} keyboardType="numeric" placeholder="800" style={styles.half} />
        <Input label="Measured sq ft" value={f.measuredArea} onChangeText={set('measuredArea')} keyboardType="numeric" placeholder="812" style={styles.half} />
      </View>
      <View style={styles.row}>
        <Input label="Rent asked" prefix="₹" value={f.quotedRent} onChangeText={set('quotedRent')} keyboardType="numeric" placeholder="38,000" style={styles.half} />
        <Input label="Deposit asked" prefix="₹" value={f.quotedDeposit} onChangeText={set('quotedDeposit')} keyboardType="numeric" style={styles.half} />
      </View>
      <View style={styles.row}>
        <Input label="Frontage, ft" value={f.frontage} onChangeText={set('frontage')} keyboardType="numeric" placeholder="22" style={styles.half} />
        <Dropdown label="Floor" value={f.floor} options={FLOORS} onSelect={set('floor')} style={styles.half} />
      </View>
      <Input label="Owner's name" value={f.ownerName} onChangeText={set('ownerName')} autoCapitalize="words" style={styles.field} />
      <Input label="Why it suits" value={f.why} onChangeText={set('why')} multiline placeholder="Hospitals and clinics nearby, parking, visibility…" autoCapitalize="sentences" style={styles.field} />
      <AppText variant="small" color="muted" style={styles.note}>Photos and the walk-around video come in the next update.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: vs(18) },
  label: { marginBottom: vs(10) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginBottom: vs(20) },
  row: { flexDirection: 'row', gap: s(12) },
  half: { flex: 1, marginBottom: vs(18) },
  note: { fontSize: ms(13.5) },
});
