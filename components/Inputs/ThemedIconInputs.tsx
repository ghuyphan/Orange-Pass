import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useMemo } from 'react';
import { TextInput, StyleSheet, TouchableHighlight, View, TouchableWithoutFeedback, Pressable } from 'react-native';
import { ThemedView } from '../ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedIconInput = {
    lightColor?: string;
    darkColor?: string;
    iconName: keyof typeof Ionicons.glyphMap;
    value?: string;
    placeholder?: string;
    style?: object;
    pointerEvents?: 'none' | 'auto';
    onChangeText?: (text: string) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    rightIconName?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    onSubmitEditing ?: () => void
};

export function ThemedIconInput({
    lightColor,
    darkColor,
    iconName,
    placeholder,
    value = '',
    style,
    pointerEvents = 'auto',
    onChangeText = () => { },
    onBlur = () => { },
    onFocus = () => { },
    rightIconName,
    onRightIconPress,
    onSubmitEditing
}: ThemedIconInput) {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();
    const [localValue, setLocalValue] = useState(value);

    const onClearValue = () => {
        setLocalValue('');
        onChangeText('');
    };

    const handleChangeText = (text: string) => {
        setLocalValue(text);
        onChangeText(text);
    };

    const inputContainerStyle = useMemo(() => ([
        styles.inputContainer,
        {
            backgroundColor: colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
        },
        style,
    ]), [colorScheme, style]);

    return (
        <ThemedView style={inputContainerStyle}>
            <View style={styles.inputRow}>
                <View style={styles.leftContainer}>
                    <Ionicons name={iconName} size={20} color={color} />
                    <TextInput
                        style={[styles.input, { color }]}
                        value={localValue}
                        onChangeText={handleChangeText}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        placeholder={placeholder}
                        placeholderTextColor={colorScheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder}
                        accessible
                        aria-label={placeholder}
                        onSubmitEditing={onSubmitEditing}
                        pointerEvents={pointerEvents}
                    />
                </View>
                <View style={styles.rightContainer}>
                    {localValue.length > 0 && (
                        <Pressable
                            onPress={onClearValue}
                            hitSlop={40}
                        >
                            <View style={styles.iconTouchable}>
                            <Ionicons
                                name={'close-circle'}
                                size={20}
                                color={color}
                            />
                            </View>
                        </Pressable>
                    )}
                    {rightIconName && (
                        <Pressable
                            onPress={onRightIconPress}
                            hitSlop={40}
                        >
                            <View style={styles.iconTouchable}>
                            <Ionicons
                                name={rightIconName}
                                size={20}
                                color={color}
                            />
                            </View>
                        </Pressable>
                    )}
                </View>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        flexGrow: 1,
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 10,
        flexDirection: 'column',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,  // Allow this container to take the available space
        gap: 10,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 40,
        gap: 5,
    },
    input: {
        fontSize: 16,
        height: 30,
        flex: 1,  // Allow TextInput to take up the remaining space within leftContainer
    },
    iconTouchable: {
        padding: 5,
        borderRadius: 50,
    },
});