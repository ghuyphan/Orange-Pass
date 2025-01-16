import React, { useMemo } from 'react';
import { Image, StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { ThemedButton } from '../buttons/ThemedButton';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { t } from '@/i18n';

export type ThemedEmptyCardProps = {
  lightColor?: string;
  darkColor?: string;
  headerLabel: string;
  footerLabel: string;
  footButtonLabel: string;
  cardOnPress?: () => void; // Made optional
  buttonOnPress: () => void;
  style?: object;
  footerStyle?: object;
  paddingTop?: number;
  image?: any;
  testID?: string; // Added for testing
};

const DEFAULT_IMAGE = require('@/assets/images/card.png');

export function ThemedEmptyCard({
  lightColor,
  darkColor,
  headerLabel,
  footerLabel,
  footButtonLabel,
  cardOnPress,
  buttonOnPress,
  style,
  footerStyle,
  paddingTop,
  image = DEFAULT_IMAGE,
  testID,
}: ThemedEmptyCardProps) {
  const { currentTheme: colorScheme } = useTheme();
  
  const colors = useMemo(() => ({
    text: colorScheme === 'light' ? Colors.light.text : Colors.dark.text,
    buttonBackground: colorScheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
    cardBackground: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    cardFooter: colorScheme === 'light' ? Colors.light.cardFooter : Colors.dark.cardFooter,
  }), [colorScheme]);

  const styles = useMemo(() => createStyles(paddingTop), [paddingTop]);

  const cardContainerStyle = useMemo(
    () => [
      {
        backgroundColor: colors.cardBackground,
        borderRadius: getResponsiveWidth(4),
      },
      style,
    ],
    [colors.cardBackground, style]
  );

  const footerBackground = useMemo(
    () => ({
      backgroundColor: colors.cardFooter,
    }),
    [colors.cardFooter]
  );

  return (
    <Pressable 
      style={cardContainerStyle} 
      onPress={cardOnPress}
      testID={testID}
      disabled={!cardOnPress}
    >
      <ThemedView style={cardContainerStyle}>
        <View style={styles.cardHeaderContainer}>
          <ThemedText 
            style={[styles.label, { color: colors.text }]} 
            type="title"
            numberOfLines={2}
          >
            {/* {headerLabel} */}
            {t(headerLabel)}
          </ThemedText>
        </View>
        
        <View style={styles.cardImageContainer}>
          <Image 
            source={image} 
            style={styles.image}
            accessibilityRole="image"
            accessibilityLabel={t(headerLabel)}
          />
        </View>
        
        <View style={[styles.cardFooterContainer, footerBackground, footerStyle]}>
          <ThemedText numberOfLines={1}>
            {t(footerLabel)}
            {/* {footerLabel} */}
          </ThemedText>
          <ThemedButton
            label={t(footButtonLabel)}
            // label={footButtonLabel}
            onPress={buttonOnPress}
            style={[
              styles.cardFooterButton, 
              { backgroundColor: colors.buttonBackground }
            ]}
          />
        </View>
      </ThemedView>
    </Pressable>
  );
}

const createStyles = (paddingTop?: number) => StyleSheet.create({
  cardHeaderContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: paddingTop || getResponsiveHeight(2),
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  label: {
    fontSize: getResponsiveFontSize(28),
    lineHeight: getResponsiveFontSize(38),
  },
  cardImageContainer: {
    alignItems: 'center',
    height: getResponsiveHeight(30),
    justifyContent: 'center',
    paddingBottom: getResponsiveHeight(3),
  },
  image: {
    width: getResponsiveWidth(90),
    height: getResponsiveHeight(38),
    resizeMode: 'contain',
  },
  cardFooterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    justifyContent: 'space-between',
    borderBottomLeftRadius: getResponsiveWidth(4),
    borderBottomRightRadius: getResponsiveWidth(4),
  },
  cardFooterButton: {
    paddingHorizontal: getResponsiveWidth(4.8),
  },
});