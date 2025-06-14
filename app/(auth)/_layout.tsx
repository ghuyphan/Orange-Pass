import { Stack } from 'expo-router';
import React from 'react';

export default function HomeLayout() {

  return (
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios_from_right',
        }}
      >
        <Stack.Screen name="home"/>
        <Stack.Screen name="(add)" />
        <Stack.Screen name="(detail)"/>
        <Stack.Screen name="(edit)" />
        <Stack.Screen name="(scan)"/>
        <Stack.Screen name="(settings)"/>
        <Stack.Screen name="empty"/>
        <Stack.Screen name="quick-login-prompt"/>
      </Stack>
  );
}