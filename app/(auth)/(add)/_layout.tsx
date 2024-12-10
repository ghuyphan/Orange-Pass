import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
// import { ThemedButton } from '@/components/buttons/ThemedButton';
import { useRouter } from 'expo-router';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';

export default function AddLayout() {
  // const onNavigateBack = useRouter().back;

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'ios'
        }}
      >
        <Stack.Screen name="add-new" />
      </Stack>
      {/* <View style={[styles.headerContainer]}>
        <ThemedButton
          onPress={onNavigateBack}
           iconName="chevron-left"
        />
      </View> */}
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
    top: STATUSBAR_HEIGHT + 45,
    left: 15,
    zIndex: 10,
  },
});