/* Loading placeholder blocks with a soft pulse. <Skeleton w h r /> <Skeleton circle size /> */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, ms } from '../theme';

export default function Skeleton({ w = '100%', h = 16, r = 8, circle, size, tone = 'sunk', style }) {
  const op = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.6, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [op]);
  const sz = circle ? ms(size || 44) : null;
  return <Animated.View style={[styles.base, { backgroundColor: tone === 'mist' ? '#CFE6E0' : colors.sunk, opacity: op }, circle ? { width: sz, height: sz, borderRadius: sz / 2 } : { width: w, height: typeof h === 'number' ? ms(h) : h, borderRadius: ms(r) }, style]} />;
}

const styles = StyleSheet.create({ base: {} });
