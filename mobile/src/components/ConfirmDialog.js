/* Confirmation pop-up: a small centred card with a title, one line of text, and Cancel / Confirm.
   tone: primary (teal confirm) | danger (coral confirm). */
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs, shadows } from '../theme';
import AppText from './AppText';
import Button from './Button';
import Icon from './Icon';

export default function ConfirmDialog({ open, title, text, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', icon, onConfirm, onCancel, loading }) {
  if (!open) return null;
  const danger = tone === 'danger';
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel" />
        <View style={[styles.card, shadows.float]}>
          {icon ? <View style={[styles.iconWrap, { backgroundColor: danger ? colors.coralTint : colors.tealTint }]}><Icon name={icon} size={26} color={danger ? colors.coral : colors.teal} /></View> : null}
          <AppText variant="h3" center>{title}</AppText>
          {text ? <AppText variant="body" color="muted" center style={styles.text}>{text}</AppText> : null}
          <View style={styles.row}>
            <Button title={cancelLabel} variant="secondary" size="md" full onPress={onCancel} />
            <Button title={confirmLabel} variant={danger ? 'coralSolid' : 'primary'} size="md" full onPress={onConfirm} loading={loading} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(19,78,74,0.6)', alignItems: 'center', justifyContent: 'center', padding: s(28) },
  card: { width: '100%', maxWidth: s(360), backgroundColor: colors.white, borderRadius: ms(24), paddingHorizontal: s(20), paddingVertical: vs(22), alignItems: 'center' },
  iconWrap: { width: ms(52), height: ms(52), borderRadius: ms(26), alignItems: 'center', justifyContent: 'center', marginBottom: vs(14) },
  text: { marginTop: vs(8) },
  row: { flexDirection: 'row', gap: s(10), marginTop: vs(20), alignSelf: 'stretch' },
});
