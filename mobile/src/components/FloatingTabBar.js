/* The floating pill tab bar. Pass it to Tab.Navigator as tabBar={props => <FloatingTabBar {...props} />} and give each
   screen options={{ title, icon: 'home', badge: 2 }}. The active tab sits in a mist pill. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, ms, s, vs, shadows } from '../theme';
import AppText from './AppText';
import Icon from './Icon';
import { Badge } from './Badge';

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, vs(10)) }]}>
      <View style={[styles.bar, shadows.float]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title || route.name;
          const onPress = () => {
            if (options.onPressOverride) return options.onPressOverride();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const fg = focused ? colors.teal : colors.muted;
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} onPress={onPress} style={[styles.item, focused && styles.active]}>
              <View>
                <Icon name={options.icon || 'home'} size={22} color={fg} strokeWidth={focused ? 2 : 1.8} />
                {options.badge ? <Badge n={options.badge} style={styles.badge} /> : null}
              </View>
              <AppText variant="captionSemi" color={fg} numberOfLines={1} style={styles.label}>{label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: s(14), right: s(14) },
  bar: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: ms(26), padding: ms(5), height: vs(66), alignItems: 'stretch', borderWidth: 1, borderColor: colors.lineSoft },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: ms(24), gap: vs(4) },
  active: { backgroundColor: colors.tealTint },
  badge: { position: 'absolute', top: -ms(7), left: ms(14) },
  label: { fontSize: ms(11.5) },
});
