import Ionicons from '@expo/vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useMemo, forwardRef } from 'react';
import { TextInput, StyleSheet, View, Pressable } from 'react-native';
import { ThemedView } from '../ThemedView';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export type ThemedIconInputProps = {
    lightColor?: string;
    darkColor?: string;
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    value?: string;
    placeholder?: string;
    style?: object;
    pointerEvents?: 'none' | 'auto';
    onChangeText?: (text: string) => void;
    onBlur?: () => void;
    onFocus?: () => void;
    rightIconName?: keyof typeof MaterialCommunityIcons.glyphMap;
    onRightIconPress?: () => void;
    onSubmitEditing?: () => void;
    onLayout?: () => void;
};

export const ThemedIconInput = forwardRef<TextInput, ThemedIconInputProps>(({
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
    onSubmitEditing,
    onLayout,
}, ref) => {
    const { currentTheme } = useTheme();
    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
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
            backgroundColor: currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
        },
        style,
    ]), [currentTheme, style]);

    return (
        <ThemedView style={inputContainerStyle}>
            <View style={styles.inputRow}>
                <View style={styles.leftContainer}>
                    <MaterialCommunityIcons name={iconName} size={20} color={color || currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder} />
                    <TextInput
                        ref={ref} // The ref is attached to the TextInput
                        style={[styles.input, { color }]}
                        value={localValue}
                        onChangeText={handleChangeText}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        placeholder={placeholder}
                        placeholderTextColor={currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder}
                        accessible
                        aria-label={placeholder}
                        onSubmitEditing={onSubmitEditing}
                        pointerEvents={pointerEvents}
                        onLayout={onLayout}
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
                                    size={16}
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
                                <MaterialCommunityIcons
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
});

const styles = StyleSheet.create({
    inputContainer: {
        // flexGrow: 1,
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 16,
        flexDirection: 'column',
        alignItems: 'center',
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
        flex: 1,
    },
    iconTouchable: {
        padding: 5,
        borderRadius: 50,
    },
});