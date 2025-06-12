import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedButton } from '@/components/buttons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedTextButton } from '@/components/buttons';
import { ThemedView } from '@/components/ThemedView';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  interpolate,
  withSequence,
} from 'react-native-reanimated';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useCameraPermission } from 'react-native-vision-camera';
import { t } from '@/i18n';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';
import { Colors } from '@/constants/Colors';

const PermissionScreen = () => {
  const {
    hasPermission: cameraPermission,
    requestPermission: requestCameraPermission,
  } = useCameraPermission();
  const [step, setStep] = useState(1); // Step 1: Camera, Step 2: Location
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  // Animation values
  const animationProgress = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  // Theme colors
  const iconColor = useThemeColor(
    { light: Colors.light.buttonBackground, dark: Colors.dark.buttonBackground },
    'buttonBackground'
  );
  const textColor = useThemeColor(
    { light: Colors.light.icon, dark: Colors.dark.icon },
    'text'
  );

  // Check if camera permission is already granted
  useEffect(() => {
    if (cameraPermission && step === 1) {
      // Still fade out when automatically moving from camera to location step
      animateTransition(() => setStep(2));
    }
  }, [cameraPermission, step]);

  // Reset animation when step changes
  useEffect(() => {
    contentOpacity.value = 0; // Start transparent
    animationProgress.value = 0; // Reset button animation
    // Fade in the new step's content
    contentOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
  }, [step]);

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location to scan nearby Wi-Fi networks.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Error requesting location permission:', err);
        return false;
      }
    }
    // On iOS, location permission for Wi-Fi scanning might be handled differently
    // or might not be strictly required depending on the exact API used.
    // Assuming for now it's either handled elsewhere or not needed for basic functionality.
    return true;
  };

  // Animate transition between steps (used when camera permission is pre-granted)
  const animateTransition = useCallback(
    (onAnimationEnd: () => void) => {
      contentOpacity.value = withTiming(
        0,
        { duration: 300, easing: Easing.out(Easing.ease) },
        () => {
          runOnJS(onAnimationEnd)();
        }
      );
    },
    [contentOpacity]
  );

  // Handle combined permission requests
  const handleCombinedPermission = useCallback(async () => {
    if (step === 1) {
      // Request Camera Permission
      if (!cameraPermission) {
        const result = await requestCameraPermission();
        if (!result) return; // User denied camera permission
      }
      // Animate fade out before showing location step
      animateTransition(() => setStep(2));
    } else if (step === 2) {
      // Button press animation
      animationProgress.value = withSequence(
        withTiming(0.1, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      // Request Location Permission
      const locationGranted = await requestLocationPermission();
      if (locationGranted) {
        // --- MODIFICATION START ---
        // Navigate immediately without fading out the content first
        runOnJS(router.replace)('/(guest)/(scan)/scan-main');
        // --- MODIFICATION END ---
      }
      // If location permission is denied, we just stay on this screen
    }
  }, [
    step,
    cameraPermission,
    requestCameraPermission,
    router,
    animateTransition,
    animationProgress,
  ]);

  // Handle decline
  const onDecline = useCallback(() => {
    // Fade out content before going back
    contentOpacity.value = withTiming(
      0,
      { duration: 300, easing: Easing.out(Easing.ease) },
      () => {
        runOnJS(router.back)();
      }
    );
  }, [router, contentOpacity]);

  // Content animation style (handles fade-in/out between steps and on decline)
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: interpolate(contentOpacity.value, [0, 1], [20, 0]) }],
  }));

  // Button animation style (for press effect)
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(animationProgress.value, [0, 0.1], [1, 0.95]) }],
  }));

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
          <Ionicons
            name={step === 1 ? 'camera' : 'wifi'}
            size={getResponsiveFontSize(75)}
            color={textColor}
          />
        </View>
        <ThemedText style={styles.title} type="title">
          {step === 1
            ? t('permissionScreen.cameraTitle')
            : t('permissionScreen.locationTitle')}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {step === 1
            ? t('permissionScreen.cameraSubtitle')
            : t('permissionScreen.locationSubtitle')}
        </ThemedText>
      </Animated.View>

      <View style={styles.bottomContainer}>
        <Animated.View style={buttonAnimatedStyle}>
          <ThemedButton
            label={t('permissionScreen.allowButton')}
            onPress={handleCombinedPermission}
          />
        </Animated.View>
        <ThemedTextButton
          label={t('permissionScreen.cancelButton')}
          onPress={onDecline}
          style={styles.button2}
        />
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveWidth(7.2),
    borderRadius: getResponsiveWidth(24),
    marginBottom: getResponsiveHeight(2.4),
  },
  title: {
    textAlign: 'center',
    fontSize: getResponsiveFontSize(24),
    marginBottom: getResponsiveHeight(1),
  },
  subtitle: {
    textAlign: 'center',
    fontSize: getResponsiveFontSize(16),
    lineHeight: getResponsiveFontSize(25),
  },
  bottomContainer: {
    paddingBottom: getResponsiveHeight(4.8),
    paddingHorizontal: getResponsiveWidth(3.6),
    gap: getResponsiveHeight(1.8),
  },
  button2: {
    alignSelf: 'center',
  },
});

export default PermissionScreen;
