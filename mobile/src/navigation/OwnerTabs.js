/* Owner tabs: Home, Invoices, Repairs, Messages, More. */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components';
import OwnerHomeScreen from '../screens/owner/OwnerHomeScreen';
import OwnerInvoicesScreen from '../screens/owner/OwnerInvoicesScreen';
import OwnerRepairsScreen from '../screens/owner/OwnerRepairsScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import MoreScreen from '../screens/shared/MoreScreen';

const Tab = createBottomTabNavigator();

export default function OwnerTabs() {
  return (
    <Tab.Navigator tabBar={p => <FloatingTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}>
      <Tab.Screen name="Home" component={OwnerHomeScreen} options={{ title: 'Home', icon: 'home' }} />
      <Tab.Screen name="Invoices" component={OwnerInvoicesScreen} options={{ title: 'Invoices', icon: 'file-text' }} />
      <Tab.Screen name="Repairs" component={OwnerRepairsScreen} options={{ title: 'Repairs', icon: 'wrench', badge: 1 }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages', icon: 'message', badge: 2 }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'More', icon: 'menu' }} />
    </Tab.Navigator>
  );
}
