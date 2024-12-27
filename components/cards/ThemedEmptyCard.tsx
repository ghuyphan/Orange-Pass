import React, { useMemo } from 'react';
import { Image, StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { ThemedButton } from '../buttons/ThemedButton';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export type ThemedEmptyCardProps = {
  /** Light color theme for the card text */
  lightColor?: string;
  /** Dark color theme for the card text */
  darkColor?: string;
  /** Header Label to display on the card */
  headerLabel: string;
  /** Footer Label to display on the card */
  footerLabel: string;
  /** Foot Button Label to display on the card */
  footButtonLabel: string;
  /** Function to call when the card is pressed */
  cardOnPress: () => void;
  /** Function to call when the button is pressed */
  buttonOnPress: () => void;
  /** Custom styles for the card */
  style?: object;
  /** Custom styles for the card footer */
  footerStyle?: object;
  /** Vertical padding for the header */
  paddingTop?: number;
  /** Image to display inside the card */
  image?: any;
};

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
  image = require('@/assets/images/card.png'),
}: ThemedEmptyCardProps) {
  const { currentTheme: colorScheme } = useTheme();
  const color = colorScheme === 'light' ? Colors.light.text : Colors.dark.text;
  const buttoncolor =
    colorScheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground;

  const cardContainerStyle = useMemo(
    () => [
      {
        backgroundColor:
          colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
        borderRadius: getResponsiveWidth(4),
      },
      style,
    ],
    [colorScheme, style]
  );

  const footerBackground = useMemo(
    () => ({
      backgroundColor: colorScheme === 'light' ? Colors.light.cardFooter : Colors.dark.cardFooter,
    }),
    [colorScheme]
  );

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        cardHeaderContainer: {
          flexDirection: 'row',
          width: '100%', // Take full available width within padding
          paddingTop: paddingTop || getResponsiveHeight(2), // Responsive padding
          paddingHorizontal: getResponsiveWidth(4.8),
        },
        label: {
          fontSize: getResponsiveFontSize(28),
          lineHeight: getResponsiveFontSize(38),
        },
        cardImageContainer: {
          alignItems: 'center',
          height: getResponsiveHeight(30), // Responsive height
          justifyContent: 'center',
          paddingBottom: getResponsiveHeight(3), // Responsive padding
        },
        image: {
          width: getResponsiveWidth(90), // 85% of screen width
          height: getResponsiveHeight(38), // 30% of screen height
          resizeMode: 'contain', // Maintain aspect ratio
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
          paddingHorizontal: getResponsiveWidth(4.8), // Responsive padding
          // paddingVertical: getResponsiveHeight(1), // Responsive padding
        },
      }),
    [paddingTop]
  );

  return (
    <Pressable style={cardContainerStyle} onPress={cardOnPress}>
      <ThemedView style={cardContainerStyle}>
        <View style={dynamicStyles.cardHeaderContainer}>
          <ThemedText style={[dynamicStyles.label, { color }]} type="title">
            {headerLabel}
          </ThemedText>
        </View>
        <View style={dynamicStyles.cardImageContainer}>
          <Image source={image} style={dynamicStyles.image} />
        </View>
        <View
          style={[dynamicStyles.cardFooterContainer, footerBackground, footerStyle]}
        >
          <ThemedText>{footerLabel}</ThemedText>
          <ThemedButton
            label={footButtonLabel}
            onPress={buttonOnPress}
            style={[dynamicStyles.cardFooterButton, { backgroundColor: buttoncolor }]}
          />
        </View>
      </ThemedView>
    </Pressable>
  );
}