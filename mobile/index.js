/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';

// Pushes that arrive while the app is in the background or closed are shown by the system; nothing to do here, but
// Firebase needs a handler registered or it warns on Android.
setBackgroundMessageHandler(getMessaging(), async () => {});
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
