import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, StyleProp, ViewStyle, Pressable, TextInput, findNodeHandle } from 'react-native'; // Import findNodeHandle
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons';
import { ThemedModal } from '../modals/ThemedIconModal';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';
import { t } from '@/i18n';
import { TextInput as NativeTextInput } from 'react-native'; // Import TextInput from react-native

interface WifiSheetContentProps {
  ssid: string;
  password?: string;
  style?: StyleProp<ViewStyle>;
  onConnectSuccess?: () => void;
  onConnect: (ssid: string, password?: string) => Promise<boolean>;
}

const WifiSheetContent: React.FC<WifiSheetContentProps> = ({
  ssid,
  password: initialPassword,
  style,
  onConnectSuccess,
  onConnect,
}) => {
  const { currentTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalIcon, setModalIcon] = useState<keyof typeof MaterialIcons.glyphMap>();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDescription, setModalDescription] = useState<string | null>(null);
  const passwordInputRef = useRef<TextInput>(null);

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
    } catch (error) {
      console.error('Error copying SSID:', error);
      Alert.alert('Error', 'Failed to copy SSID');
    }
  };

    const handleConnect = async () => {
        if (!ssid) return;

        let currentPassword = '';
        if (passwordInputRef.current) {
            const nativeComponent = findNodeHandle(passwordInputRef.current);
            if (nativeComponent) {
                // Use a type assertion to tell TypeScript that it's a NativeTextInput
                currentPassword = (passwordInputRef.current as any)._nativeText || '';
            }
        }

        if (currentPassword.length < 8) {
            setIsModalVisible(true);
            setModalIcon('warning');
            setModalTitle(t('wifiSheet.invalidPasswordModal.title'));
            setModalDescription(t('wifiSheet.invalidPasswordModal.description'));
            return;
        }

        const success = await onConnect(ssid, currentPassword);
        if (success) {
            onConnectSuccess?.();
        } else {
            setIsModalVisible(true);
            setModalIcon('error');
            setModalTitle(t('wifiSheet.connectionErrorModal.title'));
            setModalDescription(t('wifiSheet.connectionErrorModal.description'));
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
        />
        <Pressable onPress={toggleShowPassword}>
          <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.icon} />
        </Pressable>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <ThemedButton iconName="wifi" onPress={handleConnect} label={t('homeScreen.connectButton')} style={styles.actionButton} />
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