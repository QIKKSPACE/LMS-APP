import { useEffect } from 'react';
import { AuthProvider } from './src/Context/AuthContext';
import AppNavigator from './src/Navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';

const App = () => {
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title || 'New Notification',
        text2: remoteMessage.notification?.body || '',
      });
    });

    return unsubscribe;
  }, []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;