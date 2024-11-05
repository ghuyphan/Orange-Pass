import React, { useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Portal } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedTextButton } from '../buttons/ThemedTextButton';

export type ThemedModalProps = {
    lightColor?: string;
    darkColor?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    title: string;
    message: string;
    isVisible: boolean;
    onDismiss?: () => void;
    style?: StyleProp<ViewStyle>;
    onPrimaryAction?: () => void;
    primaryActionText?: string;
    onSecondaryAction?: () => void;
    secondaryActionText?: string;
    dismissable?: boolean
};

export function ThemedModal({
    lightColor,
    darkColor,
    iconName,
    title,
    message,
    isVisible,
    onDismiss,
    onPrimaryAction,
    primaryActionText,
    onSecondaryAction,
    secondaryActionText,
    style = {},
    dismissable = false
}: ThemedModalProps) {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();

    const modalStyle = [
        styles.modalContainer,
        {
            backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background,
        },
        style,
    ];

    // Reanimated values for fade-in/out effect
    const opacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    useEffect(() => {
        if (isVisible) {
            opacity.value = withTiming(1, { duration: 300 });
        } else {
            opacity.value = withTiming(0, { duration: 300 });
        }
    }, [isVisible, opacity]);

    return (
        <Portal>
            <Modal dismissable = {dismissable} visible={isVisible} onDismiss={onDismiss} contentContainerStyle={styles.overlay}>
                <Animated.View style={[modalStyle, animatedStyle]}>
                    {/* Icon */}
                    <Ionicons
                        name={iconName || 'information-circle'}
                        size={28}
                        color={color}
                        style={styles.icon}
                    />

                    {/* Title */}
                    <ThemedText style={styles.titleText} type="defaultSemiBold">
                        {title}
                    </ThemedText>

                    {/* Description Message */}
                    <ThemedText style={styles.messageText} type="default">
                        {message}
                    </ThemedText>

                    {/* Action Buttons */}
                    <View style={styles.actions}>

                        <ThemedTextButton
                            onPress={onSecondaryAction ? onSecondaryAction : () => { }}
                            label={secondaryActionText ?? 'Cancel'}
                            style={styles.actionButton}
                        />
                        <ThemedTextButton
                            onPress={onPrimaryAction ? onPrimaryAction : () => { }}
                            label={primaryActionText ?? 'Done'}
                            style={styles.actionButton}
                        />
                    </View>
                </Animated.View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
    },
    modalContainer: {
        minWidth: '95%',
        borderRadius: 12,
        padding: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginBottom: 15,
    },
    titleText: {
        fontSize: 20,
        textAlign: 'center',
    },
    messageText: {
        fontSize: 16,
        marginVertical: 15,
        maxWidth: '90%',
        lineHeight: 24,
        overflow: 'hidden',
    },
    actions: {
        flexDirection: 'row',
        alignSelf: 'flex-end',
        // justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
        gap: 5,
    },
    actionButton: {
        // paddingVertical: 10,
        paddingHorizontal: 5,
        borderRadius: 8,
        // backgroundColor: Colors.light.primary, // Use your theme's primary color
    },
    actionText: {
        color: Colors.light.text, // Or appropriate text color from the theme
        textAlign: 'center',
        fontSize: 16,
    },
});
