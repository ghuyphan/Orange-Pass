import { useMemo } from 'react';
import { StyleSheet, TouchableWithoutFeedback, View, Image } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { ThemedButton } from '../buttons/ThemedButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedEmptyCard = {
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
    footerStyle?: object
};

/**
 * ThemedCardEmpty is a reusable input component that adapts to the current theme.
 * It supports light and dark color themes, displays an optional icon, and handles
 * value changes with customizable styles.
 *
 * @param {ThemedEmptyCard} props - The properties for the ThemedInput component.
 * @returns {JSX.Element} The ThemedInput component.
 */
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
}: ThemedEmptyCard) {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();

    const cardContainerStyle = useMemo(() => ([
        {
            backgroundColor: colorScheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
            borderRadius: 10,
        },
        style,
    ]), [colorScheme, style]);

    const footerBackground = useMemo(() => ({
        backgroundColor: colorScheme === 'light' ? Colors.light.cardFooter : Colors.dark.cardFooter
    }), [colorScheme]);

    return (
            <TouchableWithoutFeedback style={cardContainerStyle} onPress={cardOnPress}>
                <ThemedView style={cardContainerStyle}>
                    <View style={styles.cardHeaderContainer}>
                        <ThemedText style={[styles.label, { color }]} type='title'>
                            {headerLabel}
                        </ThemedText>
                    </View>
                    <View style={styles.cardImageContainer}>
                        <Image
                            source={require('@/assets/images/empty-icon.png')}
                            style={styles.image}
                        />
                    </View>
                    <View style={[styles.cardFooterContainer, footerBackground, footerStyle]}>
                        <ThemedText>{footerLabel}</ThemedText>
                        <ThemedButton label={footButtonLabel} onPress={buttonOnPress} style={styles.cardFooterButton} />
                    </View>
                </ThemedView>
            </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    cardHeaderContainer: {
        flexDirection: 'row',
        width: '90%',
        paddingHorizontal: 15,
        paddingTop: 15,
    },
    label: {
        fontSize: 28,
        lineHeight: 38,
    },
    cardImageContainer: {
        alignItems: 'center',
        height: 220,
        justifyContent: 'center',
    },
    image: {
        width: 400, 
        height: 350, 
        resizeMode: 'cover',    
    },
    cardFooterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        justifyContent: 'space-between',
        backgroundColor: '#6A524E',
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    cardFooterButton: { 
        paddingHorizontal: 25, 
        paddingVertical: 5
    }
});
