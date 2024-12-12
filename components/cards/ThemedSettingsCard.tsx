import React, { memo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
// import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
export type ThemedSettingsCardItemProps = {
    settingsTitle: string;
    settingsText?: string;
    onPress: () => void;
    leftIcon?: keyof typeof MaterialIcons.glyphMap;
    rightIcon?: keyof typeof MaterialIcons.glyphMap;
    iconColor?: string;
    iconSize?: number;
};


export const ThemedSettingsCardItem = memo(function ThemedSettingsCardItem(props: ThemedSettingsCardItemProps): JSX.Element {
    const {
        settingsTitle,
        settingsText,
        onPress,
        leftIcon = "chevron-left",
        rightIcon = "chevron-right",
        iconColor,
        iconSize = 18,
    } = props;

    const { currentTheme } = useTheme();
    const colors = currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon;
    // const iconsColor = currentTheme === 'light' ? Colors.light.logoIcon : Colors.dark.buttonBackground;

    // const colors = useThemeColor({ light: Colors.light.text, dark: Colors.dark.text }, 'text');
    // const iconsColor = useThemeColor({ light: Colors.light.logoIcon, dark: Colors.dark.buttonBackground }, 'icon');

    return (
        <Pressable onPress={onPress} android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}>
            <View style={styles.settingsCardContainer}>
                <View style={styles.leftContainer}>
                    <MaterialIcons name={leftIcon} size={iconSize} color={iconColor || colors} />
                    <ThemedText style={styles.sectionTitle}>{settingsTitle}</ThemedText>
                </View>
                <View style={styles.rightContainer}>
                    <ThemedText style={styles.settingsText}>{settingsText}</ThemedText>
                    <MaterialIcons style={{ opacity: 0.5 }} name={rightIcon} size={iconSize} color={iconColor || colors} />
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
        paddingHorizontal: 15,
        paddingVertical: 10,
        overflow: 'hidden',
        borderRadius: 16,
    },
    sectionTitle: {
        fontSize: 16,
    },
    settingsText: {
        fontSize: 16,
        opacity: 0.5,
    },
    iconContainer: {
        width: 30,
        height: 30,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
    }
});
