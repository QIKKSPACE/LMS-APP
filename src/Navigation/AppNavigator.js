import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../Context/AuthContext';

// Import Screens
import AuthScreen from '../Screen/AuthScreen';
import TabNavigation from './Tabnavigation';
import BuyCourseDetailScreen from '../Screen/BuyCourseDetail';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, isLoading, authInitialized } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure auth state is properly initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while checking authentication
  if (!authInitialized || !isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // User is authenticated, show tab navigation
          <>
            <Stack.Screen name="MainApp" component={TabNavigation} />
            <Stack.Screen
              name="BuyCourseDetail"
              component={BuyCourseDetailScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // User is not authenticated, show auth screen
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

export default AppNavigator;