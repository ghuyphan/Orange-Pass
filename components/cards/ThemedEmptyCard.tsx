import { useMemo } from 'react';
import { StyleSheet, View, Pressable, Image, Dimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { ThemedButton } from '../buttons/ThemedButton';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

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
    colorScheme === 'light'
      ? Colors.light.buttonBackground
      : Colors.dark.buttonBackground;

  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  const cardContainerStyle = useMemo(
    () => [
      {
        backgroundColor:
          colorScheme === 'light'
            ? Colors.light.cardBackground
            : Colors.dark.cardBackground,
        borderRadius: 16,
        // paddingHorizontal: 20, // Consistent horizontal padding
      },
      style,
    ],
    [colorScheme, style, windowWidth],
  );

  const footerBackground = useMemo(
    () => ({
      backgroundColor:
        colorScheme === 'light'
          ? Colors.light.cardFooter
          : Colors.dark.cardFooter,
    }),
    [colorScheme],
  );

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        cardHeaderContainer: {
          flexDirection: 'row',
          width: '100%', // Take full available width within padding
          paddingTop: paddingTop || windowHeight * 0.02, // Relative padding
          paddingHorizontal: 20,
        },
        label: {
          fontSize: windowWidth > 360 ? 28 : 24,
          lineHeight: windowWidth > 360 ? 38 : 32,
        },
        cardImageContainer: {
          alignItems: 'center',
          height: windowHeight * 0.3, // Relative height
          justifyContent: 'center',
          paddingBottom: windowHeight * 0.03, // Relative padding
        },
        image: {
          width: windowWidth * 0.85, // 80% of screen width
          height: windowHeight * 0.5, // 25% of screen height
          resizeMode: 'contain', // Maintain aspect ratio
        },
        cardFooterContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: windowHeight * 0.02, // Relative padding
          paddingHorizontal: 20,
          justifyContent: 'space-between',
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
        },
        cardFooterButton: {
          paddingHorizontal: windowWidth * 0.05, // Relative padding
          paddingVertical: windowHeight * 0.01, // Relative padding
        },
      }),
    [windowWidth, windowHeight, paddingTop],
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
          style={[
            dynamicStyles.cardFooterContainer,
            footerBackground,
            footerStyle,
          ]}
        >
          <ThemedText>{footerLabel}</ThemedText>
          <ThemedButton
            label={footButtonLabel}
            onPress={buttonOnPress}
            style={[
              dynamicStyles.cardFooterButton,
              { backgroundColor: buttoncolor },
            ]}
          />
        </View>
      </ThemedView>
    </Pressable>
  );
}