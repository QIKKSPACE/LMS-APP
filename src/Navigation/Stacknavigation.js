import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../Screen/LoginScreen'
import HomeSCreen from '../Screen/HomeScreen'
const Stack = createNativeStackNavigator();

const Stacknavigation = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName='Home'
                screenOptions={{ headerShown: false }}>
                <Stack.Screen name='Login' component={LoginScreen} />
                <Stack.Screen name='Home' component={HomeSCreen} />

            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default Stacknavigation