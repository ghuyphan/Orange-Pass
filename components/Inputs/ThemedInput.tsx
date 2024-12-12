import React, { useState, useMemo, forwardRef } from 'react';
import {
    TextInput,
    StyleSheet,
    StyleProp,
    ViewStyle,
    View,
    Pressable,
    Modal,
    TouchableWithoutFeedback
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Tooltip } from 'react-native-paper';

export type ThemedInputProps = {
    /** The name of the icon to display on the input */
    iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
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
    /** Whether the input should be secure */
    secureTextEntry?: boolean;
    /** Keyboard type for the input */
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    /** Function to call when the input value changes */
    onChangeText?: (text: string) => void;
    /** Function to call when the input loses focus */
    onBlur?: () => void;
    /** Function to call when the input gains focus */
    onFocus?: () => void;
    /** Function to call when the clear button is pressed */
    onSubmitEditing?: () => void;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Background color for the input */
    backgroundColor?: string;
};

export const ThemedInput = forwardRef<TextInput, ThemedInputProps>(({
    iconName,
    label,
    placeholder,
    value = '',
    style,
    isError = false,
    errorMessage = '',
    secureTextEntry = false,
    keyboardType = 'default',
    onChangeText = () => { },
    onBlur = () => { },
    onFocus = () => { },
    onSubmitEditing = () => { },
    disabled = false,
    backgroundColor
}, ref) => {
    const { currentTheme } = useTheme();
    const [localValue, setLocalValue] = useState(value);
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

    // Color configurations
    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const placeholderColor = currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder;
    const errorColor = currentTheme === 'light' ? Colors.light.error : Colors.dark.error;

    const onClearValue = () => {
        setLocalValue('');
        onChangeText('');
    };

    const onToggleSecureValue = () => setIsSecure(prevState => !prevState);

    const handleChangeText = (text: string) => {
        setLocalValue(text);
        onChangeText(text);
    };

    const inputContainerStyle = useMemo(() => ([
        styles.inputContainer,
        {
            backgroundColor: backgroundColor ??
                (currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground),
        },
        style,
    ]), [currentTheme, isError, errorMessage, style, backgroundColor]);

    const ErrorTooltip = () => (
        <Modal
            transparent={true}
            visible={isErrorModalVisible}
            animationType="fade"
            onRequestClose={() => setIsErrorModalVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setIsErrorModalVisible(false)}>
                <View style={styles.errorModalOverlay}>
                    <View style={[styles.errorTooltip, { backgroundColor: errorColor }]}>
                        <ThemedText style={styles.errorTooltipText}>
                            {errorMessage}
                        </ThemedText>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    return (
        <View style={[styles.container, style]}>
            <ThemedView style={inputContainerStyle}>
                {!iconName && (
                    <ThemedText
                        style={[styles.label, { color }]}
                        type='defaultSemiBold'
                    >
                        {label}
                    </ThemedText>
                )}

                <View style={[styles.inputRow, {
                    borderBottomColor: errorColor,
                    borderBottomWidth: isError && errorMessage ? 1.25 : 0,
                }]}>
                    {iconName && (
                        <MaterialCommunityIcons
                            name={iconName}
                            size={18}
                            color={placeholderColor}
                        />
                    )}
                    <TextInput
                        ref={ref}
                        onSubmitEditing={onSubmitEditing}
                        style={[
                            styles.input,
                            {
                                color,
                                marginLeft: iconName ? 10 : 0
                            }
                        ]}
                        secureTextEntry={isSecure}
                        value={localValue}
                        onChangeText={handleChangeText}
                        onBlur={onBlur}
                        onFocus={onFocus}
                        placeholder={placeholder}
                        placeholderTextColor={placeholderColor}
                        accessible
                        aria-label={label}
                        keyboardType={keyboardType}
                        editable={!disabled}
                    />

                    <View style={styles.rightContainer}>

                        {/* Clear Value Button */}
                        {localValue.length > 0 && !disabled && (
                            <Pressable
                                onPress={onClearValue}
                                style={styles.iconTouchable}
                                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', borderless: false, radius: 10 }}
                            >
                                <MaterialIcons
                                    name={'cancel'}
                                    color={color}
                                    size={16}
                                />
                            </Pressable>
                        )}

                        {/* Secure Entry Toggle */}
                        {localValue.length > 0 && !disabled && secureTextEntry && (
                            <Pressable
                                onPress={onToggleSecureValue}
                                style={[
                                    styles.iconTouchable,
                                    // secureTextEntry ? { marginLeft: 15 } : { marginRight: 0 }
                                ]}
                                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                                android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', borderless: false, radius: 10 }}
                            >
                                <MaterialIcons
                                    name={isSecure ? 'visibility' : 'visibility-off'}
                                    size={16}
                                    color={color}
                                />
                            </Pressable>
                        )}


                        {/* Error Icon */}
                        {isError && errorMessage && (
                            <Tooltip title={errorMessage}
                                enterTouchDelay={0}
                                leaveTouchDelay={1500}
                                theme={{ colors: { onSurface: errorColor } }}
                            >
                                <Pressable
                                    onPress={() => { }}
                                    style={styles.errorIconContainer}
                                >
                                    <MaterialIcons
                                        name="error"
                                        size={16}
                                        color={errorColor}
                                    />
                                </Pressable>
                            </Tooltip>
                        )}

                    </View>
                </View>
            </ThemedView>

            {/* Error Tooltip Modal */}
            <ErrorTooltip />
        </View>
    );
});

ThemedInput.displayName = 'ThemedInput';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
    },
    inputContainer: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 16,
        flexDirection: 'column',
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
        height: 30,
        flex: 1,
        marginRight: 10,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    iconTouchable: {
        borderRadius: 50,
        overflow: 'hidden',
    },
    errorIconContainer: {
        marginLeft: 5,
        padding: 2,
    },
    errorModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    errorTooltip: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    errorTooltipText: {
        color: 'white',
        textAlign: 'center',
    },
});