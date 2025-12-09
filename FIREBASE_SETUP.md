# Firebase Setup Guide for LMS App

## 🔥 Required Firebase Configuration

This app uses React Native Firebase SDK. You need to complete these steps:

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "lms-app")
4. Follow the setup steps

### 2. Add Firebase to Your App

#### For Android:
1. In Firebase Console, go to Project Settings
2. Click "Add app" → Android
3. Package name: `com.lmsapp` (check your `android/app/build.gradle`)
4. Download `google-services.json`
5. Place it in `android/app/`

#### For iOS:
1. In Firebase Console, go to Project Settings
2. Click "Add app" → iOS
3. Bundle ID: check your iOS bundle ID
4. Download `GoogleService-Info.plist`
5. Add to your iOS project

### 3. Update Authentication Settings
1. In Firebase Console → Authentication
2. Enable "Email/Password" sign-in method
3. Configure your email templates if needed

### 4. Update Firebase Configuration

Update `src/firebase.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCLhGlh_Taw-aRI7vEQBEzkzrjeuAKUxNc",
    authDomain: "stf-web-34a3b.firebaseapp.com",
    databaseURL: "https://stf-web-34a3b-default-rtdb.firebaseio.com",
    projectId: "stf-web-34a3b",
    storageBucket: "stf-web-34a3b.firebasestorage.app",
    messagingSenderId: "311427704953",
    appId: "1:311427704953:web:a93b0b28026b4d140b0ca8",
    measurementId: "G-79FBF73WJM"
};
```

### 5. Install Required Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
```

### 6. Native Setup (Required)

#### Android:
1. In `android/build.gradle`:
```gradle
buildscript {
  dependencies {
    // Add this line
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

2. In `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

#### iOS:
1. `cd ios && pod install`
2. Make sure `GoogleService-Info.plist` is added to Xcode project

### 7. Test Configuration

Run the app and check console for:
- "Firebase initialized successfully"
- No auth errors in console

## 🚨 Common Issues & Solutions

### "No Firebase App '[DEFAULT]' has been created"
- **Cause**: Firebase not properly initialized
- **Solution**: Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are correctly placed

### "Network error" during auth
- **Cause**: Network connectivity or Firebase configuration issue
- **Solution**: Check internet connection and Firebase console settings

### "Email/password auth not enabled"
- **Cause**: Authentication method not enabled in Firebase console
- **Solution**: Enable Email/Password authentication in Firebase Console → Authentication

## 🔧 Development Tips

### For Testing Without Real Firebase Config
You can temporarily modify the auth service to return mock data for testing.

### Firebase Emulators (Advanced)
For local development, consider using Firebase emulators:
```bash
firebase setup:emulators:firestore
firebase setup:emulators:auth
firebase emulators:start
```

---

**⚠️ Important**: The current config in `src/firebase.js` contains placeholder values. You must update it with your actual Firebase project configuration to use authentication features.