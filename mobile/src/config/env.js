/* Environment settings for the app.
   The API base URL: in a debug build the local backend (iOS simulator reaches the Mac as localhost, the Android
   emulator as 10.0.2.2); release builds use the live server. Override for a real phone on the office Wi-Fi by setting
   DEV_API_URL below to your Mac's LAN address, e.g. 'http://192.168.1.20:5001/api'. */
import { Platform } from 'react-native';

const DEV_API_URL = 'https://truspace.mytrustlab.co.in/api'; // live server; set to '' for the local backend, or 'http://192.168.1.20:5001/api' for a phone on the office Wi-Fi

export const API_URL = __DEV__
  ? DEV_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001/api' : 'http://localhost:5001/api')
  : 'https://truspace.mytrustlab.co.in/api';

export const APP_VERSION = '1.0.0';
