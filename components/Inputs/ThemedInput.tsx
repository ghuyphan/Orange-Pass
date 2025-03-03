import React, { useState, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import {
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TextInputSelectionChangeEventData, // Import this
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useTheme } from '@/context/ThemeContext';
// import { useLocale } from '@/context/LocaleContext'; // Removed as not used
import { Colors } from '@/constants/Colors';
import { Tooltip } from 'react-native-paper';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export type ThemedInputProps = {
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  label?: string;
  value?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  isError?: boolean;
  errorMessage?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  onChangeText?: (text: string) => void;
  onBlur?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onFocus?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onSubmitEditing?: () => void;
  disabled?: boolean;
  backgroundColor?: string;
  disableOpacityChange?: boolean;
  required?: boolean;
  onDisabledPress?: () => void;
};

type Selection = {
  start: number;
  end: number;
};

export const ThemedInput = forwardRef<
  { focus: () => void }, // Define the type of the exposed ref
  ThemedInputProps
>(
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
      onChangeText = () => {},
      onBlur = () => {},
      onFocus = () => {},
      onSubmitEditing = () => {},
      disabled = false,
      backgroundColor,
      disableOpacityChange = false,
      required = false,
      onDisabledPress,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    // const { locale } = useLocale(); // You're not using this, consider removing if not needed
    const [localValue, setLocalValue] = useState(value);
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
    // Add state for selection
    const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
    const [isFocused, setIsFocused] = useState(false);

    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder;
    const errorColor = currentTheme === 'light' ? Colors.light.error : Colors.dark.error;

    // useRef to get a reference to the TextInput
    const textInputRef = useRef<TextInput>(null);

    // Use useImperativeHandle to expose only the focus method
    useImperativeHandle(ref, () => ({
      focus: () => {
        textInputRef.current?.focus();
      },
    }));

    const onClearValue = useCallback(() => {
      setLocalValue('');
      onChangeText('');
       // Reset selection when clearing
      setSelection({ start: 0, end: 0 });
    }, [onChangeText]);

    const onToggleSecureValue = useCallback(() => setIsSecure((prevState) => !prevState), []);

    const handleChangeText = useCallback((text: string) => {
      setLocalValue(text);
      onChangeText(text);
      // Important:  Do NOT update selection here.  Update it in onSelectionChange.
    }, [onChangeText]);

    const handleBlur = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
      onBlur(event);
      setIsFocused(false);
    }, [onBlur]);

    const handleFocus = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
      onFocus(event);
      setIsFocused(true);
    }, [onFocus]);

    const handleDisabledPress = useCallback(() => {
      if (onDisabledPress) {
        onDisabledPress();
      }
    }, [onDisabledPress]);

    // Add onSelectionChange handler
    const handleSelectionChange = useCallback(
        (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
          // Only update selection state if the input is focused. This prevents issues on Android.
          if (isFocused) {
            setSelection(event.nativeEvent.selection);
          }
        },
        [isFocused]
    );

    const inputContainerStyle = [
      styles.inputContainer,
      {
        backgroundColor:
          backgroundColor ??
          (currentTheme === 'light'
            ? Colors.light.inputBackground
            : Colors.dark.inputBackground),
        opacity: disabled && !disableOpacityChange ? 0.5 : 1,
      },
      style,
    ];

    const ErrorTooltip = useCallback(() => (
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
    ), [isErrorModalVisible, errorMessage, errorColor]);
    
    return (
      <View style={[styles.container, style]}>
        <Pressable
          style={{ width: '100%' }}
          onPress={disabled ? handleDisabledPress : undefined}
          disabled={!disabled} // Corrected disabled logic
        >
          <ThemedView style={inputContainerStyle}>
            {!iconName && (
              <ThemedText style={[styles.label, { color }]} type="defaultSemiBold">
                {label}
                {required && <ThemedText style={{ color: 'red' }}> *</ThemedText>}
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
                  size={getResponsiveFontSize(16)}
                  color={placeholderColor}
                />
              )}
              <TextInput
                ref={textInputRef} // Assign the ref to the TextInput
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
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder={placeholder}
                placeholderTextColor={placeholderColor}
                accessible={true}
                accessibilityLabel={label}
                keyboardType={keyboardType}
                editable={!disabled}
                selection={selection} // Set the selection prop
                onSelectionChange={handleSelectionChange} // Handle selection changes
              />

              <View style={styles.rightContainer}>
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

                {isError && errorMessage && (
                  <Tooltip
                    title={errorMessage}
                    enterTouchDelay={0}
                    leaveTouchDelay={1500}
                    theme={{ colors: { onSurface: errorColor } }}
                  >
                    <Pressable onPress={() => {}} style={styles.errorIconContainer}>
                      <MaterialIcons name="error" size={getResponsiveWidth(4)} color={errorColor} />
                    </Pressable>
                  </Tooltip>
                )}
              </View>
            </View>
          </ThemedView>
        </Pressable>

        <ErrorTooltip />
      </View>
    );
  }
);

ThemedInput.displayName = 'ThemedInput';

// Add default props for easier usage
ThemedInput.defaultProps = {
  placeholder: '',
  secureTextEntry: false,
  keyboardType: 'default',
  disabled: false,
  disableOpacityChange: false,
  required: false,
};


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