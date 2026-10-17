/* Franchise partner tabs: My locations, Messages, More. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components';
import MyLocationsScreen from '../screens/franchise/MyLocationsScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import MoreSheet from '../screens/shared/MoreSheet';

const Tab = createBottomTabNavigator();
const Blank = () => <View />;

export default function FranchiseTabs() {
  const [more, setMore] = useState(false);
  return (
    <>
      <Tab.Navigator tabBar={p => <FloatingTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}>
        <Tab.Screen name="Locations" component={MyLocationsScreen} options={{ title: 'My locations', icon: 'map-pin' }} />
        <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages', icon: 'message', badge: 1 }} />
        <Tab.Screen name="More" component={Blank} options={{ title: 'More', icon: 'menu', onPressOverride: () => setMore(true) }} />
      </Tab.Navigator>
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </>
  );
}
