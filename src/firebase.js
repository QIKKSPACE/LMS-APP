// src/firebase.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// React Native Firebase automatically initializes with your google-services.json (Android)
// and GoogleService-Info.plist (iOS) files

// Export services
export const authInstance = auth;
export const db = firestore();
export const storageInstance = storage();

// Firebase auth persistence is handled automatically by React Native Firebase
// It uses native device storage for persistent authentication
console.log('React Native Firebase initialized with automatic persistence');

export { authInstance as auth, storageInstance as storage };
export default { auth: authInstance, db, storage: storageInstance };