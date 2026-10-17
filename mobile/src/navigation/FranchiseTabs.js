/* Franchise partner tabs: My locations, Messages, More. */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components';
import MyLocationsScreen from '../screens/franchise/MyLocationsScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator();

export default function FranchiseTabs() {
  return (
    <Tab.Navigator tabBar={p => <FloatingTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}>
      <Tab.Screen name="Locations" component={MyLocationsScreen} options={{ title: 'My locations', icon: 'map-pin' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages', icon: 'message', badge: 1 }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More', icon: 'menu' }} />
    </Tab.Navigator>
  );
}
