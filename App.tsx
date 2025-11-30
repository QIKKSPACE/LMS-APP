import React from 'react';
import { AuthProvider } from './src/Context/AuthContext';
import AppNavigator from './src/Navigation/AppNavigator';
import Toast from 'react-native-toast-message';

const App = () => {
  return (
    <AuthProvider>
      <AppNavigator />
      <Toast />
    </AuthProvider>
  );
};

export default App;