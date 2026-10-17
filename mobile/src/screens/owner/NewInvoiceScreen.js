/* New invoice (design p.16): Make here / Upload, Property, What is it for? chips, Month, readings, rate, fixed charge,
   computed amount, Send invoice. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Segmented, Input, FilterChip, Footer, Button, PhotoArch } from '../../components';
import { newInvoice } from '../../mock/data';

export default function NewInvoiceScreen() {
  const nav = useNavigation();
  const [mode, setMode] = useState('make');
  const [type, setType] = useState('Electricity');
  const [f, setF] = useState({ last: newInvoice.last, current: newInvoice.current, rate: newInvoice.rate, fixed: newInvoice.fixed });
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  const metered = type === 'Electricity' || type === 'Water';
  return (
    <Screen footer={<Footer><Button title="Send invoice" variant="primary" full onPress={() => nav.goBack()} /></Footer>}>
      <Header />
      <AppText variant="display" style={styles.title}>New invoice</AppText>
      <Segmented value={mode} onChange={setMode} style={styles.seg} options={[{ label: 'Make here', value: 'make', icon: 'file-text' }, { label: 'Upload', value: 'upload', icon: 'upload' }]} />
      <Input label="Property" select value={newInvoice.property} onPress={() => {}} style={styles.field} />
      <AppText variant="label" style={styles.label}>What is it for?</AppText>
      <View style={styles.chips}>{newInvoice.types.map(t => <FilterChip key={t} label={t} size="lg" selected={type === t} onPress={() => setType(t)} />)}</View>
      <Input label="Month" select value={newInvoice.month} onPress={() => {}} style={styles.field} />
      {mode === 'upload' ? (
        <View style={styles.upload}><PhotoArch state="needed" label="Add the invoice" sub="Photo or PDF" width={180} ratio={0.9} onPress={() => {}} /></View>
      ) : metered ? (
        <>
          <View style={styles.row}>
            <Input label="Last reading" value={f.last} onChangeText={set('last')} keyboardType="numeric" style={styles.half} />
            <Input label="This reading" value={f.current} onChangeText={set('current')} keyboardType="numeric" style={styles.half} />
          </View>
          <View style={styles.row}>
            <Input label="Rate a unit" value={f.rate} onChangeText={set('rate')} keyboardType="numeric" style={styles.half} />
            <Input label="Fixed charge" value={f.fixed} onChangeText={set('fixed')} keyboardType="numeric" style={styles.half} />
          </View>
        </>
      ) : null}
      {mode === 'make' ? (
        <View style={styles.amount}>
          <View>
            <AppText variant="body" color="muted">Amount</AppText>
            {metered ? <AppText variant="small" color="muted">{newInvoice.units}</AppText> : null}
          </View>
          <AppText variant="monoXl" color="tealInk">{metered ? newInvoice.amount : '₹99,000'}</AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4) },
  seg: { marginTop: vs(16), marginBottom: vs(20) },
  field: { marginBottom: vs(18) },
  label: { marginBottom: vs(10) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginBottom: vs(20) },
  row: { flexDirection: 'row', gap: s(12) },
  half: { flex: 1, marginBottom: vs(18) },
  upload: { alignItems: 'center', marginVertical: vs(10) },
  amount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.tealTint, borderRadius: ms(20), padding: s(18), marginTop: vs(4) },
});
