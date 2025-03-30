import React, { useState, useEffect, useMemo, lazy, Suspense, useCallback } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedView } from '@/components/ThemedView';
import { t } from '@/i18n'; // Assuming t function is correctly set up
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';
import { RootState } from '@/store/rootReducer'; // Assuming RootState is correctly defined
import {
  SECURE_KEYS,
  MMKV_KEYS,
  getTemporaryPassword,
  hasQuickLoginPreference,
  cleanupTemporaryPassword,
  getPasswordKeyForUserID,
} from '@/services/auth/login'; // Assuming these auth functions are correct
import * as SecureStore from 'expo-secure-store';
import { storage } from '@/utils/storage'; // Assuming MMKV storage is correctly initialized

// Import Avatar component
import Avatar, { AvatarFullConfig } from '@zamplyy/react-native-nice-avatar';
// OR use lazy loading if preferred:
// const Avatar = lazy(() => import('@zamplyy/react-native-nice-avatar'));

// Interface for quick login preferences stored in MMKV
interface QuickLoginPreferences {
  [userId: string]: boolean; // Use userId as key type for clarity
}

// --- Helper function for MMKV preference update ---
const updateQuickLoginPreference = (userId: string, preference: boolean): void => {
  try {
    const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || '{}';
    let currentPrefs: QuickLoginPreferences;

    try {
      currentPrefs = JSON.parse(prefsString);
    } catch (parseError) {
      console.warn('[updateQuickLoginPreference] Failed to parse preferences, resetting.', parseError);
      currentPrefs = {}; // Initialize if parsing fails
    }

    const updatedPrefs = {
      ...currentPrefs,
      [userId]: preference,
    };

    storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(updatedPrefs));
    console.log(`[updateQuickLoginPreference] Preference for user ${userId} set to ${preference}`);

  } catch (error) {
    console.error('[updateQuickLoginPreference] Error updating preference in MMKV:', error);
    // Attempt fallback
    const fallbackPrefs = { [userId]: preference };
    try {
      storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(fallbackPrefs));
    } catch (fallbackError) {
      console.error('[updateQuickLoginPreference] Error setting fallback preference:', fallbackError);
    }
  }
};
// --- End Helper ---

