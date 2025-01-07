import React, { useState, useMemo, forwardRef } from 'react';
import {
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';
import { Colors } from '@/constants/Colors';
import { Tooltip } from 'react-native-paper';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

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
  /** Whether to disable the opacity change when the input is disabled */
  disableOpacityChange?: boolean;
};

export const ThemedInput = forwardRef<TextInput, ThemedInputProps>(
  (
    {
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
      backgroundColor,
      disableOpacityChange = false,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const { locale } = useLocale(); // If you need locale-specific logic, use this
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

    const onToggleSecureValue = () => setIsSecure((prevState) => !prevState);

    const handleChangeText = (text: string) => {
      setLocalValue(text);
      onChangeText(text);
    };

    const inputContainerStyle = useMemo(
      () => [
        styles.inputContainer,
        {
          backgroundColor:
            backgroundColor ??
            (currentTheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground),
          opacity: disabled && !disableOpacityChange ? 0.5 : 1, // Opacity control
        },
        style,
      ],
      [currentTheme, style, backgroundColor, disabled, disableOpacityChange] // Updated dependencies
    );

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
              <ThemedText style={styles.errorTooltipText}>{errorMessage}</ThemedText>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );

    return (
      <View style={[styles.container, style]}>
        <ThemedView style={inputContainerStyle}>
          {!iconName && (
            <ThemedText style={[styles.label, { color }]} type="defaultSemiBold">
              {label}
            </ThemedText>
          )}

          <View
            style={[
              styles.inputRow,
              {
                borderBottomColor: errorColor,
                borderBottomWidth: isError && errorMessage ? getResponsiveWidth(0.3) : 0,
              },
            ]}
          >
            {iconName && (
              <MaterialCommunityIcons
                name={iconName}
                // size={getResponsiveWidth(4.5)}
                size={getResponsiveFontSize(16)}
                color={placeholderColor}
              />
            )}
            <TextInput
              ref={ref}
              onSubmitEditing={onSubmitEditing}
              style={[
                styles.input,
                {
                  color: disabled ? placeholderColor : color,
                  marginLeft: iconName ? getResponsiveWidth(2.5) : 0,
                },
              ]}
              secureTextEntry={isSecure}
              value={localValue}
              onChangeText={handleChangeText}
              onBlur={onBlur}
              onFocus={onFocus}
              placeholder={placeholder}
              placeholderTextColor={placeholderColor}
              accessible={true}
              accessibilityLabel={label} // For better accessibility
              keyboardType={keyboardType}
              editable={!disabled}
            />

            <View style={styles.rightContainer}>
              {/* Clear Value Button */}
              {localValue.length > 0 && (
                <Pressable
                  onPress={disabled ? undefined : onClearValue}
                  style={styles.iconTouchable}
                  hitSlop={{
                    top: getResponsiveHeight(0.6),
                    bottom: getResponsiveHeight(0.6),
                    left: getResponsiveWidth(1.2),
                    right: getResponsiveWidth(1.2),
                  }}
                  disabled={disabled}
                >
                  <MaterialIcons name={'cancel'} color={color} size={getResponsiveFontSize(16)} />
                </Pressable>
              )}

              {/* Secure Entry Toggle */}
              {localValue.length > 0 && secureTextEntry && (
                <Pressable
                  onPress={disabled ? undefined : onToggleSecureValue}
                  style={[styles.iconTouchable]}
                  hitSlop={{
                    top: getResponsiveHeight(0.6),
                    bottom: getResponsiveHeight(0.6),
                    left: getResponsiveWidth(1.2),
                    right: getResponsiveWidth(1.2),
                  }}
                  disabled={disabled}
                >
                  <MaterialIcons
                    name={isSecure ? 'visibility' : 'visibility-off'}
                    size={getResponsiveWidth(4)}
                    color={color}
                  />
                </Pressable>
              )}

              {/* Error Icon */}
              {isError && errorMessage && (
                <Tooltip
                  title={errorMessage}
                  enterTouchDelay={0}
                  leaveTouchDelay={1500}
                  theme={{ colors: { onSurface: errorColor } }}
                >
                  <Pressable onPress={() => { }} style={styles.errorIconContainer}>
                    <MaterialIcons name="error" size={getResponsiveWidth(4)} color={errorColor} />
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
  }
);

ThemedInput.displayName = 'ThemedInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    flexDirection: 'column',
  },
  label: {
    fontSize: getResponsiveFontSize(13),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    fontSize: getResponsiveFontSize(16),
    height: getResponsiveHeight(3.6),
    flex: 1,
    marginRight: getResponsiveWidth(2.4),
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(3.6),
  },
  iconTouchable: {
    borderRadius: getResponsiveWidth(12),
    overflow: 'hidden',
  },
  errorIconContainer: {
    marginLeft: getResponsiveWidth(1.2),
    padding: getResponsiveWidth(0.5),
  },
  errorModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorTooltip: {
    maxWidth: '80%',
    padding: getResponsiveWidth(2.4),
    borderRadius: getResponsiveWidth(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveHeight(0.25) },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveWidth(0.92),
    elevation: 5,
  },
  errorTooltipText: {
    color: 'white',
    textAlign: 'center',
  },
});

export default ThemedInput;