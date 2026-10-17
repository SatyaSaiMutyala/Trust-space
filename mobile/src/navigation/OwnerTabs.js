/* Owner tabs: Home, Invoices, Repairs, Messages, More. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components';
import OwnerHomeScreen from '../screens/owner/OwnerHomeScreen';
import OwnerInvoicesScreen from '../screens/owner/OwnerInvoicesScreen';
import OwnerRepairsScreen from '../screens/owner/OwnerRepairsScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import MoreSheet from '../screens/shared/MoreSheet';

const Tab = createBottomTabNavigator();
const Blank = () => <View />;

export default function OwnerTabs() {
  const [more, setMore] = useState(false);
  return (
    <>
      <Tab.Navigator tabBar={p => <FloatingTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}>
        <Tab.Screen name="Home" component={OwnerHomeScreen} options={{ title: 'Home', icon: 'home' }} />
        <Tab.Screen name="Invoices" component={OwnerInvoicesScreen} options={{ title: 'Invoices', icon: 'file-text' }} />
        <Tab.Screen name="Repairs" component={OwnerRepairsScreen} options={{ title: 'Repairs', icon: 'wrench', badge: 1 }} />
        <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages', icon: 'message', badge: 2 }} />
        <Tab.Screen name="More" component={Blank} options={{ title: 'More', icon: 'menu', onPressOverride: () => setMore(true) }} />
      </Tab.Navigator>
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </>
  );
}
