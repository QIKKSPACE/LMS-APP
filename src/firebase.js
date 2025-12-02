// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Dynamic Firebase configuration
// This allows the same Firebase project to be used across different platforms
const getFirebaseConfig = () => {
  // Default configuration - can be overridden by environment variables
  const defaultConfig = {
    apiKey: "AIzaSyCLhGlh_Taw-aRI7vEQBEzkzrjeuAKUxNc",
    authDomain: "stf-web-34a3b.firebaseapp.com",
    databaseURL: "https://stf-web-34a3b-default-rtdb.firebaseio.com",
    projectId: "stf-web-34a3b",
    storageBucket: "stf-web-34a3b.firebasestorage.app",
    messagingSenderId: "311427704953",
    appId: "1:311427704953:web:a93b0b28026b4d140b0ca8",
    measurementId: "G-79FBF73WJM"
  };

  // For React Native, use environment variables if available
  if (typeof process !== 'undefined' && process.env) {
    return {
      apiKey: process.env.FIREBASE_API_KEY || defaultConfig.apiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
      databaseURL: process.env.FIREBASE_DATABASE_URL || defaultConfig.databaseURL,
      projectId: process.env.FIREBASE_PROJECT_ID || defaultConfig.projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
      appId: process.env.FIREBASE_APP_ID || defaultConfig.appId,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId
    };
  }

  return defaultConfig;
};

// Initialize Firebase with dynamic configuration
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { firebaseConfig };
export default app;