export default function QuickLoginPromptScreen() {
  const [isLoading, setIsLoading] = useState(false); // Loading state for "Save"
  const [isDeclining, setIsDeclining] = useState(false); // Loading state for "Not Now"
  // Removed `shouldShowPrompt` state - component renders unless useEffect navigates away

  const userData = useSelector((state: RootState) => state.auth.user);
  // Ensure type safety, avatarConfig might be undefined initially
  const avatarConfig = useSelector((state: RootState) => state.auth.user?.avatar) as AvatarFullConfig | undefined;

  // --- Corrected useMemo for Avatar Config ---
  // --- useMemo strictly based on requested dependencies ---
  const memoizedAvatarConfig = useMemo(() => {
    // Handle case where avatarConfig might not be loaded yet
    if (!avatarConfig) {
      return undefined;
    }

    // Return a new object containing ONLY the properties tied to the dependencies.
    // WARNING: The Avatar component likely needs more props than this to render fully.
    // This might lead to an incomplete or incorrectly rendered Avatar.
    return {
      faceColor: avatarConfig.faceColor,
      hairColor: avatarConfig.hairColor,
      hatColor: avatarConfig.hatColor,
      // Other properties like shape, eyeType, mouthType etc. are omitted
      // because they are not included in the dependency array below,
      // based on the specific request.
    };
  }, [ // Dependencies are ONLY the specifically requested properties
    avatarConfig?.faceColor,
    avatarConfig?.hairColor,
    avatarConfig?.hatColor,
  ]);


  // --- Enhanced useEffect to check preference ---
  useEffect(() => {
    let isMounted = true; // Prevent actions on unmounted component

    const checkPreferenceAndNavigate = async () => {
      // Guard clause: Wait for user ID
      if (!userData?.id) {
        console.log('[Effect] Waiting for user ID...');
        return;
      }
      console.log(`[Effect] Checking preference for user ${userData.id}`);

      try {
        const hasPreference = await hasQuickLoginPreference(userData.id);
        // Only navigate if the component is still mounted and preference exists
        if (hasPreference && isMounted) {
          console.log('[Effect] Preference found, navigating to home.');
          // Clean up temporary password but don't wait for it (fire-and-forget)
          cleanupTemporaryPassword().catch(err => console.error("[Effect] Background cleanup failed:", err));
          router.replace('/(auth)/home');
        } else if (!hasPreference) {
          console.log('[Effect] No preference found, showing prompt.');
        }
        // If no preference, the component remains rendered
      } catch (error) {
        console.error("[Effect] Error checking preference:", error);
        // Fallback: Show the prompt anyway on error
      }
    };

    checkPreferenceAndNavigate();

    // Cleanup function runs when component unmounts or dependency changes
    return () => {
      console.log('[Effect] Cleanup: Component unmounting or user ID changed.');
      isMounted = false;
    };
  }, [userData?.id]); // Re-run only if user ID changes
  // --- End Enhanced useEffect ---

  // --- useCallback for handleEnableQuickLogin ---
  const handleEnableQuickLogin = useCallback(async () => {
    // Guard clause
    if (!userData?.id) {
      console.error('[EnableQuickLogin] User ID not available.');
      return;
    }
    console.log(`[EnableQuickLogin] Attempting for user ${userData.id}`);
    setIsLoading(true);

    try {
      const password = await getTemporaryPassword();
      if (!password) {
        throw new Error('Password not available for quick login setup');
      }
      const passwordKey = getPasswordKeyForUserID(userData.id);

      // Run critical async operations in parallel
      console.log('[EnableQuickLogin] Starting parallel storage operations...');
      await Promise.all([
        SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, userData.id),
        SecureStore.setItemAsync(passwordKey, password),
        cleanupTemporaryPassword(), // Assume independent cleanup
      ]);
      console.log('[EnableQuickLogin] Parallel operations complete.');

      // Update MMKV (synchronous)
      storage.set(MMKV_KEYS.QUICK_LOGIN_ENABLED, 'true');
      updateQuickLoginPreference(userData.id, true); // Use helper

      console.log('[EnableQuickLogin] Success, navigating to home.');
      router.replace('/(auth)/home');

    } catch (error) {
      console.error('[EnableQuickLogin] Error:', error);
      // Navigate home as a fallback, consistent with original code
      router.replace('/(auth)/home');
    } finally {
      // Ensure loading state is reset reliably after execution/navigation
      requestAnimationFrame(() => setIsLoading(false));
    }
  }, [userData?.id]); // Dependency: userData.id
  // --- End useCallback ---

  // --- useCallback for handleDeclineQuickLogin ---
  const handleDeclineQuickLogin = useCallback(async () => {
    // Guard clause
    if (!userData?.id) {
      console.error('[DeclineQuickLogin] User ID not available.');
      return;
    }
    console.log(`[DeclineQuickLogin] Attempting for user ${userData.id}`);
    setIsDeclining(true);

    try {
      // Update MMKV preference (synchronous)
      updateQuickLoginPreference(userData.id, false); // Use helper

      // Cleanup temporary password (async)
      console.log('[DeclineQuickLogin] Cleaning up temporary password...');
      await cleanupTemporaryPassword();
      console.log('[DeclineQuickLogin] Cleanup complete.');

      console.log('[DeclineQuickLogin] Success, navigating to home.');
      router.replace('/(auth)/home');

    } catch (error) {
      console.error('[DeclineQuickLogin] Error:', error);
      // Navigate home as a fallback, consistent with original code
      router.replace('/(auth)/home');
    } finally {
      // Ensure loading state is reset reliably
      requestAnimationFrame(() => setIsDeclining(false));
    }
  }, [userData?.id]); // Dependency: userData.id
  // --- End useCallback ---

  // --- Memoized Avatar Placeholder ---
  const AvatarPlaceholder = React.memo(() => (
    <View style={[styles.avatar, styles.avatarPlaceholderContainer]}>
      <ActivityIndicator color="#a18cd1" size="large" />
    </View>
  ));
  // --- End Placeholder ---

  // If the effect navigates away, this return might not be reached or will be quickly unmounted.
  // If no user.id, or effect is pending, or no preference found, render the prompt:
  return (
    <ThemedView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {t('quickLoginPrompt.saveLoginInfo')}
          </ThemedText>
          <ThemedText style={styles.description}>
            {t('quickLoginPrompt.saveDescription')}
          </ThemedText>
        </View>

        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Conditionally render Avatar based on memoized config */}
            {memoizedAvatarConfig ? (
              <Suspense fallback={<AvatarPlaceholder />}>
                <Avatar
                  style={styles.avatar}
                  size={getResponsiveWidth(40)}
                  {...memoizedAvatarConfig}
                />
              </Suspense>
            ) : (
              <AvatarPlaceholder /> // Show placeholder if config isn't ready
            )}
          </LinearGradient>
        </View>
      </View>

      {/* Buttons remain at the bottom due to flex:1 and justifyContent: 'space-between' on container */}
      <View style={styles.buttonContainer}>
        <ThemedButton
          label={t('quickLoginPrompt.save')}
          style={styles.saveButton}
          onPress={handleEnableQuickLogin}
          loading={isLoading}
          disabled={isLoading || isDeclining} // Disable both if either is loading
          loadingLabel={t('quickLoginPrompt.saving')}
          textStyle={styles.saveButtonText}
        />
        <ThemedButton
          label={t('quickLoginPrompt.notNow')}
          style={styles.notNowButton}
          onPress={handleDeclineQuickLogin}
          loading={isDeclining}
          disabled={isLoading || isDeclining} // Disable both if either is loading
          loadingLabel={t('quickLoginPrompt.saving')}
          textStyle={styles.notNowButtonText}
          outline
        />
      </View>
    </ThemedView>
  );
}

