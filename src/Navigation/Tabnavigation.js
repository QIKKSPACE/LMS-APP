import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../Screen/HomeScreen'
import MyCourse from '../Screen/MyCourse'
import LiveSession from '../Screen/LiveSession'
import ProfileScreen from '../Screen/ProfileScreen'

const Tab = createBottomTabNavigator();

const Tabnavigation = () => {
    return (
        <NavigationContainer>
            <Tab.Navigator screenOptions={{ headerShown: false }}>
                <Tab.Screen name="Home" component={HomeScreen} />
                <Tab.Screen name="Mycourse" component={MyCourse} />
                <Tab.Screen name="Live" component={LiveSession} />
                <Tab.Screen name="Profile" component={ProfileScreen} />


            </Tab.Navigator>
        </NavigationContainer>
    );
};

export default Tabnavigation;
