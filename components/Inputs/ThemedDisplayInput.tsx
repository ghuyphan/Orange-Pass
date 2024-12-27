import React, { useState, useMemo, forwardRef } from 'react';
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Tooltip } from 'react-native-paper';
import { getIconPath } from '@/utils/returnIcon';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export type ThemedDisplayInputProps = {
  /** The name of the icon to display on the input */
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** The code of the logo to display on the input */
  logoCode?: string;
  /** Label to display on the input */
  label?: string;
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
  /** Function to call when the clear button is pressed */
  onClear?: () => void;
  /** Whether to show the clear button */
  showClearButton?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Background color for the input */
  backgroundColor?: string;
};

export const ThemedDisplayInput = forwardRef<View, ThemedDisplayInputProps>(
  (
    {
      iconName,
      logoCode,
      label,
      placeholder,
      value = '',
      style,
      isError = false,
      errorMessage = '',
      onPress = () => {},
      onClear = () => {},
      showClearButton = true,
      disabled = false,
      backgroundColor,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

    // Color configurations
    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder;
    const errorColor = currentTheme === 'light' ? Colors.light.error : Colors.dark.error;
    const iconPath = useMemo(() => getIconPath(logoCode ?? ''), [logoCode]);

    const inputContainerStyle = useMemo(
      () => [
        styles.inputContainer,
        {
          backgroundColor:
            backgroundColor ??
            (currentTheme === 'light'
              ? Colors.light.inputBackground
              : Colors.dark.inputBackground),
        },
        style,
      ],
      [currentTheme, style, backgroundColor]
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
          {!iconName && !logoCode && (
            <ThemedText style={[styles.label, { color }]} type="defaultSemiBold">
              {label}
            </ThemedText>
          )}

          <Pressable onPress={onPress} disabled={disabled} style={styles.pressableContainer}>
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
                  size={getResponsiveFontSize(18)}
                  color={placeholderColor}
                />
              )}
              {logoCode && (
                <View
                  style={[
                    styles.logoContainer,
                    { marginLeft: iconName ? getResponsiveWidth(2.4) : 0 },
                  ]}
                >
                  <Image source={iconPath} style={styles.logo} resizeMode="contain" />
                </View>
              )}
              <ThemedText
                style={[
                  styles.input,
                  {
                    color: value ? color : placeholderColor,
                    marginLeft: iconName || logoCode ? getResponsiveWidth(2.4) : 0,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {value || placeholder}
              </ThemedText>

              <View style={styles.rightContainer}>
                {/* Clear Value Button */}
                {/* {value.length > 0 && !disabled && ( */}
                {((showClearButton === undefined || showClearButton) && value.length > 0 && !disabled) && (
                
                  <Pressable
                    onPress={onClear}
                    style={styles.iconTouchable}
                    hitSlop={{
                      top: getResponsiveHeight(0.6),
                      bottom: getResponsiveHeight(0.6),
                      left: getResponsiveWidth(1.2),
                      right: getResponsiveWidth(1.2),
                    }}
                  >
                    <MaterialIcons
                      name={'cancel'}
                      color={color}
                      size={getResponsiveFontSize(16)}
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
                    <Pressable
                      onPress={() => setIsErrorModalVisible(true)}
                      style={styles.errorIconContainer}
                    >
                      <MaterialIcons
                        name="error"
                        size={getResponsiveFontSize(16)}
                        color={errorColor}
                      />
                    </Pressable>
                  </Tooltip>
                )}
              </View>
            </View>
          </Pressable>
        </ThemedView>

        {/* Error Tooltip Modal */}
        <ErrorTooltip />
      </View>
    );
  }
);

ThemedDisplayInput.displayName = 'ThemedDisplayInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(3.6),
    borderRadius: getResponsiveWidth(4),
    flexDirection: 'column',
  },
  pressableContainer: {
    width: '100%',
  },
  label: {
    fontSize: getResponsiveFontSize(13),
  },
  logoContainer: {
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: getResponsiveWidth(6),
    marginRight: getResponsiveWidth(1.2),
  },
  logo: {
    width: '55%',
    height: '55%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: getResponsiveHeight(3.6),
  },
  input: {
    fontSize: getResponsiveFontSize(16),
    flex: 1,
    marginRight: getResponsiveWidth(2.4),
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
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