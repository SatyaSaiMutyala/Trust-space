/* Placeholder until the designed screens are built — shows the global components and theme working. */
import React from 'react';
import { AppText, Button, Card, Screen, StatusChip } from '../components';

export default function HomeScreen() {
  return (
    <Screen>
      <AppText variant="eyebrow" color="muted">TrustLab Facilities & Leases</AppText>
      <AppText variant="h1">TruSpace</AppText>
      <Card>
        <AppText variant="h3">Project set up</AppText>
        <AppText color="muted">React Native CLI · Redux Toolkit · react-native-size-matters · React Navigation</AppText>
        <StatusChip label="Ready for the design" kind="ok" />
      </Card>
      <Button title="Primary button" variant="primary" />
      <Button title="Secondary button" />
    </Screen>
  );
}
