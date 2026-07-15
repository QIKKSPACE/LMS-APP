import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { PermissionsAndroid, Platform } from 'react-native';

export async function requestUserPermission() {
  // Explicitly request notification permission on Android 13+
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Android Notification permission denied');
      return false;
    }
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    return true;
  }
  return false;
}

export async function getFcmTokenAndSaveToUser(userId) {
  try {
    const hasPermission = await requestUserPermission();
    if (!hasPermission) return;

    const token = await messaging().getToken();
    if (token) {
      console.log('FCM Token:', token);
      await firestore().collection('users').doc(userId).set({
        fcmToken: token,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // Listen to token refresh
    messaging().onTokenRefresh(async (newToken) => {
      await firestore().collection('users').doc(userId).set({
        fcmToken: newToken,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

  } catch (error) {
    console.error('Error getting/saving FCM token:', error);
  }
}
