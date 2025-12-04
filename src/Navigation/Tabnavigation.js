import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HomeScreen from '../Screen/HomeScreen'
import MyCourse from '../Screen/MyCourse'
import LiveSession from '../Screen/LiveSession'
import ProfileScreen from '../Screen/ProfileScreen'

const Tab = createBottomTabNavigator();

const Tabnavigation = () => {
    return (
            <Tab.Navigator
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: '#007AFF',
                    tabBarInactiveTintColor: '#8E8E93',
                }}
            >
                <Tab.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{
                        tabBarLabel: 'Home',
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="home" color={color} size={size} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="Mycourse"
                    options={{
                        tabBarLabel: 'My Courses',
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="school" color={color} size={size} />
                        ),
                    }}
                >
                    {(props) => <MyCourse {...props} />}
                </Tab.Screen>
                <Tab.Screen
                    name="Live"
                    component={LiveSession}
                    options={{
                        tabBarLabel: 'Live',
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="live-tv" color={color} size={size} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        tabBarLabel: 'Profile',
                        tabBarIcon: ({ color, size }) => (
                            <Icon name="person" color={color} size={size} />
                        ),
                    }}
                />
            </Tab.Navigator>
    );
};

export default Tabnavigation;
