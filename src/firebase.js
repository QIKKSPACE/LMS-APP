// Firebase configuration - replace with your actual config from Firebase console
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Note: In React Native Firebase, initialization happens automatically
// The firebaseConfig is used in google-services.json (Android) and GoogleService-Info.plist (iOS)
// For now, we'll export the config for manual use if needed

export { firebaseConfig };

// Export common Firebase modules
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export { auth, firestore };

export default firebaseConfig;