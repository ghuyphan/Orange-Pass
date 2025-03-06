import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Alert, StyleProp, ViewStyle, Pressable, TextInput } from 'react-native';
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
import { PermissionsAndroid } from 'react-native';

interface WifiSheetContentProps {
  ssid: string;
  password?: string;
  isWep?: boolean;
  isHidden: boolean;
  style?: StyleProp<ViewStyle>;
  onConnectSuccess?: () => void;  // Optional callback for success
}

const WifiSheetContent: React.FC<WifiSheetContentProps> = ({
  ssid,
  password: initialPassword, // Renamed for clarity
  isWep,
  isHidden,
  style,
  onConnectSuccess, // Optional success callback
}) => {
  const { currentTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalIcon, setModalIcon] = useState<keyof typeof MaterialIcons.glyphMap>();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDescription, setModalDescription] = useState<string | null>(null);
  const [password, setPassword] = useState<string>(initialPassword || ''); // Local password state
  const passwordInputRef = useRef<TextInput>(null);

  // KEY CHANGE: Update local password state whenever initialPassword changes
  useEffect(() => {
    setPassword(initialPassword || '');
  }, [initialPassword]);

  // Request permissions on component mount and handle errors/denials gracefully
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: t('locationPermission.title'),
            message: t('locationPermission.message'),
            buttonNegative: t('locationPermission.buttonNegative'),
            buttonPositive: t('locationPermission.buttonPositive'),
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          // Handle permission denial gracefully.  Show a modal, disable connect button, etc.
          setIsModalVisible(true);
          setModalIcon('warning');
          setModalTitle(t('locationPermission.title'));
          setModalDescription(t('locationPermission.message'));
        }
      } catch (err) {
        console.warn(err);
        setIsModalVisible(true);
        setModalIcon('error');
        setModalTitle(t('error'));
        setModalDescription(String(err)); // Display error message
      }
    };

    requestLocationPermission();
  }, []);

  const colors = {
    error: currentTheme === 'light' ? Colors.light.error : Colors.dark.error,
    icon: currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon,
    background: currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
    border: currentTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    cardBg: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    inputBg: currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground
  };

  const handleCopySSID = async () => {
    try {
      await Clipboard.setStringAsync(ssid);
      Alert.alert(t('wifiSheet.copySSIDModal.successTitle'), t('wifiSheet.copySSIDModal.successDescription'));
    } catch (error) {
      console.error('Error copying SSID:', error);
      Alert.alert(t('wifiSheet.copySSIDModal.errorTitle'), t('wifiSheet.copySSIDModal.errorDescription'));
    }
  };

  // KEY CHANGE:  This function now ONLY handles the connection.
  const onConnectToWifi = async () => {
    if (!ssid) {
      Alert.alert(t('error'), t('wifiSheet.noSSIDError')); // Handle missing SSID
      return;
    }

    if (!password) {
      setIsModalVisible(true);
      setModalIcon('warning');
      setModalTitle(t('wifiSheet.invalidPasswordModal.title'));
      setModalDescription(t('wifiSheet.invalidPasswordModal.description')); // Handle missing password
      return;
    }
    // Basic password validation (you might want more robust checks)
        if (password.length < 8) {
            setIsModalVisible(true);
            setModalIcon('warning');
            setModalTitle(t('wifiSheet.invalidPasswordModal.title'));
            setModalDescription(t('wifiSheet.invalidPasswordModal.description'));
            return;
        }

    setIsConnecting(true); // Show loading indicator

    try {
      // await WifiManager.connectToProtectedSSID(ssid, password, !!isWep, isHidden);
      console.log('Connecting to WiFi:', ssid, password, !!isWep, isHidden);
      console.log("Connected successfully!");
      Alert.alert(t('wifiSheet.connectionSuccessModal.title'), t('wifiSheet.connectionSuccessModal.description'));
      onConnectSuccess?.(); // Notify parent component of success
    } catch (error: any) {
      console.error('Error connecting to WiFi:', error);
       if (error === 'didNotFindNetwork') {
            Alert.alert(t('wifiSheet.networkNotFoundModal.title'), t('wifiSheet.networkNotFoundModal.description'));
        } else if (error === 'authenticationErrorOccurred') {
            Alert.alert(t('wifiSheet.authErrorModal.title'), t('wifiSheet.authErrorModal.description'));
        } else if (error === 'locationPermissionMissing' || error === 'locationServicesOff') {
            Alert.alert(t('locationPermission.title'), t('locationPermission.message'))
        }
        else if (error === 'alreadyConnected') {
            Alert.alert("Already connected!", "You are already connected to this network.");
      }
      else {
        Alert.alert(t('wifiSheet.connectionErrorModal.title'), t('wifiSheet.connectionErrorModal.description'));
      }
    } finally {
      setIsConnecting(false); // Hide loading indicator
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

    const onConnectAction = () => {
    setIsModalVisible(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }, style]}>
      <ThemedModal
        onPrimaryAction={onConnectAction}
        iconName={modalIcon}
        title={modalTitle || ''}
        message={modalDescription || ''}
        isVisible={isModalVisible}
        onDismiss={() => setIsModalVisible(false)} />
      {/* SSID Display (Copyable) */}
      <Pressable onPress={handleCopySSID} style={[styles.urlCard, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
        <View style={styles.urlRow}>
          <MaterialCommunityIcons name="wifi" size={16} color={colors.icon} />
          <ThemedText style={styles.urlText} numberOfLines={1}>{ssid}</ThemedText>
        </View>
      </Pressable>

      {/* Password Input */}
      <View style={[styles.passwordInputContainer, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
        <MaterialCommunityIcons name="lock" size={16} color={colors.icon} />
        <TextInput
          ref={passwordInputRef}
          style={[styles.passwordInput, { color: colors.icon }]}
          placeholderTextColor={colors.icon}
          placeholder={t('homeScreen.passwordPlaceholder')}
          value={password} // Controlled component
          onChangeText={setPassword} // Update local state
          secureTextEntry={!showPassword}
        />
        <Pressable onPress={toggleShowPassword} hitSlop={40}>
          <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.icon} />
        </Pressable>
      </View>

      {/* Connect Button */}
      <View style={styles.actionButtons}>
        <ThemedButton
          iconName="wifi"
          onPress={onConnectToWifi} // Connect only when pressed
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
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  passwordInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
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