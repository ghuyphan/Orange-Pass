import React, { useEffect, useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { ThemedTextButton } from '../buttons/ThemedTextButton';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from '@react-native-community/blur';
import { Portal } from 'react-native-paper';

export type ThemedModalProps = {
  lightColor?: string;
  darkColor?: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
  onPrimaryAction?: () => void;
  primaryActionText?: string;
  onSecondaryAction?: () => void;
  secondaryActionText?: string;
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
}: ThemedModalProps) {
  const { currentTheme } = useTheme();
  const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

  const [showModal, setShowModal] = useState(isVisible);

  const modalStyle = [
    styles.modalContainer,
    {
      backgroundColor: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    },
    style,
  ];

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8); 

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (isVisible) {
      setShowModal(true);
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 }); 
    } else {
      // Start the closing animation
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });

      // Delay the onDismiss callback
      const timeout = setTimeout(() => {
        setShowModal(false); // Stop rendering modal after animation
        onDismiss();
      }, 200); // Match the animation duration

      return () => clearTimeout(timeout); 
    }
  }, [isVisible, opacity, scale, onDismiss]); 

  if (!showModal) return null; // Render null when modal is hidden

  return (
    <Portal>
      <View style={styles.fullScreenOverlay}>
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.overlay}>
            <BlurView
              blurType={'dark'}
              blurAmount={5}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View style={[modalStyle, animatedStyle]}>
              <MaterialIcons
                name={iconName || 'info'}
                size={25}
                color={color}
                style={styles.icon}
              />

              <ThemedText style={styles.titleText} type="defaultSemiBold">
                {title}
              </ThemedText>

              <ThemedText style={styles.messageText} type="default">
                {message}
              </ThemedText>

              <View style={styles.actions}>
                <ThemedTextButton
                  onPress={onSecondaryAction}
                  label={secondaryActionText ?? 'Cancel'}
                  style={styles.actionButton}
                />
                <ThemedTextButton
                  onPress={onPrimaryAction}
                  label={primaryActionText ?? 'Done'}
                  style={styles.actionButton}
                />
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  },
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    flex: 1,
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
    fontSize: 18,
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
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 5,
    borderRadius: 8,
  },
  actionText: {
    color: Colors.light.text,
    textAlign: 'center',
    fontSize: 16,
  },
});
