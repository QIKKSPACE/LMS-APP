import { View, Text } from 'react-native'
import React from 'react'

const HomeScreen = () => {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize:30}}>HomeScreen</Text>
      <Text>Welcome to the Home Screen!</Text>
    </View>
  )
}

export default HomeScreen