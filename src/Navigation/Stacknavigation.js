import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../Screen/LoginScreen'
const Stack = createNativeStackNavigator();

const Stacknavigation = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName='Login' 
            screenOptions={{headerShown: false}}>
               <Stack.Screen name='Login' component={LoginScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default Stacknavigation