// --- Styles (minor adjustments for clarity) ---
const styles = StyleSheet.create({
  container: {
    flex: 1, // Take full screen height
    paddingHorizontal: getResponsiveWidth(3.6),
    justifyContent: 'space-between', // Pushes contentContainer up and buttonContainer down
  },
  contentContainer: {
    flexShrink: 1, // Allow content to shrink if needed, but prioritize showing it
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically within its space
    paddingTop: getResponsiveHeight(5), // Add some padding at the top
    paddingBottom: getResponsiveHeight(2), // Space above buttons
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveHeight(6),
    paddingHorizontal: getResponsiveWidth(2),
  },
  title: {
    fontSize: getResponsiveFontSize(24),
    lineHeight: getResponsiveFontSize(32),
    marginBottom: getResponsiveHeight(2),
    textAlign: 'center',
  },
  description: {
    fontSize: getResponsiveFontSize(16),
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(24),
    opacity: 0.8,
    maxWidth: '95%', // Prevent very long lines on wide screens
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: getResponsiveHeight(2), // Add some vertical margin
  },
  gradient: {
    // Make border radius slightly larger than avatar radius for border effect
    borderRadius: getResponsiveWidth(20) + getResponsiveWidth(1.2),
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveWidth(1.2), // Controls gradient "border" thickness
  },
  avatar: {
    width: getResponsiveWidth(40),
    height: getResponsiveWidth(40),
    // Perfect circle
    borderRadius: getResponsiveWidth(20),
    overflow: 'hidden',
  },
  avatarPlaceholderContainer: {
    // Use the avatar style but add background and centering
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%', // Take full width within padding
    // Add bottom margin/padding matching original logic, considering platform differences
    marginBottom: Platform.OS === 'ios' ? getResponsiveHeight(4) : getResponsiveHeight(3),
    paddingBottom: Platform.OS === 'android' ? getResponsiveHeight(1) : 0,
    gap: getResponsiveHeight(1.5), // Space between buttons
  },
  saveButton: {
    borderRadius: getResponsiveWidth(8),
  },
  saveButtonText: {
    fontWeight: 'bold',
    fontSize: getResponsiveFontSize(16),
  },
  notNowButton: {
    borderRadius: getResponsiveWidth(8),
  },
  notNowButtonText: {
    fontSize: getResponsiveFontSize(16),
  },
});