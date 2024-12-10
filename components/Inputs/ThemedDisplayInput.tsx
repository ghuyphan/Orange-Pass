import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, forwardRef } from 'react';
import { StyleSheet, StyleProp, ViewStyle, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ThemedDisplayInputProps = {
    /** The name of the icon to display on the input */
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    /** Label to display on the input */
    label: string;
    /** The value of the input */
    value?: string;
    /** The placeholder of the input */
    placeholder?: string;
    /** Custom styles for the input */
    style?: StyleProp<ViewStyle>;
    /** Whether the input is in an error state */
    isError?: boolean;
    /** The error message to display if the input is in an error state */
    errorMessage?: string;
    /** Function to call when the input is pressed */
    onPress?: () => void;
    /** Whether the input is disabled */
    disabled?: boolean;
};

export const ThemedDisplayInput = forwardRef<View, ThemedDisplayInputProps>(({
    iconName,
    label,
    placeholder,
    value = '',
    style,
    isError = false,
    errorMessage = '',
    onPress = () => { },
    disabled = false,
}, ref) => {
    const { currentTheme } = useTheme();
    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

    const inputContainerStyle = useMemo(() => ([
        // styles.inputContainer,
        {
            backgroundColor: currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
            borderBottomColor: currentTheme === 'light' ? Colors.light.error : Colors.dark.error,
            borderBottomWidth: isError && errorMessage.length > 0 ? 2 : 0,
            borderRadius: 16,
        },
    ]), [currentTheme, isError, errorMessage]);

    const errorLabelStyle = useMemo(() => ({
        color: currentTheme === 'light' ? Colors.light.error : Colors.dark.error
    }), [currentTheme]);

    const textStyle = useMemo(() => ([
        styles.input,
        { 
            color: value ? color : currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder,
            marginLeft: iconName ? 10 : 0 
        }
    ]), [currentTheme, value, color, iconName]);

    return (
        <View style={[styles.container, style]}>
            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={inputContainerStyle}
            >
                <View style={styles.inputContainer}>
                    {!iconName && <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>
                        {label}
                    </ThemedText>}

                    <View style={styles.inputRow}>
                        <MaterialCommunityIcons name={iconName} size={20} color={currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder} />
                        <ThemedText
                            style={textStyle}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {value || placeholder}
                        </ThemedText>
                    </View>
                </View >
            </Pressable>
            {isError && errorMessage.length > 0 && (
                <View style={styles.errorLabelContainer}>
                    <MaterialIcons name="error" size={14} color={errorLabelStyle.color} />
                    <ThemedText style={[styles.errorLabel, errorLabelStyle]}>
                        {errorMessage}
                    </ThemedText>
                </View>
            )}
        </View >
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
    },
    inputContainer: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 16,
    },
    label: {
        fontSize: 13,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        fontSize: 16,
        flex: 1,
    },
    errorLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 10,
    },
    errorLabel: {
        fontSize: 14,
    },
});