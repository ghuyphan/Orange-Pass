import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Modal,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { ThemedText } from '../ThemedText'; // Assuming this is in a shared location
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';
import { t } from '@/i18n'; // Import t for translations (if needed)

export type DropdownOption = {
  label: string;
  onPress: () => void;
  testID?: string; // For testing
};

type ThemedDropdownButtonProps = {
  label: string;
  options: DropdownOption[]; // Required: The dropdown options
  style?: any;
  textStyle?: any;
  icon?: React.ReactNode; //optional icon
  accessibilityLabel?: string; // Optional: Override default accessibility label
};

export const ThemedDropdownButton: React.FC<ThemedDropdownButtonProps> = ({
  label,
  options,
  style,
  textStyle,
  icon,
  accessibilityLabel
}) => {
  const { currentTheme } = useTheme();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const buttonRef = useRef<Pressable>(null); // Specify the type for the ref

  // Memoize colors for performance
  const colors = useMemo(() => {
    return {
      buttonBackground: currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
      dropdownBackground: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
      dropdownText: currentTheme === 'light' ? Colors.light.text : Colors.dark.text,
      text: currentTheme === 'light' ? Colors.light.text : Colors.dark.text,
    };
  }, [currentTheme]);

  // Use useMemo for styles to prevent unnecessary recalculations
  const styles = useMemo(() => StyleSheet.create({
    button: {
      paddingHorizontal: getResponsiveWidth(4),
      paddingVertical: getResponsiveHeight(1),
      borderRadius: 4,
      backgroundColor: colors.buttonBackground,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: colors.text, // Use themed color
      fontSize: getResponsiveFontSize(1.6), // Use responsive font size (consider a base size)
      marginRight: getResponsiveWidth(2), // Use responsive spacing
    },
    dropdownContainer: {
      position: 'absolute',
      minWidth: getResponsiveWidth(30), // Responsive width
      borderWidth: 1,
      borderColor: '#ccc', // Consider a themed color
      borderRadius: 4,
      paddingVertical: getResponsiveHeight(1), // Responsive padding
      elevation: 5, //for android
      shadowColor: '#000',  //for iOS
      shadowOffset: { width: 0, height: 2 }, //for iOS
      shadowOpacity: 0.25, //for iOS
      shadowRadius: 3.84, //for iOS
      zIndex: 1000,
      backgroundColor: colors.dropdownBackground, // Use themed color
    },
    dropdownItem: {
      paddingHorizontal: getResponsiveWidth(3), // Responsive padding
      paddingVertical: getResponsiveHeight(1),   // Responsive padding
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    icon: {
      color: colors.text,
    }
  }), [colors.buttonBackground, colors.dropdownBackground, colors.text]);


  const measureButton = useCallback(() => {
    if (buttonRef.current) {
      const handle = findNodeHandle(buttonRef.current);
      if (handle) {
        UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
          setButtonLayout({ x: pageX, y: pageY, width, height });
        });
      }
    }
  }, []);  // Empty dependency array because buttonRef is stable


  const toggleDropdown = useCallback(() => {
    setDropdownVisible(prevVisible => !prevVisible); // Use functional update for state
    measureButton();
  }, [measureButton]); // Include measureButton in the dependency array


  const handleOptionPress = useCallback(
    (onPress: () => void) => {
      onPress();
      setDropdownVisible(false);
    },
    [] // Empty dependency array, as onPress is assumed to be stable
  );


  const dropdownAccessibilityLabel = accessibilityLabel || `${label}, ${t('dropdown.menu')}`;


  return (
    <View>
      <Pressable
        ref={buttonRef}
        style={[styles.button, style]}
        onPress={toggleDropdown}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={dropdownAccessibilityLabel}
      >
        <ThemedText style={[styles.buttonText, textStyle]}>{label}</ThemedText>
        {icon ? icon : <ThemedText style={styles.icon}>{dropdownVisible ? '▲' : '▼'}</ThemedText>}
      </Pressable>

      {/* Conditional rendering of the Modal */}
      {dropdownVisible && (
        <Modal
          transparent={true}
          visible={dropdownVisible}
          onRequestClose={() => setDropdownVisible(false)}
          animationType="fade"
        >
          <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.dropdownContainer,
              {
                top: buttonLayout.y + buttonLayout.height,
                left: buttonLayout.x,
              },
            ]}
          >
            {options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => handleOptionPress(option.onPress)}
                style={styles.dropdownItem}
                testID={option.testID}
                accessible={true}
                accessibilityRole="menuitem"
                accessibilityLabel={option.label}
              >
                <ThemedText style={{ color: colors.dropdownText }}>{option.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Modal>
      )}
    </View>
  );
};