/* <EmptyState> (all is well, offer the next action) and <ErrorState> (what went wrong, Try again). */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import Arch from './Arch';
import Button from './Button';
import Icon from './Icon';

function StateBody({ tone, icon, title, body, action, onAction }) {
  const coral = tone === 'coral';
  return (
    <View style={styles.wrap}>
      <Arch width={100} height={110} bg={coral ? colors.coralTint : colors.tealTint} style={styles.arch}>
        <View style={styles.iconWrap}><Icon name={icon} size={44} color={coral ? colors.coral : colors.teal} strokeWidth={1.6} /></View>
      </Arch>
      <AppText variant="h3" center style={styles.title}>{title}</AppText>
      {body ? <AppText variant="body" color="muted" center style={styles.body}>{body}</AppText> : null}
      {action ? <Button title={action} variant="primary" size="md" onPress={onAction} style={styles.btn} /> : null}
    </View>
  );
}

export const EmptyState = props => <StateBody tone="teal" icon="check" {...props} />;
export const ErrorState = props => <StateBody tone="coral" icon="alert-triangle" {...props} />;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: vs(40), paddingHorizontal: s(24) },
  arch: { alignSelf: 'center' },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: vs(22) },
  body: { marginTop: vs(8), maxWidth: s(300) },
  btn: { marginTop: vs(22), paddingHorizontal: s(22), borderRadius: ms(14) },
});
