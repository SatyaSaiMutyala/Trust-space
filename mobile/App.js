/* App root: Redux store, safe areas and navigation. */
import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.accent, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.line } };

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
