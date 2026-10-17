/* Raise ticket (staff and owners): property, what is wrong, where, priority with its SLA, who fixes it, photos, details. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Input, FilterChip, ChoiceChip, Segmented, PhotoArch, Footer, Button } from '../../components';
import { ticketForm } from '../../mock/data';

export default function RaiseTicketScreen() {
  const nav = useNavigation();
  const role = useAppSelector(st => st.auth.role);
  const owner = role === 'owner';
  const [f, setF] = useState({ property: owner ? 'Bypass Road Lab' : ticketForm.properties[0], title: '', area: 'Reception', priority: 'P3', fixer: owner ? 'tenant' : 'owner', details: '' });
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  const pri = ticketForm.priorities.find(p => p.value === f.priority);
  return (
    <Screen footer={(
      <Footer hint={`The ${pri.label.split(', ')[1]} SLA starts when you raise it.`}>
        <Button title={owner ? 'Send report' : 'Raise ticket'} variant="primary" full onPress={() => nav.goBack()} />
      </Footer>
    )}>
      <Header heading={owner ? 'Report an issue' : 'Raise ticket'} />
      <Input label="Property" select value={f.property} onPress={() => {}} style={styles.field} />
      <Input label="What is wrong?" value={f.title} onChangeText={set('title')} placeholder="e.g. AC not cooling in the sample room" autoCapitalize="sentences" style={styles.field} />
      <AppText variant="label" style={styles.label}>Where</AppText>
      <View style={styles.chips}>{ticketForm.areas.map(a => <FilterChip key={a} label={a} selected={f.area === a} onPress={() => set('area')(a)} />)}</View>
      {!owner ? (
        <>
          <AppText variant="label" style={styles.label}>Priority</AppText>
          <View style={styles.chips}>{ticketForm.priorities.map(p => <ChoiceChip key={p.value} label={p.label} tone={p.tone} selected={f.priority === p.value} onPress={() => set('priority')(p.value)} />)}</View>
          <AppText variant="label" style={styles.label}>Who fixes it</AppText>
          <Segmented value={f.fixer} onChange={set('fixer')} options={ticketForm.fixers} style={styles.field} />
        </>
      ) : null}
      <AppText variant="label" style={styles.label}>Photos</AppText>
      <View style={styles.photos}>
        <PhotoArch state="needed" label="Photo of the issue" sub="Needed" width={150} ratio={1} onPress={() => {}} />
        <PhotoArch state="add" label="Another" width={150} ratio={1} onPress={() => {}} />
      </View>
      <Input label="Details" value={f.details} onChangeText={set('details')} multiline placeholder="When did it start? Anything the technician should know?" autoCapitalize="sentences" style={styles.field} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4), marginBottom: vs(16) },
  field: { marginBottom: vs(18) },
  label: { marginBottom: vs(10) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginBottom: vs(20) },
  photos: { flexDirection: 'row', gap: s(12), marginBottom: vs(20) },
  hintText: { fontSize: ms(13.5) },
});
