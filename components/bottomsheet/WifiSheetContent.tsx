import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Alert, StyleProp, ViewStyle, Pressable, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons';
import { ThemedModal } from '../modals/ThemedIconModal';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveHeight, getResponsiveWidth, getResponsiveFontSize } from '@/utils/responsive';
import { t } from '@/i18n';
import WifiManager from 'react-native-wifi-reborn';
import { PermissionsAndroid } from 'react-native'; // Import PermissionsAndroid

interface WifiSheetContentProps {
  ssid: string;
  password?: string;
  isWep?: boolean;
  isHidden: boolean; // Add isHidden prop
  style?: StyleProp<ViewStyle>;
  onConnectSuccess?: () => void;
  // onConnect: (ssid: string, password?: string) => Promise<boolean>; // Remove this
}

const WifiSheetContent: React.FC<WifiSheetContentProps> = ({
  ssid,
  password: initialPassword,
  isWep,
  isHidden, // Receive isHidden
  style,
  onConnectSuccess,
  // onConnect, // Remove this
}) => {
  const { currentTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [modalIcon, setModalIcon] = useState<keyof typeof MaterialIcons.glyphMap>();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDescription, setModalDescription] = useState<string | null>(null);
  const [password, setPassword] = useState<string>(initialPassword || ''); // Local password state
  const passwordInputRef = useRef<TextInput>(null); // Keep the ref

    // Request permissions on component mount
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
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('Location permission granted');
                } else {
                    console.log('Location permission denied');
                     setIsModalVisible(true);
                    setModalIcon('warning');
                    setModalTitle(t('locationPermission.title'));
                    setModalDescription(t('locationPermission.message'));
                }
            } catch (err) {
                console.warn(err);
                 setIsModalVisible(true);
                setModalIcon('error');
                setModalTitle('Error');
                setModalDescription(String(err)); // Ensure error is displayed
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
        Alert.alert(t('wifiSheet.copySSIDModal.successTitle'), t('wifiSheet.copySSIDModal.successDescription')); // success alert
    } catch (error) {
      console.error('Error copying SSID:', error);
      Alert.alert(t('wifiSheet.copySSIDModal.errorTitle'), t('wifiSheet.copySSIDModal.errorDescription'));
    }
  };

    const onConnectToWifi = async () => {
     if (!ssid) return;

    if (!password || password.length < 8) {
      setIsModalVisible(true);
      setModalIcon('warning');
      setModalTitle(t('wifiSheet.invalidPasswordModal.title'));
      setModalDescription(t('wifiSheet.invalidPasswordModal.description'));
      return;
    }

    setIsConnecting(true); // Set loading state

    try {
      await WifiManager.connectToProtectedSSID(ssid, password, !!isWep, isHidden); // Use isHidden, ensure isWep is boolean
      console.log("Connected successfully!");
      Alert.alert(t('wifiSheet.connectionSuccessModal.title'), t('wifiSheet.connectionSuccessModal.description'));
      onConnectSuccess?.(); // Call success callback
    } catch (error: any) {
      console.error('Error connecting to WiFi:', error);
      // Show specific error messages:
       if (error === 'didNotFindNetwork') {
            Alert.alert(t('wifiSheet.networkNotFoundModal.title'), t('wifiSheet.networkNotFoundModal.description'));
        } else if (error === 'authenticationErrorOccurred') {
            Alert.alert(t('wifiSheet.authErrorModal.title'), t('wifiSheet.authErrorModal.description'));
        } else if (error === 'locationPermissionMissing' || error === 'locationServicesOff') {
            Alert.alert(t('locationPermission.title'), t('locationPermission.message'))
        }
      else {
        Alert.alert(t('wifiSheet.connectionErrorModal.title'), t('wifiSheet.connectionErrorModal.description'));
      }
    } finally {
      setIsConnecting(false); // Reset loading state
    }
  };


  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const onConnectAction = () => {
    setIsModalVisible(false);
  }

  const handlePasswordChange = (text: string) => {
    setPassword(text);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }, style]}>
      <ThemedModal
        onPrimaryAction={onConnectAction}
        iconName={modalIcon}
        title={modalTitle || ''}
        message={modalDescription || ''}
        isVisible={isModalVisible}
        onDismiss={() => setIsModalVisible(false)} />

      {/* SSID Display Card */}
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
          defaultValue={initialPassword}
          secureTextEntry={!showPassword}
          onChangeText={handlePasswordChange} // Use onChangeText
          value={password} // Control the input value

        />
        <Pressable onPress={toggleShowPassword}>
          <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.icon} />
        </Pressable>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <ThemedButton iconName="wifi" onPress={onConnectToWifi} label={t('homeScreen.connectButton')} style={styles.actionButton} loading={isConnecting} loadingLabel='Connecting' />
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
  urlCard: { // Reused from LinkingSheetContent
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  urlRow: { // Reused from LinkingSheetContent
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  urlText: { // Reused from LinkingSheetContent
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