/* Rounded photo tile (not an arch): gradient placeholder, caption chip bottom-left, optional play button and duration.
   state="capture" draws the dashed "After photo" tile. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';
import { PhotoGradient } from './Arch';

export default function PhotoTile({ label, play, duration, state = 'photo', height = 130, onPress, style, radius = 20 }) {
  const capture = state === 'capture';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.tile, { height: vs(height), borderRadius: ms(radius) }, capture && styles.capture, style]}>
      {!capture ? <PhotoGradient /> : null}
      {capture ? (
        <View style={styles.center}>
          <Icon name="camera" size={30} color={colors.teal} strokeWidth={1.6} />
          <AppText variant="title" color="teal" center style={styles.capLabel}>{label}</AppText>
        </View>
      ) : null}
      {play ? <View style={styles.play}><Icon name="play" size={22} color={colors.teal} /></View> : null}
      {!capture && label ? <View style={styles.chip}><AppText variant="smallSemi" color="white">{label}</AppText></View> : null}
      {duration ? <View style={[styles.chip, styles.duration]}><AppText variant="monoSmall" color="white">{duration}</AppText></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, overflow: 'hidden', backgroundColor: colors.photo, justifyContent: 'flex-end' },
  capture: { backgroundColor: '#EEF6F4', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.teal, justifyContent: 'center' },
  center: { alignItems: 'center', gap: vs(6) },
  capLabel: { marginTop: vs(2) },
  play: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -ms(22), width: ms(44), height: ms(44), borderRadius: ms(22), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  chip: { alignSelf: 'flex-start', margin: s(10), backgroundColor: 'rgba(16,32,30,0.78)', borderRadius: ms(10), paddingHorizontal: s(10), paddingVertical: vs(5) },
  duration: { position: 'absolute', right: 0, bottom: 0, alignSelf: 'flex-end' },
});
