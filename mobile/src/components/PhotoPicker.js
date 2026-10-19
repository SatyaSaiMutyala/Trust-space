/* Take a photo or choose from the library (react-native-image-picker), on iOS and Android.
     const pick = usePhotoPicker();  const files = await pick({ multiple: true, video: false });
   Returns [{ uri, type, name, width, height, size }] or [] when cancelled. Asks for the camera permission on Android. */
import React, { useCallback, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import ListRow from './ListRow';

const toFile = a => ({ uri: a.uri, type: a.type || (a.uri && /\.(mp4|mov)$/i.test(a.uri) ? 'video/mp4' : 'image/jpeg'), name: a.fileName || `${a.type?.startsWith('video') ? 'video' : 'photo'}-${Date.now()}.${a.type?.startsWith('video') ? 'mp4' : 'jpg'}`, width: a.width, height: a.height, size: a.fileSize, duration: a.duration });

async function cameraAllowed(audio) {
  if (Platform.OS !== 'android') return true;
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, { title: 'Camera', message: 'TruSpace uses the camera to photograph repairs, premises and inspection items.', buttonPositive: 'Allow', buttonNegative: 'Not now' });
  if (r !== PermissionsAndroid.RESULTS.GRANTED) return false;
  if (!audio) return true;
  const a = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, { title: 'Microphone', message: 'Confirmation videos record what each side says at the inspection.', buttonPositive: 'Allow', buttonNegative: 'Not now' });
  return a === PermissionsAndroid.RESULTS.GRANTED;
}

/** Record a video with the camera (confirmation clips at inspections). Resolves to a file { uri, type, name, size, duration }
    or null when cancelled; rejects with a message when the camera is not available. */
export async function recordVideo({ front = false, maxSeconds = 120 } = {}) {
  if (!(await cameraAllowed(true))) return null;
  const r = await launchCamera({ mediaType: 'video', videoQuality: 'medium', durationLimit: maxSeconds, cameraType: front ? 'front' : 'back', saveToPhotos: false, includeExtra: false });
  if (r.didCancel) return null;
  if (r.errorCode) throw new Error(r.errorMessage || 'The camera is not available on this phone.');
  const a = (r.assets || [])[0]; return a ? toFile(a) : null;
}

/** The chooser sheet. Render once near the screen root and drive it through usePhotoPicker. */
export function PhotoPickerSheet({ state, onDone }) {
  const { open, opts } = state;
  const run = async fn => {
    try {
      const common = { mediaType: opts.video ? 'mixed' : 'photo', quality: 0.8, maxWidth: 2000, maxHeight: 2000, includeExtra: false, saveToPhotos: false, videoQuality: 'medium', durationLimit: 120 };
      const r = fn === 'camera' ? (await cameraAllowed() ? await launchCamera({ ...common, cameraType: 'back' }) : { didCancel: true }) : await launchImageLibrary({ ...common, selectionLimit: opts.multiple ? 0 : 1 });
      onDone(r.didCancel || r.errorCode ? [] : (r.assets || []).map(toFile), r.errorCode ? r.errorMessage : null);
    } catch (e) { onDone([], e.message); }
  };
  return (
    <BottomSheet open={open} onClose={() => onDone([])} title={opts.title || 'Add photo'}>
      <ListRow left={<View style={styles.icon}><Icon name="camera" size={22} color={colors.teal} /></View>} title="Take photo" sub={opts.video ? 'Photo or video with the camera' : 'Open the camera'} chevron onPress={() => run('camera')} />
      <ListRow left={<View style={styles.icon}><Icon name="upload" size={22} color={colors.teal} /></View>} title="Choose from library" sub={opts.multiple ? 'Pick one or more' : 'Pick one'} chevron onPress={() => run('library')} divider={false} />
      <AppText variant="caption" color="muted" style={styles.note}>Photos are resized before upload. Up to 20 MB each.</AppText>
      <View style={styles.space} />
    </BottomSheet>
  );
}

/** Returns [pick, sheetProps]: call pick(opts) → Promise of files; spread sheetProps into <PhotoPickerSheet />. */
export function usePhotoPicker() {
  const [state, setState] = useState({ open: false, opts: {} });
  const resolver = useRef(null);
  const pick = useCallback(opts => new Promise(resolve => { resolver.current = resolve; setState({ open: true, opts: opts || {} }); }), []);
  const onDone = useCallback((files, error) => { setState(st => ({ ...st, open: false })); const r = resolver.current; resolver.current = null; if (r) r(error ? Object.assign([], { error }) : files); }, []);
  return [pick, { state, onDone }];
}

const styles = StyleSheet.create({
  icon: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: vs(12) },
  space: { height: vs(8) },
});
