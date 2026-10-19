/* "Update required": a transparent modal over everything, no close, the back button does nothing, one button opens
   the store. Plain flex centring (absolute-fill layers inside a transparent Modal come out zero-sized on iOS). */
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import Button from './Button';
import Icon from './Icon';
import Arch from './Arch';
import { APP_VERSION, APP_NAME } from '../config/appVersion';

export default function ForceUpdateDialog({ visible, storeVersion, onUpdate }) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <Arch width={84} height={92} bg={colors.tealTint} bottomRadius={18}><View style={styles.iconWrap}><Icon name="download" size={36} color={colors.teal} strokeWidth={1.7} /></View></Arch>
          <AppText variant="h2" center style={styles.title}>Update required</AppText>
          <AppText variant="body" color="muted" center style={styles.body}>A new version of {APP_NAME}{storeVersion ? ` (v${storeVersion})` : ''} is available. Please update to continue using the app.</AppText>
          <AppText variant="caption" color="muted" center style={styles.version}>You have v{APP_VERSION}</AppText>
          <Button title="Update now" variant="primary" full onPress={onUpdate} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,20,16,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: s(24) },
  card: { width: '100%', maxWidth: s(360), backgroundColor: colors.white, borderRadius: ms(28), paddingHorizontal: s(24), paddingTop: vs(28), paddingBottom: vs(24), alignItems: 'center' },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: vs(18) },
  body: { marginTop: vs(10), fontSize: ms(15) },
  version: { marginTop: vs(8) },
  button: { marginTop: vs(22), alignSelf: 'stretch' },
});
