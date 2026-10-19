/* Raise ticket (staff) / Report an issue (owners) → POST /tickets, numbered after the last ticket. Owners get a simpler
   form; the owner is also messaged, as on the web. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { s, vs } from '../../theme';
import { Screen, AppText, Header, Input, FilterChip, ChoiceChip, Segmented, PhotoArch, Footer, Button, Dropdown, PhotoPickerSheet, usePhotoPicker } from '../../components';
import { uploadAll } from '../../store/uploads';
import { useListQuery, useCreateRecordMutation, errorMessage, PRI_LABEL, SLA_HOURS } from '../../store/api';
import { useLookup, useAppSelector } from '../../store/hooks';

const CATS = ['Electrical wiring', 'Plumbing', 'Civil / structural', 'Seepage / roofing', 'Doors, windows & locks', 'Painting', 'Flooring & tiles', 'Shutters & grills', 'Other'];
const PRIS = [{ value: 'P1', tone: 'coral' }, { value: 'P2', tone: 'amber' }, { value: 'P3', tone: 'blue' }, { value: 'P4', tone: 'grey' }];
const slaLabel = p => { const h = SLA_HOURS[p]; return h >= 48 ? `${h / 24} days` : `${h} h`; };

export default function RaiseTicketScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { user, role } = useAppSelector(st => st.auth);
  const owner = role === 'owner';
  const props = useLookup('properties');
  const last = useListQuery({ resource: 'tickets', params: { sort: 'no', order: 'desc', limit: 1 } });
  const [create, state] = useCreateRecordMutation();
  const [f, setF] = useState({ property: route.params?.propertyId || '', title: '', category: 'Plumbing', priority: 'P3', resp: owner ? 'TrustLab' : 'Owner', details: '' });
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pick, pickerProps] = usePhotoPicker();
  const set = k => v => { setF(x => ({ ...x, [k]: v })); setErrors(e => ({ ...e, [k]: undefined, form: undefined })); };
  const property = f.property || props.list[0]?.id || '';
  const addPhoto = async () => { const picked = await pick({ multiple: true, title: 'Photo of the issue' }); if (picked.error) setErrors({ form: picked.error }); else if (picked.length) setFiles(x => [...x, ...picked].slice(0, 4)); };
  const submit = async () => {
    const e = {};
    if (!property) e.property = 'Pick the property.';
    if (f.title.trim().length < 4) e.title = 'Describe the problem in a few words.';
    if (Object.keys(e).length) return setErrors(e);
    const lastNo = parseInt(String(last.data?.data?.[0]?.no || '').split('-')[1]) || 140;
    const no = `TKT-${String(lastNo + 1).padStart(4, '0')}`;
    const at = new Date().toISOString();
    setBusy(true);
    try {
      const assets = files.length ? await uploadAll(files) : [];
      const body = { no, propertyId: property, title: f.title.trim(), category: f.category, priority: f.priority, responsibility: f.resp, status: 'Open', assignee: owner ? 'Facilities' : '', cost: 0, costBy: f.resp === 'Owner' ? 'Owner' : 'TrustLab', photos: assets.map(a => a.id), createdAt: at, raisedBy: user?.name || (owner ? 'Owner' : 'Staff'), log: [{ at, by: user?.name || 'Staff', text: f.details.trim() || f.title.trim(), photos: assets.map(a => a.id) }] };
      const r = await create({ resource: 'tickets', body }).unwrap();
      const P = props.byId[property];
      if (P && (f.resp !== 'TrustLab' || owner)) create({ resource: 'messages', body: { propertyId: P.id, ownerId: P.ownerId, from: owner ? 'owner' : 'tdpl', by: user?.name || '', kind: 'Message', text: `New repair ticket ${no}: ${f.title.trim()} (${PRI_LABEL[f.priority]}, ${f.resp === 'TrustLab' ? 'tenant' : f.resp.toLowerCase()} responsibility).`, at, files: [], read: { [owner ? 'owner' : 'tdpl']: true } } });
      nav.replace('TicketDetail', { id: r.data?.id });
    } catch (err) { setErrors({ form: err.message && !err.status ? err.message : errorMessage(err) }); } finally { setBusy(false); }
  };
  return (
    <Screen footer={(
      <Footer hint={errors.form || `The ${slaLabel(f.priority)} SLA starts when you raise it.`} hintColor={errors.form ? 'coralInk' : 'muted'}>
        <Button title={owner ? 'Send report' : 'Raise ticket'} variant="primary" full onPress={submit} loading={state.isLoading || busy} />
      </Footer>
    )}>
      <Header heading={owner ? 'Report an issue' : 'Raise ticket'} />
      <Dropdown label="Property" value={property} options={props.list.map(p => ({ label: p.name, value: p.id }))} onSelect={set('property')} searchable error={errors.property} style={styles.field} />
      <Input label="What is wrong?" value={f.title} onChangeText={set('title')} placeholder="e.g. AC not cooling in the sample room" autoCapitalize="sentences" error={errors.title} style={styles.field} />
      <AppText variant="label" style={styles.label}>Category</AppText>
      <View style={styles.chips}>{CATS.map(c => <FilterChip key={c} label={c} selected={f.category === c} onPress={() => set('category')(c)} />)}</View>
      {!owner ? (
        <>
          <AppText variant="label" style={styles.label}>Priority</AppText>
          <View style={styles.chips}>{PRIS.map(p => <ChoiceChip key={p.value} label={`${PRI_LABEL[p.value]}, ${slaLabel(p.value)}`} tone={p.tone} selected={f.priority === p.value} onPress={() => set('priority')(p.value)} />)}</View>
          <AppText variant="label" style={styles.label}>Who fixes it</AppText>
          <Segmented value={f.resp} onChange={set('resp')} options={[{ label: 'Owner', value: 'Owner' }, { label: 'Tenant', value: 'TrustLab' }, { label: 'Shared', value: 'Shared' }]} style={styles.field} />
        </>
      ) : null}
      <AppText variant="label" style={styles.label}>Photos</AppText>
      <View style={styles.photos}>
        {files.map((x, i) => <PhotoArch key={i} state="photo" uri={x.uri} label={`Photo ${i + 1}`} width={120} ratio={1} onPress={() => setFiles(fs => fs.filter((_, k) => k !== i))} />)}
        {files.length < 4 ? <PhotoArch state={files.length ? 'add' : 'needed'} label={files.length ? 'Another' : 'Photo of the issue'} sub={files.length ? undefined : 'Tap to take or choose'} width={120} ratio={1} onPress={addPhoto} /> : null}
      </View>
      {files.length ? <AppText variant="caption" color="muted" style={styles.hint}>Tap a photo to remove it.</AppText> : null}
      <Input label="Details" value={f.details} onChangeText={set('details')} multiline placeholder="When did it start? Anything the technician should know?" autoCapitalize="sentences" style={styles.field} />
      <PhotoPickerSheet {...pickerProps} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: vs(18) },
  label: { marginBottom: vs(10) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginBottom: vs(20) },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: s(12), marginBottom: vs(8) },
  hint: { marginBottom: vs(16) },
});
