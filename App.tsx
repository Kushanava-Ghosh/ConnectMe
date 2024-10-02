import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './navigation/AuthNavigator';
// import HomeNavigator from './navigation/HomeNavigator';
import 'react-native-get-random-values';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  return (
    <NavigationContainer>
      <AuthNavigator />
      {/* <HomeNavigator /> */}
    </NavigationContainer>
  );
}
