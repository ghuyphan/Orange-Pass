import React from 'react';
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveFontSize, getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';
import { t } from '@/i18n';

interface SettingSheetContentProps {
  style?: StyleProp<ViewStyle>;
  onDelete: () => void;
  onEdit: () => void;
}

const SettingSheetContent: React.FC<SettingSheetContentProps> = ({
  style,
  onDelete,
  onEdit
}) => {
  const { currentTheme } = useTheme();

  const colors = {
    cardBg: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    icon: currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon, // Define icon color
  };

  const renderIcon = (iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'], iconLibrary: 'MaterialCommunityIcons' | 'MaterialIcons' = 'MaterialCommunityIcons') => {
    const iconColor = colors.icon;
    const iconSize = getResponsiveFontSize(18);

    if (iconLibrary === 'MaterialIcons') {
      return (
        <MaterialIcons
          name={iconName}
          size={iconSize}
          color={iconColor}
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={iconName}
        size={iconSize}
        color={iconColor}
      />
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }, style]}>
      <View style={styles.buttonsContainer}>
        <Pressable
          onPress={onEdit}
          style={styles.button}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} // Better touch target
        >
           {renderIcon('pencil')}
          <ThemedText style={styles.buttonText}>{t('homeScreen.edit')}</ThemedText>
        </Pressable>
        <Pressable
          onPress={onDelete}
          style={styles.button}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}  // Better touch target
        >
          {renderIcon('delete')}
          <ThemedText style={styles.buttonText}>{t('homeScreen.delete')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: getResponsiveWidth(4.8),
    marginHorizontal: getResponsiveWidth(3.6),
    gap: 15, // Consistent spacing
  },
  buttonsContainer: {
    flexDirection: 'column', // Stack buttons vertically, like ReuseableSheet
    gap: getResponsiveHeight(0.6), // Consistent gap
    marginTop: getResponsiveHeight(1),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
    paddingVertical: getResponsiveHeight(1.2),
    paddingHorizontal: getResponsiveWidth(2.4),
    borderRadius: getResponsiveWidth(4),  // Rounded corners
    overflow: 'hidden', // Ensures ripple effect doesn't overflow
  },
  buttonText: {
    fontSize: getResponsiveFontSize(16),
  },
});

export default SettingSheetContent;