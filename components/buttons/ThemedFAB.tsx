import React, { useMemo, useState, useEffect, forwardRef } from 'react';
import { FAB } from 'react-native-paper';
import { StyleProp, ViewStyle, View, StyleSheet, TextStyle, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  withDelay,
  withSequence,
  useSharedValue,
} from 'react-native-reanimated';
import { ThemedButton } from './ThemedButton';
import { t } from '@/i18n';

export interface FABAction {
  text?: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}

export interface ThemedFABProps {
  actions: FABAction[];
  mainIconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const ThemedFAB = forwardRef<View, ThemedFABProps>(({
  actions,
  mainIconName = 'plus',
  style,
  animatedStyle,
  textStyle,
}, ref) => {
  const { currentTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const isAnimating = useSharedValue(false);

  // Handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (open) {
          handleFABPress();
          return true; // Prevent default back action
        }
        return false; // Let default back action happen
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [open])
  );

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
    duration: 200,
    easing: Easing.out(Easing.cubic)
  }), []);

  // Backdrop opacity animation
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(open ? 0.5 : 0, animationConfig)
  }), [open, animationConfig]);

  // Optimize repeated animation styles with memoization
  const translateY = useAnimatedStyle(() => ({
    transform: [{
      translateY: withTiming(open ? -30 : 0, {
        duration: 200,
        easing: Easing.bezier(0.4, 0, 0.2, 1)
      })
    }]
  }), [open]);

  // Create custom hooks for animation styles to resolve hook rule errors
  const useButtonAnimationStyle = (delay: number) => {
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
    }), [open, animationConfig]); // Remove delay from dependencies
  };

  const useTextAnimationStyle = (delay: number) => {
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
    }), [open, animationConfig]); // Remove delay from dependencies
  };

  // Calculate the delays for each action outside of the map
  const delays = actions.map((_, index) => (index + 1) * 50);

  // Now call the animation hooks with the calculated delays
  const buttonStyles = delays.map(useButtonAnimationStyle);
  const textStyles = delays.map(useTextAnimationStyle);

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
    <>
      {/* Backdrop that covers the entire screen when FAB is open */}
      {open && (
        <TouchableWithoutFeedback onPress={handleFABPress}>
          <Animated.View 
            style={[
              StyleSheet.absoluteFillObject, 
              { 
                backgroundColor: 'black', 
                zIndex: 1 
              }, 
              backdropAnimatedStyle
            ]} 
          />
        </TouchableWithoutFeedback>
      )}
      
      <Animated.View style={[style, animatedStyle, styles.container]} ref={ref}>
        {(open || closing) && (
          <Animated.View style={translateY}>
            <View style={styles.buttonsWrapper}>
              {actions.map((action, index) => (
                action.text && (
                  <View key={action.iconName} style={styles.buttonRow}>
                    <Animated.Text
                      style={[
                        styles.buttonText,
                        { color: colors.text },
                        textStyle,
                        textStyles[index] // Use the pre-calculated style here
                      ]}
                    >
                      {t(action.text)}
                    </Animated.Text>
                    <ThemedButton
                      style={styles.fab}
                      animatedStyle={buttonStyles[index]} // Use the pre-calculated style here
                      onPress={handlePressWithAnimation(action.onPress)}
                      iconName={action.iconName}
                    />
                  </View>
                )
              ))}
            </View>
          </Animated.View>
        )}
        <FAB
          icon={open ? 'close' : mainIconName}
          color={colors.icon}
          style={{ backgroundColor: colors.button }}
          onPress={handleFABPress}
        />
      </Animated.View>
    </>
  );
});

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


export default ThemedFAB;