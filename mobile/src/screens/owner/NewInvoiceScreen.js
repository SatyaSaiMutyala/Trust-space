/* New invoice (owner, design p.16): Make here / Upload, property, what it is for, month, meter readings for
   electricity and water, the computed amount with GST / TDS from the lease (GET /mobile/invoice-defaults), then
   POST /invoices — the server derives GST, RCM and TDS. */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Segmented, Input, FilterChip, Footer, Button, PhotoArch, Dropdown, Checkbox, PhotoPickerSheet, usePhotoPicker, Skeleton } from '../../components';
import { useAppSelector, useLookup } from '../../store/hooks';
import { useInvoiceDefaultsQuery, useCreateRecordMutation, errorMessage, inr, perLabel, todayISO } from '../../store/api';
import { uploadAll } from '../../store/uploads';

const TYPES = ['Rent', 'Electricity', 'Maintenance', 'Water', 'Other'];
const num = v => +String(v ?? '').replace(/[^\d.]/g, '') || 0;

export default function NewInvoiceScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { user } = useAppSelector(st => st.auth);
  const props = useLookup('properties');
  const [mode, setMode] = useState('make');
  const [type, setType] = useState('Rent');
  const [property, setProperty] = useState(route.params?.propertyId || '');
  const [period, setPeriod] = useState(todayISO().slice(0, 7));
  const [f, setF] = useState({ last: '', current: '', rate: '', fixed: '', base: '', desc: '', number: '' });
  const [gst, setGst] = useState(null); // null = follow the default
  const [files, setFiles] = useState([]);
  const [pick, pickerProps] = usePhotoPicker();
  const [create, cState] = useCreateRecordMutation();
  const [err, setErr] = useState('');
  useEffect(() => { if (!property && props.list.length) setProperty(props.list[0].id); }, [props.list, property]);
  const d = useInvoiceDefaultsQuery({ propertyId: property, type, period }, { skip: !property });
  const D = d.data?.data;
  // when the defaults load (or the type / month changes), take the server's number and amount; keep what the owner typed otherwise
  useEffect(() => { if (D) setF(x => ({ ...x, number: D.number, base: type === 'Rent' || type === 'Maintenance' ? String(D.base) : x.base, rate: x.rate || String(D.rate || ''), fixed: x.fixed || String(D.fixed || ''), last: x.last || (D.lastReading != null ? String(D.lastReading) : '') })); }, [D, type]);
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  const metered = type === 'Electricity' || type === 'Water';
  const units = Math.max(0, num(f.current) - num(f.last));
  const base = metered ? Math.round(units * num(f.rate) + num(f.fixed)) : num(f.base);
  const gstOn = D ? (gst === null ? D.gstAllowed && D.mode === 'Forward' : gst) : false;
  const preview = useMemo(() => { if (!D) return null; const g = gstOn && D.mode === 'Forward' ? Math.round(base * 0.18) : 0; const tds = D.tdsRate && (type === 'Rent' || type === 'Maintenance') ? Math.round(base * D.tdsRate / 100) : 0; return { gst: g, tds, total: base + g, net: base + g - tds }; }, [D, base, gstOn, type]);
  const months = (D?.months || [period]).map(p => ({ label: perLabel(p), value: p }));
  const addFile = async () => { const got = await pick({ multiple: true, title: 'Invoice copy' }); if (got.error) { setErr(got.error); return; } if (got.length) setFiles(x => x.concat(got)); };
  const submit = async () => {
    setErr('');
    if (!D) { setErr('Pick the property first.'); return; }
    if (D.duplicate) { setErr(`${type} for ${perLabel(period)} already exists (${D.duplicate.number}, ${D.duplicate.status}).`); return; }
    if (base <= 0) { setErr('Enter the amount.'); return; }
    if (mode === 'upload' && !files.length) { setErr('Add a photo or PDF of your invoice.'); return; }
    try {
      const assets = files.length ? await uploadAll(files) : [];
      const date = todayISO(); const at = new Date().toISOString();
      const reading = metered ? { open: num(f.last), close: num(f.current), rate: num(f.rate), fixed: num(f.fixed) } : undefined;
      const desc = (f.desc || (type === 'Rent' ? `Rent for ${props.name(property)} for ${perLabel(period)}` : type === 'Maintenance' ? 'Common area maintenance' : `${type} for ${perLabel(period)}`)) + (reading ? ` · ${reading.open}–${reading.close} kWh @ ₹${reading.rate}` : '');
      const dueDay = String(D.dueDay || 5).padStart(2, '0'); const due = `${period}-${dueDay}` < date ? date : `${period}-${dueDay}`;
      const body = { number: f.number.trim(), propertyId: property, leaseId: D.leaseId, ownerId: D.ownerId, type, period, date, dueDate: due, base, gst: gstOn ? 1 : 0, source: mode === 'upload' ? 'Uploaded' : 'Generated', files: assets.map(a => ({ id: a.id, url: a.url, name: a.name, type: a.type })), status: 'Submitted', desc, reading, log: [{ at, by: user?.name || 'Owner', text: 'Invoice submitted by owner' }] };
      await create({ resource: 'invoices', body }).unwrap();
      nav.goBack();
    } catch (e) { setErr(e.message && !e.status ? e.message : errorMessage(e)); }
  };
  return (
    <Screen footer={<Footer hint={err || (D?.duplicate ? `${type} for ${perLabel(period)} already sent (${D.duplicate.status}).` : D?.note || undefined)} hintColor={err || D?.duplicate ? 'coralInk' : 'muted'}><Button title="Send invoice" variant="primary" full onPress={submit} loading={cState.isLoading} disabled={!D || !!D.duplicate} /></Footer>}>
      <Header heading="New invoice" />
      <Segmented value={mode} onChange={setMode} style={styles.seg} options={[{ label: 'Make here', value: 'make', icon: 'file-text' }, { label: 'Upload', value: 'upload', icon: 'upload' }]} />
      <Dropdown label="Property" value={property} options={props.list.map(p => ({ label: p.name, value: p.id }))} onSelect={v => { setProperty(v); setF(x => ({ ...x, base: '', number: '' })); }} placeholder={props.isLoading ? 'Loading…' : 'Pick the property'} style={styles.field} />
      <AppText variant="label" style={styles.label}>What is it for?</AppText>
      <View style={styles.chips}>{TYPES.map(t => <FilterChip key={t} label={t} size="lg" selected={type === t} onPress={() => { setType(t); setF(x => ({ ...x, base: '' })); setGst(null); }} />)}</View>
      <Dropdown label="Month" value={period} options={months} onSelect={v => { setPeriod(v); setF(x => ({ ...x, base: '' })); }} style={styles.field} />
      <Input label="Invoice number" value={f.number} onChangeText={set('number')} autoCapitalize="characters" style={styles.field} />
      {metered ? (
        <>
          <View style={styles.row}>
            <Input label="Last reading" value={f.last} onChangeText={set('last')} keyboardType="numeric" style={styles.half} />
            <Input label="This reading" value={f.current} onChangeText={set('current')} keyboardType="numeric" style={styles.half} />
          </View>
          <View style={styles.row}>
            <Input label="Rate a unit" prefix="₹" value={f.rate} onChangeText={set('rate')} keyboardType="numeric" style={styles.half} />
            <Input label="Fixed charge" prefix="₹" value={f.fixed} onChangeText={set('fixed')} keyboardType="numeric" style={styles.half} />
          </View>
        </>
      ) : <Input label={type === 'Rent' && D ? `Rent amount (schedule ${inr(D.base)}${D.multi ? `, your ${Math.round(D.share)}% share` : ''})` : 'Amount before GST'} prefix="₹" value={f.base} onChangeText={set('base')} keyboardType="numeric" style={styles.field} />}
      {type === 'Other' || type === 'Water' ? <Input label="Description" value={f.desc} onChangeText={set('desc')} autoCapitalize="sentences" placeholder="What this invoice is for" style={styles.field} /> : null}
      {D && D.gstAllowed ? <Checkbox checked={gstOn} onChange={setGst} label="Charge GST 18% (you are registered)" style={styles.field} /> : null}
      {mode === 'upload' ? (
        <View style={styles.upload}>
          {files.map((x, i) => <PhotoArch key={i} state="photo" label={x.name} labelPosition="chip" width={120} ratio={0.9} uri={x.uri} />)}
          <PhotoArch state={files.length ? 'add' : 'needed'} label={files.length ? 'Add more' : 'Add the invoice'} sub="Photo of it" width={150} ratio={0.9} onPress={addFile} />
        </View>
      ) : null}
      {d.isFetching && !D ? <Skeleton h={90} r={20} /> : D && preview ? (
        <View style={styles.amount}>
          <View style={styles.flex}>
            <AppText variant="body" color="muted">Net payable to you</AppText>
            <AppText variant="small" color="muted">{metered ? `${units.toLocaleString('en-IN')} units × ₹${num(f.rate)} + ₹${num(f.fixed)}` : `Amount ${inr(base)}`}{preview.gst ? ` + GST ${inr(preview.gst)}` : D.mode === 'RCM' ? ' · GST paid by the tenant under RCM' : ''}{preview.tds ? ` − TDS ${D.tdsRate}% ${inr(preview.tds)}` : ''}</AppText>
          </View>
          <AppText variant="monoXl" color="tealInk">{inr(preview.net)}</AppText>
        </View>
      ) : null}
      <PhotoPickerSheet {...pickerProps} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { marginTop: vs(16), marginBottom: vs(20) },
  field: { marginBottom: vs(18) },
  label: { marginBottom: vs(10) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginBottom: vs(20) },
  row: { flexDirection: 'row', gap: s(12) },
  half: { flex: 1, marginBottom: vs(18) },
  upload: { flexDirection: 'row', flexWrap: 'wrap', gap: s(12), justifyContent: 'center', marginVertical: vs(10) },
  amount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s(12), backgroundColor: colors.tealTint, borderRadius: ms(20), padding: s(18), marginTop: vs(4) },
  flex: { flex: 1 },
});
