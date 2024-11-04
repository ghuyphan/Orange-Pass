import React, { memo } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
export type ThemedSettingsCardItemProps = {
    settingsTitle: string;
    settingsText?: string;
    onPress: () => void;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    iconSize?: number;
};


export const ThemedSettingsCardItem = memo(function ThemedSettingsCardItem(props: ThemedSettingsCardItemProps): JSX.Element {
    const {
        settingsTitle,
        settingsText,
        onPress,
        leftIcon = "chevron-back",
        rightIcon = "chevron-forward",
        iconColor,
        iconSize = 18,
    } = props;

    const colorScheme = useColorScheme();
    const colors = useThemeColor({ light: Colors.light.text, dark: Colors.dark.text }, 'text');

    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <View style={styles.settingsCardContainer}>
                <View style={styles.leftContainer}> 
                <Ionicons name={leftIcon} size={20} color={iconColor || colors}/>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>{settingsTitle}</ThemedText>
                </View>
                <View style={styles.rightContainer}>
                    <ThemedText style={styles.settingsText}>{settingsText}</ThemedText>
                    <Ionicons name={rightIcon} size={iconSize} color={iconColor || colors} />
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
});

const styles = StyleSheet.create({
    settingsCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15
    },
    sectionTitle: {
        fontSize: 16,
    },
    settingsText: {
        fontSize: 16,
        opacity: 0.7,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    }
});
