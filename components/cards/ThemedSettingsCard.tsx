import React, { memo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export type ThemedSettingsCardItemProps = {
  settingsTitle: string;
  settingsText?: string;
  onPress: () => void;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  iconSize?: number;
};

export const ThemedSettingsCardItem = memo(function ThemedSettingsCardItem(
  props: ThemedSettingsCardItemProps
): JSX.Element {
  const {
    settingsTitle,
    settingsText,
    onPress,
    leftIcon = 'chevron-left',
    rightIcon = 'chevron-right',
    iconColor,
    iconSize = getResponsiveFontSize(16),
  } = props;

  const { currentTheme } = useTheme();
  const colors = currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon;

  return (
    <Pressable
      onPress={onPress}
      // android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
    >
      <View style={styles.settingsCardContainer}>
        <View style={styles.leftContainer}>
          <MaterialIcons name={leftIcon} size={iconSize} color={iconColor || colors} />
          <ThemedText style={styles.sectionTitle}>{settingsTitle}</ThemedText>
        </View>
        <View style={styles.rightContainer}>
          <ThemedText style={styles.settingsText}>{settingsText}</ThemedText>
          <MaterialIcons
            name={rightIcon}
            size={iconSize}
            color={iconColor || colors}
          />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  settingsCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    overflow: 'hidden',
    borderRadius: getResponsiveWidth(4),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
  },
  settingsText: {
    fontSize: getResponsiveFontSize(16),
    opacity: 0.5,
  },
  iconContainer: {
    width: getResponsiveWidth(7.2),
    height: getResponsiveWidth(7.2),
    borderRadius: getResponsiveWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
    pointerEvents: 'none',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
    pointerEvents: 'none',
  },
});