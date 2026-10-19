/* In-app notification banner: slides in at the top when a push arrives while the app is open; tap opens the screen
   it is about, swipe up or wait and it goes away. */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearPushBanner } from '../store/slices/uiSlice';
import { openLink } from '../store/push';
import { colors, ms, s, vs, shadows } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export default function PushBanner() {
  const dispatch = useAppDispatch();
  const banner = useAppSelector(st => st.ui.pushBanner);
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-160)).current;
  useEffect(() => {
    if (!banner) return undefined;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    const t = setTimeout(() => Animated.timing(y, { toValue: -160, duration: 220, useNativeDriver: true }).start(() => dispatch(clearPushBanner())), 6000);
    return () => clearTimeout(t);
  }, [banner, y, dispatch]);
  if (!banner) return null;
  const close = () => Animated.timing(y, { toValue: -160, duration: 180, useNativeDriver: true }).start(() => dispatch(clearPushBanner()));
  return (
    <Animated.View style={[styles.wrap, { top: insets.top + vs(6), transform: [{ translateY: y }] }]} pointerEvents="box-none">
      <Pressable onPress={() => { close(); openLink(banner.link); }} style={[styles.card, shadows.float]} accessibilityRole="button" accessibilityLabel={`${banner.title}. ${banner.body}`}>
        <View style={styles.icon}><Icon name="bell" size={20} color={colors.white} /></View>
        <View style={styles.text}>
          <AppText variant="title" color="white" numberOfLines={1}>{banner.title}</AppText>
          {banner.body ? <AppText variant="small" color={colors.onTealMuted} numberOfLines={2}>{banner.body}</AppText> : null}
        </View>
        <Pressable onPress={close} hitSlop={10} accessibilityLabel="Dismiss"><Icon name="x" size={18} color={colors.onTealMuted} /></Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: s(12), right: s(12), zIndex: 50 },
  card: { flexDirection: 'row', alignItems: 'center', gap: s(12), backgroundColor: colors.deepTeal, borderRadius: ms(20), paddingHorizontal: s(14), paddingVertical: vs(12) },
  icon: { width: ms(36), height: ms(36), borderRadius: ms(18), backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
});
