/* Staff tabs: Home, Inspect, Repairs, Messages, More (More is the "All sections" screen). */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components';
import OverviewScreen from '../screens/staff/OverviewScreen';
import InspectScreen from '../screens/staff/InspectScreen';
import RepairsScreen from '../screens/staff/RepairsScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import AllSectionsScreen from '../screens/staff/AllSectionsScreen';

const Tab = createBottomTabNavigator();

export default function StaffTabs() {
  return (
    <Tab.Navigator tabBar={p => <FloatingTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}>
      <Tab.Screen name="Home" component={OverviewScreen} options={{ title: 'Home', icon: 'home' }} />
      <Tab.Screen name="Inspect" component={InspectScreen} options={{ title: 'Inspect', icon: 'inspect', badge: 2 }} />
      <Tab.Screen name="Repairs" component={RepairsScreen} options={{ title: 'Repairs', icon: 'wrench', badge: 14 }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages', icon: 'message', badge: 6 }} />
      <Tab.Screen name="More" component={AllSectionsScreen} options={{ title: 'More', icon: 'menu' }} />
    </Tab.Navigator>
  );
}
