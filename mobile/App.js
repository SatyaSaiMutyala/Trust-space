/* App root: Redux store, safe areas, deep links and navigation. */
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { store } from './src/store';
import { restoreSession } from './src/store/slices/authSlice';
import { startOfflineSync } from './src/store/offline';
import { startPush } from './src/store/push';
import { startRealtime } from './src/store/realtime';
import { PushBanner, ForceUpdateDialog } from './src/components';
import useForceUpdate from './src/hooks/useForceUpdate';
import RootNavigator from './src/navigation/RootNavigator';
import { linking, navigationRef } from './src/navigation/linking';
import { colors } from './src/theme';

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.teal, background: colors.surface, card: colors.surface, text: colors.ink, border: colors.line } };

/** Renews the previous session from the refresh cookie when the app starts, and starts the offline sync (inspections). */
function SessionRestore() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(restoreSession()); startOfflineSync(); startPush(); startRealtime(); }, [dispatch]);
  return null;
}

/** Shows the blocking update dialog when the store has a newer version than this build. */
function ForceUpdate() {
  const { updateRequired, storeVersion, openStore } = useForceUpdate();
  return <ForceUpdateDialog visible={updateRequired} storeVersion={storeVersion} onUpdate={openStore} />;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} translucent />
        <SessionRestore />
        <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
          <RootNavigator />
          <PushBanner />
          <ForceUpdate />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
