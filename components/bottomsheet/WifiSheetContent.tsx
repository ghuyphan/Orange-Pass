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

  useEffect(() => {
    setPassword(initialPassword || '');
  }, [initialPassword]);

  // Request location permissions on component mount
  useEffect(() => {
    checkAndRequestLocationPermission();
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

  // Check and request location permissions (for Android)
  const checkAndRequestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return true;
    }

    try {
      // First check for coarse location
      let coarseGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );

      // Check for fine location (precise)
      let fineGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      // If both permissions are already granted, return early
      if (coarseGranted && fineGranted) {
        setHasLocationPermission(true);
        return true;
      }

      // Request the permissions we need
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const hasRequiredPermissions = 
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

      setHasLocationPermission(hasRequiredPermissions);

      if (!hasRequiredPermissions) {
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

  // Refined connect to WiFi function
  const onConnectToWifi = async () => {
    // Check for SSID
    if (!ssid) {
      showNotification({
        type: 'error',
        title: t('error'),
        message: t('wifiSheet.noSSIDError'),
      });
      return;
    }

    // Check for password
    if (!password) {
      showNotification({
        type: 'warning',
        title: t('wifiSheet.invalidPasswordModal.title'),
        message: t('wifiSheet.invalidPasswordModal.description'),
      });
      return;
    }

    // Basic password validation
    if (password.length < 8) {
      showNotification({
        type: 'warning',
        title: t('wifiSheet.invalidPasswordModal.title'),
        message: t('wifiSheet.invalidPasswordModal.description'),
      });
      return;
    }

    // Check location permission
    if (Platform.OS === 'android' && !hasLocationPermission) {
      const permissionGranted = await checkAndRequestLocationPermission();
      if (!permissionGranted) {
        return;
      }
    }

    setIsConnecting(true);

    try {
      if (Platform.OS === 'android') {
        // For Android, we need additional checks
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

      // Connect to WiFi network
      await WifiManager.connectToProtectedSSID(ssid, password, !!isWep, isHidden);
      
      // Show success notification
      showNotification({
        type: 'success',
        title: t('wifiSheet.connectionSuccessModal.title'),
        message: t('wifiSheet.connectionSuccessModal.description'),
        duration: 3000,
      });
      
      // Call success callback
      onConnectSuccess?.();
    } catch (error: any) {
      console.error('Error connecting to WiFi:', error);
      
      // Handle specific error cases
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

  // Display masked password or actual password based on showPassword state
  const displayPassword = () => {
    if (!password) return '';
    return showPassword ? password : '•'.repeat(password.length);
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
      
      {/* SSID Display (Copyable) */}
      <Pressable onPress={handleCopySSID} style={[styles.urlCard, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
        <View style={styles.urlRow}>
          <MaterialCommunityIcons name="wifi" size={16} color={colors.icon} />
          <ThemedText style={styles.urlText} numberOfLines={1}>{ssid}</ThemedText>
        </View>
      </Pressable>

      {/* Password Display (replaced TextInput with display-only view) */}
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
});

export default WifiSheetContent;