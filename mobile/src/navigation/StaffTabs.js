/* Staff tabs: Home, Inspect, Repairs, Messages, More (More opens the "All sections" sheet instead of a screen). */
import React, { useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components';
import OverviewScreen from '../screens/staff/OverviewScreen';
import InspectScreen from '../screens/staff/InspectScreen';
import RepairsScreen from '../screens/staff/RepairsScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import AllSectionsSheet from '../screens/staff/AllSectionsSheet';

const Tab = createBottomTabNavigator();
const Blank = () => <View />;

export default function StaffTabs() {
  const [more, setMore] = useState(false);
  return (
    <>
      <Tab.Navigator tabBar={p => <FloatingTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}>
        <Tab.Screen name="Home" component={OverviewScreen} options={{ title: 'Home', icon: 'home' }} />
        <Tab.Screen name="Inspect" component={InspectScreen} options={{ title: 'Inspect', icon: 'inspect', badge: 2 }} />
        <Tab.Screen name="Repairs" component={RepairsScreen} options={{ title: 'Repairs', icon: 'wrench', badge: 14 }} />
        <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages', icon: 'message', badge: 6 }} />
        <Tab.Screen name="More" component={Blank} options={{ title: 'More', icon: 'menu', onPressOverride: () => setMore(true) }} />
      </Tab.Navigator>
      <AllSectionsSheet open={more} onClose={() => setMore(false)} />
    </>
  );
}
