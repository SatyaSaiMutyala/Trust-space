/* App root: Redux store, safe areas, deep links and navigation. */
import React, { useEffect } from 'react';
import { Linking, StatusBar } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { store } from './src/store';
import { signedIn } from './src/store/slices/authSlice';
import RootNavigator from './src/navigation/RootNavigator';
import { linking, navigationRef, handleAppLink } from './src/navigation/linking';
import { colors } from './src/theme';

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.teal, background: colors.surface, card: colors.surface, text: colors.ink, border: colors.line } };

function AppLinks() {
  const dispatch = useDispatch();
  useEffect(() => {
    const on = ({ url }) => handleAppLink(url, dispatch, signedIn);
    Linking.getInitialURL().then(url => url && on({ url }));
    const sub = Linking.addEventListener('url', on);
    return () => sub.remove();
  }, [dispatch]);
  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} translucent />
        <AppLinks />
        <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
