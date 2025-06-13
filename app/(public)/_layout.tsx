import { ThemedButton } from "@/components/buttons/ThemedButton";
import { Stack, useRouter, usePathname } from "expo-router"; // Add usePathname
import "react-native-reanimated";
import { View, StyleSheet } from "react-native";
import { useMemo } from "react";
import { ThemedView } from "@/components/ThemedView";
import { getResponsiveHeight, getResponsiveWidth } from "@/utils/responsive";
import { useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";

export default function AuthLayout() {
  const router = useRouter();
  const pathname = usePathname(); // Get current route

  // Redux: is login in progress?
  const isLoginInProgress = useSelector(
    (state: RootState) => state.authStatus.isLoginInProgress
  );

  // Routes that should never show back button
  const routesWithoutBackButton = ["/quick-login", "/(public)/quick-login"];

  // Check if back button should be shown
  const shouldShowBackButton = useMemo(() => {
    // Don't show back button if:
    // 1. Can't go back
    // 2. Current route is in the exclusion list
    // 3. Login is in progress
    const canGoBack = router.canGoBack();
    const isExcludedRoute = routesWithoutBackButton.some(route => 
      pathname.includes("quick-login")
    );
    
    return canGoBack && !isExcludedRoute && !isLoginInProgress;
  }, [router, pathname, isLoginInProgress]);

  // Navigate back if possible
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.screenContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "ios_from_right",
          }}
        />
      </View>
      
      {/* Show back button only when appropriate */}
      {shouldShowBackButton && (
        <View style={styles.headerContainer}>
          <ThemedButton
            onPress={handleBackPress}
            iconName="chevron-left"
            disabled={isLoginInProgress}
          />
        </View>
      )}
    </ThemedView>
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
    position: "absolute",
    top: getResponsiveHeight(10),
    left: getResponsiveWidth(3.6),
    // zIndex: 10,
  },
});