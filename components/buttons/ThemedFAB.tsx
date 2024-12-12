import React, { useMemo, useState, useEffect, forwardRef } from 'react';
import { FAB } from 'react-native-paper';
import { StyleProp, ViewStyle, View, StyleSheet, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  withDelay,
  withSequence,
  useSharedValue,
} from 'react-native-reanimated';
import { ThemedButton } from './ThemedButton';

export type ThemedFABProps = {
  lightColor?: string;
  darkColor?: string;
  label?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: StyleProp<ViewStyle>;
  onPress1: () => void;
  onPress2: () => void;
  onPress3: () => void;
  text1?: string;
  text2?: string;
  text3?: string;
  textStyle?: StyleProp<TextStyle>;
};

// Add display name to resolve the display name warning
export const ThemedFAB = forwardRef<View, ThemedFABProps>(({
  open,
  setOpen,
  onPress1,
  onPress2,
  onPress3,
  text1,
  text2,
  text3,
  style,
  animatedStyle,
  textStyle,
}, ref) => {
  const { currentTheme } = useTheme();
  const [closing, setClosing] = useState(false);
  const isAnimating = useSharedValue(false);

  // Memoize color calculations to prevent unnecessary re-renders
  const colors = useMemo(() => {
    const isLightTheme = currentTheme === 'light';
    return {
      icon: isLightTheme ? Colors.light.icon : Colors.dark.icon,
      button: isLightTheme ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
      text: isLightTheme ? Colors.dark.text : Colors.dark.text,
      textBackground: isLightTheme
        ? 'rgba(255, 255, 255, 0.5)'
        : 'rgba(0, 0, 0, 0.5)'
    };
  }, [currentTheme]);

  // Shared animation configuration
  const animationConfig = useMemo(() => ({
    duration: 250,
    easing: Easing.out(Easing.cubic)
  }), []);

  // Optimize repeated animation styles with memoization
  const translateY = useAnimatedStyle(() => ({
    transform: [{
      translateY: withTiming(open ? -30 : 0, {
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1)
      })
    }]
  }), [open]);

  // Create custom hooks for animation styles to resolve hook rule errors
  const useButtonAnimationStyle = (delay: number) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAnimatedStyle(() => ({
      elevation: withDelay(delay, withTiming(open ? 5 : 0, animationConfig)),
      opacity: withDelay(
        delay,
        withSequence(
          withTiming(open ? 1 : 0, animationConfig),
          withTiming(open ? 1 : 0, animationConfig)
        )
      ),
      transform: [{
        scale: withDelay(
          delay,
          withSequence(
            withTiming(open ? 1 : 0.8, animationConfig),
            withTiming(open ? 1 : 0.8, animationConfig)
          )
        )
      }]
    }), [open, delay, animationConfig]);
  };

  const useTextAnimationStyle = (delay: number) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAnimatedStyle(() => ({
      opacity: withDelay(
        delay,
        withSequence(
          withTiming(open ? 1 : 0, animationConfig),
          withTiming(open ? 1 : 0, animationConfig)
        )
      ),
      transform: [{
        translateX: withDelay(
          delay,
          withSequence(
            withTiming(open ? 0 : -20, animationConfig),
            withTiming(open ? 0 : -20, animationConfig)
          )
        )
      }],
    }), [open, delay, animationConfig]);
  };

  const buttonStyle1 = useButtonAnimationStyle(50);
  const buttonStyle2 = useButtonAnimationStyle(100);
  const buttonStyle3 = useButtonAnimationStyle(150);
  const textStyle1 = useTextAnimationStyle(50);
  const textStyle2 = useTextAnimationStyle(100);
  const textStyle3 = useTextAnimationStyle(150);

  // useEffect to handle closing animation
  useEffect(() => {
    if (!open) {
      const timeoutId = setTimeout(() => {
        setClosing(false);
      }, animationConfig.duration * 2);

      return () => clearTimeout(timeoutId);
    } else {
      setClosing(true);
    }
  }, [open, animationConfig.duration]);

  const handleFABPress = () => {
    if (isAnimating.value) return; // Prevent spamming

    isAnimating.value = true;
    setOpen(!open);

    setTimeout(() => {
      isAnimating.value = false;
    }, animationConfig.duration * 2);
  };

  const handlePressWithAnimation = (onPress: () => void) => () => {
    if (isAnimating.value) return;
    isAnimating.value = true;

    setOpen(false); // Close the FAB menu

    setTimeout(() => {
      onPress();
      isAnimating.value = false;
    }, animationConfig.duration * 2);
  };

  return (
    <Animated.View style={[style, animatedStyle, styles.container]} ref={ref}>
      {(open || closing) && ( // Render while open or closing
        <Animated.View style={translateY}>
          <View style={styles.buttonsWrapper}>
            {text3 && (
              <View style={styles.buttonRow}>
                <Animated.Text
                  style={[
                    styles.buttonText,
                    {
                      color: colors.text,
                    },
                    textStyle,
                    textStyle3
                  ]}
                >
                  {text3}
                </Animated.Text>
                <ThemedButton
                  style={styles.fab}
                  animatedStyle={buttonStyle3}
                  onPress={handlePressWithAnimation(onPress3)}
                  iconName="image"
                />
              </View>
            )}
            {text2 && (
              <View style={styles.buttonRow}>
                <Animated.Text
                  style={[
                    styles.buttonText,
                    {
                      color: colors.text,
                    },
                    textStyle,
                    textStyle2
                  ]}
                >
                  {text2}
                </Animated.Text>
                <ThemedButton
                  style={styles.fab}
                  animatedStyle={buttonStyle2}
                  onPress={handlePressWithAnimation(onPress1)}
                  iconName="camera"
                />
              </View>
            )}
            {text1 && (
              <View style={styles.buttonRow}>
                <Animated.Text
                  style={[
                    styles.buttonText,
                    {
                      color: colors.text,
                    },
                    textStyle,
                    textStyle1
                  ]}
                >
                  {text1}
                </Animated.Text>
                <ThemedButton
                  style={styles.fab}
                  animatedStyle={buttonStyle1}
                  onPress={handlePressWithAnimation(onPress2)}
                  iconName="plus-circle"
                />
              </View>
            )}
          </View>
        </Animated.View>
      )}
      <FAB
        icon={open ? 'close' : 'plus'}
        color={colors.icon}
        style={{ backgroundColor: colors.button }}
        onPress={handleFABPress}
      />
    </Animated.View>
  );
});

// Add display name explicitly
ThemedFAB.displayName = 'ThemedFAB';

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    width: 'auto',
    pointerEvents: 'box-none'
  },
  buttonsWrapper: {
    alignItems: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  fab: {
    padding: 10,
    marginLeft: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 1,
  }
});