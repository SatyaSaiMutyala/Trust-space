/* My details (owner): contact details the owner edits themselves (PATCH /owners/:id), and the PAN / GST / bank the
   facilities team verifies, shown read-only with their verification state. A changed mobile or email also updates
   the sign-in account on the server's side through the owner record. */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Avatar, Input, Chip, KeyValueRow, Footer, Button, Icon, Skeleton, ErrorState } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useOneQuery, usePatchRecordMutation, useListQuery, errorMessage } from '../../store/api';

const initials = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const mask = a => (a ? '•••• •••• ' + String(a).slice(-4) : '—');

function VerifiedBlock({ title, chip, tone, rows }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <AppText variant="h4" weight="semibold">{title}</AppText>
        <Chip label={chip} tone={tone} />
      </View>
      {rows.map(([l, v], i) => <KeyValueRow key={l} label={l} value={v} divider={i < rows.length - 1} />)}
    </View>
  );
}

export default function MyDetailsScreen() {
  const nav = useNavigation();
  const { user } = useAppSelector(st => st.auth);
  const ownerId = user?.ownerId;
  const q = useOneQuery({ resource: 'owners', id: ownerId }, { skip: !ownerId });
  const props = useListQuery({ resource: 'properties', params: { limit: 20 } });
  const leases = useListQuery({ resource: 'leases', params: { limit: 50 } });
  const [patch, state] = usePatchRecordMutation();
  const O = q.data?.data;
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (O && !f) setF({ phone: O.phone || '', whatsapp: O.whatsapp || '', email: O.email || '', line: O.addr?.line || '', city: O.addr?.city || '', state: O.addr?.state || '', pin: O.addr?.pin || '' }); }, [O, f]);
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    setErr('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('Enter a valid email address.'); return; }
    if (f.pin && !/^\d{6}$/.test(f.pin)) { setErr('PIN code should be 6 digits.'); return; }
    try {
      const addr = { line: f.line.trim(), city: f.city.trim(), state: f.state.trim(), pin: f.pin.trim() };
      await patch({ resource: 'owners', id: ownerId, body: { phone: f.phone.trim(), whatsapp: f.whatsapp.trim() || f.phone.trim(), email: f.email.trim().toLowerCase(), addr, address: [addr.line, addr.city, addr.state, addr.pin].filter(Boolean).join(', ') } }).unwrap();
      nav.goBack();
    } catch (e) { setErr(errorMessage(e)); }
  };
  const shares = (props.data?.data || []).map(p => {
    const L = (leases.data?.data || []).filter(l => l.propertyId === p.id).sort((a, b) => b.start.localeCompare(a.start))[0];
    const o = L?.owners?.find(x => x.ownerId === ownerId);
    return `${p.name}${L && L.owners?.length > 1 ? `, ${Math.round(+(o?.rent || 0))}%` : ''}`;
  });
  const panTone = O?.panStatus === 'Valid' ? 'teal' : O?.panStatus === 'Inoperative' ? 'coral' : 'amber';
  const bank = O ? (O.bankPending ? ['Being verified', 'amber'] : O.bankVerified ? ['Verified', 'teal'] : O.acctNo ? ['Not verified', 'amber'] : ['Missing', 'coral']) : ['', 'grey'];
  return (
    <Screen footer={O && f ? <Footer hint={err || undefined} hintColor="coralInk"><Button title="Save changes" variant="primary" full onPress={save} loading={state.isLoading} /></Footer> : null}>
      <Header heading="My details" />
      {q.isLoading || !f ? (q.error ? <ErrorState title="Couldn't load your details" body={errorMessage(q.error)} action="Try again" onAction={q.refetch} /> : <><Skeleton h={64} r={32} style={styles.skel} /><Skeleton h={200} r={20} style={styles.skel} /></>) : (
        <>
          <View style={styles.who}>
            <Avatar initials={initials(O.name)} size={64} />
            <View style={styles.flex}>
              <AppText variant="h3">{O.name}</AppText>
              <AppText variant="body" color="muted">{shares.join(' · ') || O.kind}</AppText>
            </View>
          </View>
          <Input label="Mobile number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" style={styles.field} />
          <Input label="WhatsApp number" value={f.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" placeholder="Same as mobile if blank" style={styles.field} />
          <Input label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" style={styles.field} />
          <Input label="Address" value={f.line} onChangeText={set('line')} multiline autoCapitalize="sentences" style={styles.field} />
          <View style={styles.row}>
            <Input label="City" value={f.city} onChangeText={set('city')} autoCapitalize="words" style={styles.half} />
            <Input label="PIN" value={f.pin} onChangeText={set('pin')} keyboardType="number-pad" style={styles.half} />
          </View>
          <Input label="State" value={f.state} onChangeText={set('state')} autoCapitalize="words" style={styles.field} />
          <VerifiedBlock title="PAN" chip={O.panStatus || 'Not verified'} tone={panTone} rows={[['PAN', O.pan || '—'], ['TDS on rent', O.panStatus === 'Inoperative' || !O.pan ? '20%' : O.tdsCert?.rate != null && O.tdsCert?.type ? `${O.tdsCert.rate}% (certificate)` : '10%']]} />
          <VerifiedBlock title="GST" chip={O.gstin ? 'Registered' : 'No GST'} tone={O.gstin ? 'teal' : 'grey'} rows={[['GSTIN', O.gstin || 'Not registered']]} />
          <VerifiedBlock title="Bank" chip={bank[0]} tone={bank[1]} rows={[['Bank', [O.bankName, O.bankBranch].filter(Boolean).join(', ') || O.bank || '—'], ['Account', mask(O.acctNo)], ['IFSC', O.ifsc || '—'], ['Holder', O.acctHolder || O.name]]} />
          <View style={styles.note}>
            <Icon name="lock" size={20} color={colors.muted} />
            <AppText variant="small" color="muted" style={styles.flex}>PAN, GST and bank details are changed by the facilities team after checking the documents. Message us to update them.</AppText>
          </View>
          <Button title="Request a change" variant="tonal" size="md" icon="message" onPress={() => nav.navigate('Thread', { id: props.data?.data?.[0]?.id })} style={styles.ask} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: s(14), marginTop: vs(16), marginBottom: vs(22) },
  skel: { marginTop: vs(16) },
  field: { marginBottom: vs(18) },
  row: { flexDirection: 'row', gap: s(12) },
  half: { flex: 1, marginBottom: vs(18) },
  block: { backgroundColor: colors.sunk, borderRadius: ms(20), paddingHorizontal: s(16), paddingVertical: vs(6), marginBottom: vs(14) },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(10) },
  note: { flexDirection: 'row', gap: s(10), alignItems: 'flex-start', marginTop: vs(4) },
  ask: { marginTop: vs(14), alignSelf: 'flex-start' },
  flex: { flex: 1 },
});
