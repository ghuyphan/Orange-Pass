import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View,  } from 'react-native';

export default function DetailLayout() {

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios'
        }}
      >
        <Stack.Screen name="detail" />
        <Stack.Screen name="qr-screen" />
        <Stack.Screen name="bank-select" />
      </Stack>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 20,
    right: 15,
  },
});