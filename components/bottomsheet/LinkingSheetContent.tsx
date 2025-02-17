import React, { useState } from 'react';
import { View, StyleSheet, Linking, Alert, StyleProp, ViewStyle, Pressable, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons';
import { ThemedModal } from '../modals/ThemedIconModal';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';
import { t } from '@/i18n';

interface LinkingSheetContentProps {
  url: string | null;
  style?: StyleProp<ViewStyle>;
  onCopySuccess?: () => void;
}

const LinkingSheetContent: React.FC<LinkingSheetContentProps> = ({
  url,
  style,
  onCopySuccess
}) => {
  const { currentTheme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalIcon, setModalIcon] = useState<keyof typeof MaterialIcons.glyphMap>();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDescription, setModalDescription] = useState<string | null>(null);

  const colors = {
    error: currentTheme === 'light' ? Colors.light.error : Colors.dark.error,
    icon: currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon,
    background: currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
    border: currentTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    cardBg: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    inputBg: currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground
  };

  const handleCopyLink = async () => {
    if (!url) return;
    onCopySuccess?.();
    try {
      await Clipboard.setStringAsync(url);

      // Alert.alert('Success', 'Link copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
      // Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!url) return;
    try {
      await Share.share({
        message: url,
        url: url, // iOS only
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share link');
    }
  };

  const handleOpenLink = async () => {
    if (!url) return;

    if (url.startsWith('http://')) {
      setIsModalVisible(true);
      setModalIcon('warning');
      setModalTitle('Security Warning');
      setModalDescription('This link uses HTTP, which is not secure. Your data may be at risk.');
    } else {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert('Error', 'Unable to open this link');
      }
    }
  };

  if (!url) return null;

  const isInsecure = url.startsWith('http://');
  const displayUrl = url.length > 45 ? url.substring(0, 45) + '...' : url;
  const onOpenUrl = () => {
    Linking.openURL(url);
    setTimeout(() => {
      setIsModalVisible(false);
    }, 200);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }, style]}>
      {/* Header */}
      {/* <View style={styles.header}>
        <ThemedText type='defaultSemiBold' style={styles.title}>Link Details</ThemedText>
      </View> */}
      <ThemedModal
        onPrimaryAction={onOpenUrl}
        primaryActionText='Open anyway'
        onSecondaryAction={() => setIsModalVisible(false)}
        
        iconName={modalIcon}
        title={modalTitle || ''}
        message={modalDescription || ''}
        isVisible={isModalVisible}
        onDismiss={() => setIsModalVisible(false)} />

      {/* URL Display Card */}
      <Pressable
        onPress={handleCopyLink}
        style={[
          styles.urlCard,
          {
            borderColor: colors.border,
            backgroundColor: colors.inputBg
          }
        ]}
      >
        <View style={styles.urlRow}>
          <MaterialCommunityIcons
            name={isInsecure ? "lock-open" : "lock"}
            size={16}
            color={isInsecure ? colors.error : colors.icon}
          />
          <ThemedText style={styles.urlText} numberOfLines={1}>
            {displayUrl}
          </ThemedText>
        </View>
        <MaterialCommunityIcons
          name="content-copy"
          size={16}
          color={colors.icon}
        />
      </Pressable>

      {/* Security Warning */}
      {isInsecure && (
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={14}
            color={colors.error}
          />
          <ThemedText style={[styles.warningText, { color: colors.error }]}>
            {t('homeScreen.linkingSheet.warning')}
          </ThemedText>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <ThemedButton
          iconName="share-variant"
          onPress={handleShare}
          label="Share"
          style={styles.actionButton}
        />
        <ThemedButton
          iconName="open-in-new"
          onPress={handleOpenLink}
          label="Open"
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    // padding: 20,
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    marginHorizontal: getResponsiveWidth(3.6),
    gap: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  warningText: {
    fontSize: 13,
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

export default LinkingSheetContent;