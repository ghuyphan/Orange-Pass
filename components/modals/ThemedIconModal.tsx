import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Modal, Portal } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { ThemedTextButton } from '../buttons/ThemedTextButton';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export type ThemedModalProps = {
  lightColor?: string;
  darkColor?: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  message: string;
  isVisible: boolean;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  onPrimaryAction?: () => void;
  primaryActionText?: string;
  onSecondaryAction?: () => void;
  secondaryActionText?: string;
  dismissable?: boolean;
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
  dismissable = false,
}: ThemedModalProps) {
  const { currentTheme } = useTheme();
  const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

  // Reanimated values for fade-in/out effect
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  useEffect(() => {
    if (isVisible) {
      // Animate in
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Animate out
      opacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      scale.value = withTiming(0.8, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [isVisible]);

  const modalStyle = [
    styles.modalContainer,
    {
      backgroundColor:
        currentTheme === 'light' ? Colors.light.background : Colors.dark.background,
    },
    style,
  ];

  const handleOnDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    }
  }, [onDismiss]);

  const handleOnPrimaryAction = useCallback(() => {
    if (onPrimaryAction) {
      onPrimaryAction();
    }
  }, [onPrimaryAction]);

  const handleOnSecondaryAction = useCallback(() => {
    if (onSecondaryAction) {
      onSecondaryAction();
    }
  }, [onSecondaryAction]);

  return (
    <Portal>
      <Modal
        theme={{ colors: { backdrop: 'rgba(0, 0, 0, 0.7)' } }}
        dismissable={dismissable}
        visible={isVisible}
        onDismiss={handleOnDismiss}
        contentContainerStyle={styles.overlay}
      >
        <Animated.View style={[modalStyle, animatedStyle]}>
          {/* Icon */}
          <MaterialIcons
            name={iconName || 'info'}
            size={getResponsiveFontSize(25)}
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
              onPress={handleOnSecondaryAction}
              label={secondaryActionText ?? t('common.cancel')}
              style={styles.actionButton}
            />
            <ThemedTextButton
              onPress={handleOnPrimaryAction}
              label={primaryActionText ?? t('common.done')}
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

    padding: getResponsiveWidth(3.6),
  },
  modalContainer: {
    
    minWidth: '95%',
    borderRadius: getResponsiveWidth(4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: getResponsiveHeight(1.8),
  },
  titleText: {
    fontSize: getResponsiveFontSize(18),
    textAlign: 'center',
  },
  messageText: {
    fontSize: getResponsiveFontSize(16),
    marginVertical: getResponsiveHeight(1.8),
    maxWidth: '90%',
    lineHeight: getResponsiveFontSize(24),
    overflow: 'hidden',
    opacity: 0.7,
  },
  actions: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignSelf: 'flex-end',
    width: '100%',
    marginTop: getResponsiveHeight(1.2),
    gap: getResponsiveWidth(2.4),
  },
  actionButton: {
    paddingHorizontal: getResponsiveWidth(1.2),
    borderRadius: getResponsiveWidth(2),
  },
  actionText: {
    color: Colors.light.text,
    textAlign: 'center',
    fontSize: getResponsiveFontSize(16),
  },
});