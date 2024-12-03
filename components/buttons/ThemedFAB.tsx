import React, { useMemo, useState, useEffect } from 'react';
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
  withSequence
} from 'react-native-reanimated';
import { ThemedButton } from './ThemedButton';
import { Text } from 'react-native';

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
  text1?: string;
  text2?: string;
  text3?: string;
  textStyle?: StyleProp<TextStyle>;
};

export function ThemedFAB({
  open,
  setOpen,
  onPress1,
  onPress2,
  text1,
  text2,
  text3,
  style,
  animatedStyle,
  textStyle
}: ThemedFABProps) {
  const { currentTheme } = useTheme();
  const [closing, setClosing] = useState(false);

  // Memoize color calculations to prevent unnecessary re-renders
  const colors = useMemo(() => {
    const isLightTheme = currentTheme === 'light';
    return {
      icon: isLightTheme ? Colors.light.text : Colors.dark.text,
      button: isLightTheme ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
      text: isLightTheme ? Colors.light.text : Colors.dark.text,
      textBackground: isLightTheme 
        ? 'rgba(255, 255, 255, 0.4)' 
        : 'rgba(0, 0, 0, 0.4)'
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
        duration: 350,
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
    }]
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
      }, animationConfig.duration); // Adjust delay as needed

      return () => clearTimeout(timeoutId); 
    } else {
      setClosing(true);
    }
  }, [open]);


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
                      backgroundColor: colors.textBackground 
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
                  onPress={onPress2}
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
                      backgroundColor: colors.textBackground 
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
                  onPress={onPress1}
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
                      backgroundColor: colors.textBackground 
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
                  onPress={onPress2}
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
        onPress={() => {
          if (open) {
            // setClosing(true);
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
      />
    </Animated.View>
  );
}

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
    borderRadius: 15,
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
    borderRadius: 10,
    padding: 5,
  }
});