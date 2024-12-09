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

export const ThemedFAB = forwardRef(({
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
}: ThemedFABProps, ref) => {
  const { currentTheme } = useTheme();
  const [closing, setClosing] = useState(false);
  const isAnimating = useSharedValue(false);

  // Memoize color calculations to prevent unnecessary re-renders
  const colors = useMemo(() => {
    const isLightTheme = currentTheme === 'light';
    return {
      icon: isLightTheme ? Colors.light.text : Colors.dark.text,
      button: isLightTheme ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
      text: isLightTheme ? Colors.dark.text : Colors.dark.text,
      textBackground: isLightTheme
        ? 'rgba(255, 255, 255, 0.5)'
        : 'rgba(0, 0, 0, 0.5)'
    };
  }, [currentTheme]);

  // Shared animation configuration
  const animationConfig = {
    duration: 250,
    easing: Easing.out(Easing.cubic)
  };

  // Optimize repeated animation styles with memoization
  const translateY = useAnimatedStyle(() => ({
    transform: [{
      translateY: withTiming(open ? -30 : 0, {
        duration: 250,
        easing: Easing.bezier(0.4, 0, 0.2, 1)
      })
    }]
  }), [open]);

  const createButtonStyle = (delay: number) => useAnimatedStyle(() => ({
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
  }), [open]);

  const createTextStyle = (delay: number) => useAnimatedStyle(() => ({
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
    // elevation: withDelay(delay, withTiming(open ? 5 : 0, animationConfig))
  }), [open]);

  const buttonStyle1 = createButtonStyle(50);
  const buttonStyle2 = createButtonStyle(100);
  const buttonStyle3 = createButtonStyle(150);
  const textStyle1 = createTextStyle(50);
  const textStyle2 = createTextStyle(100);
  const textStyle3 = createTextStyle(150);

  // useEffect to handle closing animation
  useEffect(() => {
    if (!open) {
      const timeoutId = setTimeout(() => {
        setClosing(false);
      }, animationConfig.duration * 2); // Adjust delay as needed

      return () => clearTimeout(timeoutId);
    } else {
      setClosing(true);
    }
  }, [open]);


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
    <Animated.View style={[style, animatedStyle, styles.container]}>
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
                      // backgroundColor: colors.textBackground 
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
                  onPress={handlePressWithAnimation(onPress3)} // Wrap onPress2
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
                      // backgroundColor: colors.textBackground 
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
                  onPress={handlePressWithAnimation(onPress1)} // Wrap onPress1
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
                      // backgroundColor: colors.textBackground 
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
                  onPress={handlePressWithAnimation(onPress2)} // Wrap onPress2
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