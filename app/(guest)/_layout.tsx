import { Stack } from "expo-router";
import "react-native-reanimated"; // Important for animations
import { StyleSheet } from "react-native";
import { ThemedView } from "@/components/ThemedView";

export default function GuestLayout() {
  return (
    <ThemedView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false, // No default headers for screens in this stack
          animation: "ios",
        }}
      >
        <Stack.Screen name="guest-home" />
        <Stack.Screen name="add-guest" />
        <Stack.Screen name="empty-guest" />
        <Stack.Screen name="(settings)" />
        {/* Add other guest-specific screens here as needed, e.g.: */}
        {/* <Stack.Screen name="guest-info" /> */}
        {/* <Stack.Screen name="guest-settings" /> */}
      </Stack>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
