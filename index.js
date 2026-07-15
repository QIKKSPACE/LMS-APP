/**
 * @format
 */

import 'react-native-nitro-modules';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';

LogBox.ignoreLogs(['React Native Firebase namespaced API']);

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('React Native Firebase namespaced API')) {
    return;
  }
  originalWarn(...args);
};

import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
