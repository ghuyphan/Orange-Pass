import { ThemedButton } from '@/components/buttons/ThemedButton';
import { Stack, useRouter } from 'expo-router'; // Removed useSegments as it's no longer needed here
import 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react'; // Removed useEffect and useState as they are no longer needed
import { ThemedView } from '@/components/ThemedView';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';
// storage and MMKV_KEYS are removed as hasQuickLoginAccounts logic is removed from this component
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';

export default function AuthLayout() {
  const router = useRouter(); // Router hook to access navigation functions

  // Redux: is login in progress?
  const isLoginInProgress = useSelector(
    (state: RootState) => state.authStatus.isLoginInProgress
  );

  // The back button should only be disabled if a login is actively in progress.
  // Its rendering is handled separately by router.canGoBack().
  const disableBackButton = useMemo(() => {
    return isLoginInProgress;
  }, [isLoginInProgress]);

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
            animation: 'ios_from_right', // Standard iOS animation for stack screens
          }}
        >
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="quick-login" />
        </Stack>
      </View>
      {/* Conditionally render the back button container if router.canGoBack() is true */}
      {router.canGoBack() && (
        <View style={styles.headerContainer}>
          <ThemedButton
            onPress={handleBackPress}
            iconName="chevron-left"
            disabled={disableBackButton} // Disable button if login is in progress
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Ensure the layout takes up the full screen
  },
  screenContainer: {
    flex: 1, // The area where the current screen (login, register, etc.) is displayed
  },
  headerContainer: {
    position: 'absolute', // Position the header independently of the screen content
    top: getResponsiveHeight(10), // Position from the top
    left: getResponsiveWidth(3.6), // Position from the left
    // zIndex: 10, // Uncomment if you face issues with the button being behind other elements
  },
});
