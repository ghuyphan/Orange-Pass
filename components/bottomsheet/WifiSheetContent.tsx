import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons';
import { ThemedModal } from '../modals/ThemedIconModal';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';
import { t } from '@/i18n';
import WifiManager from 'react-native-wifi-reborn';
import { PermissionsAndroid, Platform } from 'react-native';

// Define notification types for better type safety
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Define notification interface
export interface NotificationConfig {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

interface WifiSheetContentProps {
  ssid: string;
  password?: string;
  isWep?: boolean;
  isHidden: boolean;
  style?: StyleProp<ViewStyle>;
  onConnectSuccess?: () => void;
  onNotification?: (notification: NotificationConfig) => void;
}

const WifiSheetContent: React.FC<WifiSheetContentProps> = ({
  ssid,
  password: initialPassword,
  isWep,
  isHidden,
  style,
  onConnectSuccess,
  onNotification,
}) => {
  const { currentTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalIcon, setModalIcon] = useState<keyof typeof MaterialIcons.glyphMap>();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDescription, setModalDescription] = useState<string | null>(null);
  const [password, setPassword] = useState<string>(initialPassword || '');
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [isWifiEnabled, setIsWifiEnabled] = useState<boolean>(false);
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);

  useEffect(() => {
    setPassword(initialPassword || '');
  }, [initialPassword]);

  useEffect(() => {
    checkWifiState();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      checkAndRequestLocationPermission(false); // Check on initial load, don't prompt
    } else {
      setHasLocationPermission(true); // Assume permission granted on iOS
    }
  }, []);


  const colors = {
    error: currentTheme === 'light' ? Colors.light.error : Colors.dark.error,
    icon: currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon,
    background: currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
    border: currentTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    cardBg: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    inputBg: currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
    text: currentTheme === 'light' ? Colors.light.text : Colors.dark.text
  };

  // Helper function to show notifications
  const showNotification = (config: NotificationConfig) => {
    if (onNotification) {
      onNotification(config);
    } else {
      // Fallback to modal if no notification handler is provided
      setIsModalVisible(true);
      setModalIcon(config.type === 'success' ? 'check-circle' :
        config.type === 'error' ? 'error' :
          config.type === 'warning' ? 'warning' : 'info');
      setModalTitle(config.title);
      setModalDescription(config.message);
    }
  };

  // Check and request fine location permission (for Android)
  const checkAndRequestLocationPermission = async (shouldPrompt: boolean = true) => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return true;
    }

    try {
      // Check for fine location permission
      const fineGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      // If permission is already granted, return early
      if (fineGranted) {
        setHasLocationPermission(true);
        setShowPermissionScreen(false);
        return true;
      }

      if (!shouldPrompt) {
        setShowPermissionScreen(true);
        return false;
      }

      // Request fine location permission
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      const hasRequiredPermission = result === PermissionsAndroid.RESULTS.GRANTED;
      setHasLocationPermission(hasRequiredPermission);
      setShowPermissionScreen(!hasRequiredPermission);


      if (!hasRequiredPermission) {
        showNotification({
          type: 'warning',
          title: t('locationPermission.title'),
          message: t('locationPermission.message'),
        });
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Error checking/requesting location permission:', err);
      showNotification({
        type: 'error',
        title: t('error'),
        message: String(err),
      });
      return false;
    }
  };

  // Check if Wi-Fi is enabled
  const checkWifiState = async () => {
    if (Platform.OS === 'android') {
      try {
        const isEnabled = await WifiManager.isEnabled();
        setIsWifiEnabled(isEnabled);
      } catch (error) {
        console.error('Error checking Wi-Fi state:', error);
        showNotification({
          type: 'error',
          title: t('error'),
          message: String(error),
        });
      }
    } else {
      // For iOS, assume Wi-Fi is enabled (as iOS does not provide a direct API for this)
      setIsWifiEnabled(true);
    }
  };

  const handleCopySSID = async () => {
    try {
      await Clipboard.setStringAsync(ssid);
      showNotification({
        type: 'success',
        title: t('wifiSheet.copySSIDModal.successTitle'),
        message: t('wifiSheet.copySSIDModal.successDescription'),
        duration: 3000,
      });
    } catch (error) {
      console.error('Error copying SSID:', error);
      showNotification({
        type: 'error',
        title: t('wifiSheet.copySSIDModal.errorTitle'),
        message: t('wifiSheet.copySSIDModal.errorDescription'),
      });
    }
  };

  const handleCopyPassword = async () => {
    try {
      await Clipboard.setStringAsync(password);
      showNotification({
        type: 'success',
        title: t('wifiSheet.copyPasswordModal.successTitle') || 'Password Copied',
        message: t('wifiSheet.copyPasswordModal.successDescription') || 'Password has been copied to clipboard',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error copying password:', error);
      showNotification({
        type: 'error',
        title: t('wifiSheet.copyPasswordModal.errorTitle') || 'Copy Failed',
        message: t('wifiSheet.copyPasswordModal.errorDescription') || 'Failed to copy password to clipboard',
      });
    }
  };

  const onConnectToWifi = async () => {
    if (!ssid) {
      showNotification({
        type: 'error',
        title: t('error'),
        message: t('wifiSheet.noSSIDError'),
      });
      return;
    }

    if (!password) {
      showNotification({
        type: 'warning',
        title: t('wifiSheet.invalidPasswordModal.title'),
        message: t('wifiSheet.invalidPasswordModal.description'),
      });
      return;
    }

    if (password.length < 8) {
      showNotification({
        type: 'warning',
        title: t('wifiSheet.invalidPasswordModal.title'),
        message: t('wifiSheet.invalidPasswordModal.description'),
      });
      return;
    }

    if (Platform.OS === 'android' && !hasLocationPermission) {
      const permissionGranted = await checkAndRequestLocationPermission();
      if (!permissionGranted) {
        return;
      }
    }

    setIsConnecting(true);

    try {
      if (Platform.OS === 'android') {
        const locationEnabled = await WifiManager.isEnabled();

        if (!locationEnabled) {
          showNotification({
            type: 'warning',
            title: t('wifiSheet.wifiDisabledModal.title'),
            message: t('wifiSheet.wifiDisabledModal.description'),
          });
          setIsConnecting(false);
          return;
        }
      }

      await WifiManager.connectToProtectedSSID(ssid, password, !!isWep, isHidden);

      showNotification({
        type: 'success',
        title: t('wifiSheet.connectionSuccessModal.title'),
        message: t('wifiSheet.connectionSuccessModal.description'),
        duration: 3000,
      });

      onConnectSuccess?.();
    } catch (error: any) {
      console.error('Error connecting to WiFi:', error);

      if (error === 'didNotFindNetwork') {
        showNotification({
          type: 'error',
          title: t('wifiSheet.networkNotFoundModal.title'),
          message: t('wifiSheet.networkNotFoundModal.description'),
        });
      } else if (error === 'authenticationErrorOccurred') {
        showNotification({
          type: 'error',
          title: t('wifiSheet.authErrorModal.title'),
          message: t('wifiSheet.authErrorModal.description'),
        });
      } else if (error === 'locationPermissionMissing' || error === 'locationServicesOff') {
        showNotification({
          type: 'warning',
          title: t('locationPermission.title'),
          message: t('locationPermission.message'),
        });
      } else if (error === 'alreadyConnected') {
        showNotification({
          type: 'info',
          title: t('wifiSheet.alreadyConnectedModal.title') || "Already connected!",
          message: t('wifiSheet.alreadyConnectedModal.description') || "You are already connected to this network.",
        });
      } else {
        showNotification({
          type: 'error',
          title: t('wifiSheet.connectionErrorModal.title'),
          message: typeof error === 'string' ? error : t('wifiSheet.connectionErrorModal.description'),
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const onConnectAction = () => {
    setIsModalVisible(false);
  };

  const displayPassword = () => {
    if (!password) return '';
    return showPassword ? password : '•'.repeat(password.length);
  };

  const renderPermissionRequestScreen = () => {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="map-marker-alert" size={40} color={colors.error} />
        <ThemedText style={[styles.permissionTitle, { color: colors.text }]}>
          {t('locationPermission.title')}
        </ThemedText>
        <ThemedText style={[styles.permissionMessage, { color: colors.text }]}>
          {t('locationPermission.message')}
        </ThemedText>
        <ThemedButton
          iconName="lock-open"
          onPress={() => checkAndRequestLocationPermission(true)} // Pass true to prompt
          label={t('locationPermission.requestButton')}
          style={styles.permissionButton}
        />
      </View>
    );
  };

  // Conditional rendering based on Wi-Fi state and location permission
  const renderContent = () => {

    if (!isWifiEnabled) {
      return (
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="wifi-off" size={24} color={colors.error} />
          <ThemedText style={[styles.warningText, { color: colors.error }]}>
            {t('wifiSheet.wifiDisabledModal.description')}
          </ThemedText>
        </View>
      );
    }

    return (
      <>
        {/* SSID Display (Copyable) */}
        <Pressable onPress={handleCopySSID} style={[styles.urlCard, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
          <View style={styles.urlRow}>
            <MaterialCommunityIcons name="wifi" size={16} color={colors.icon} />
            <ThemedText style={styles.urlText} numberOfLines={1}>{ssid}</ThemedText>
          </View>
        </Pressable>

        {/* Password Display */}
        <Pressable
          onPress={handleCopyPassword}
          style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
        >
          <View style={styles.passwordRow}>
            <MaterialCommunityIcons name="lock" size={16} color={colors.icon} />
            <ThemedText style={styles.passwordText} numberOfLines={1}>
              {displayPassword()}
            </ThemedText>
            <Pressable onPress={toggleShowPassword} hitSlop={40}>
              <MaterialCommunityIcons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={colors.icon}
              />
            </Pressable>
          </View>
        </Pressable>

        {/* Connect Button */}
        <View style={styles.actionButtons}>
          <ThemedButton
            iconName="wifi"
            onPress={onConnectToWifi}
            label={t('homeScreen.connectButton')}
            style={styles.actionButton}
            loading={isConnecting}
            loadingLabel={t('homeScreen.connectingButton')}
          />
        </View>
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }, style]}>
      <ThemedModal
        onPrimaryAction={onConnectAction}
        iconName={modalIcon}
        title={modalTitle || ''}
        message={modalDescription || ''}
        isVisible={isModalVisible}
        onDismiss={() => setIsModalVisible(false)}
        onSecondaryAction={() => setIsModalVisible(false)}
      />
      {showPermissionScreen ? renderPermissionRequestScreen() : renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    marginHorizontal: getResponsiveWidth(3.6),
    gap: 15,
  },
  urlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  urlText: {
    fontSize: 15,
    flex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  passwordText: {
    fontSize: 15,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    height: 44,
  },
  warningText: {
    fontSize: 16,
    textAlign: 'center',
  },
  permissionContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: getResponsiveHeight(2),
  },
  permissionButton: {
    marginTop: 8,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default WifiSheetContent;