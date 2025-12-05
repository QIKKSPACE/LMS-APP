import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from '../Screen/LoginScreen'
import HomeSCreen from '../Screen/HomeScreen'
import FilterTabs from '../Components/FilterTabs'
import AuthScreen from '../Screen/AuthScreen'
const Stack = createNativeStackNavigator();

const Stacknavigation = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName='Home'
                screenOptions={{ headerShown: false }}>
                <Stack.Screen name='Login' component={LoginScreen} />
                <Stack.Screen name='Home' component={HomeSCreen} />
                <Stack.Screen name='Filter' component={FilterTabs} />
                <Stack.Screen name='Filter' component={AuthScreen} />




            </Stack.Navigator>
        </NavigationContainer>
    )
}

export default Stacknavigation