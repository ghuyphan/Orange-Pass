import React from 'react';
import { FAB } from 'react-native-paper';
import { StyleProp, ViewStyle, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
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
};

export function ThemedFAB({
  lightColor,
  darkColor,
  label,
  iconName,
  style,
  animatedStyle,
  open,
  setOpen,
  onPress1,
  onPress2
}: ThemedFABProps) {
  const { currentTheme } = useTheme();
  const icon = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
  const button = currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground;

  const translateY = useAnimatedStyle(() => {
    return {
      transform: [{
        translateY: withTiming(open ? -25 : -0, {
          duration: 300,
          easing: Easing.out(Easing.cubic)
        })
      }],
    };
  });

  const buttonOpacity = useAnimatedStyle(() => {
    return {
      opacity: withTiming(open ? 1 : 0, {
        duration: 200,
        easing: Easing.inOut(Easing.ease)
      }),
      elevation: open ? 5 : 0
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}> 
      <Animated.View style={[translateY]}>
        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
          <Animated.View style={buttonOpacity}> 
            <ThemedButton
              onPress={onPress1}
              iconName="qrcode-scan"
              style={[styles.fab, { backgroundColor: button }]}
            />
          </Animated.View>
          <Animated.View style={buttonOpacity}> 
            <ThemedButton
              onPress={onPress2}
              iconName="plus-circle-outline"
              style={[styles.fab, { backgroundColor: button }]}
            />
          </Animated.View>
        </View>
      </Animated.View>
      <FAB
        icon={open ? 'close' : 'plus'}
        color={icon}
        style={[style, { backgroundColor: button }]}
        onPress={() => setOpen(!open)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    marginTop: 15,
    padding: 12,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});