import React from 'react';
import { FAB } from 'react-native-paper';
import { StyleProp, ViewStyle, View, StyleSheet, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import Animated, { useAnimatedStyle, withTiming, Easing, withDelay } from 'react-native-reanimated';
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
 textStyle?: StyleProp<TextStyle>;
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
 onPress2,
 text1,
 text2,
 textStyle
}: ThemedFABProps) {
 const { currentTheme } = useTheme();
 const icon = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
 const button = currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground;
 const textColor = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
 const textBackgroundColor = currentTheme === 'light' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';

 const translateY = useAnimatedStyle(() => {
  return {
   transform: [{
    translateY: withTiming(open ? -30 : 0, {
     duration: 350,
     easing: Easing.bezier(0.4, 0, 0.2, 1)
    })
   }],
  };
 });

 const buttonStyle1 = useAnimatedStyle(() => {
  return {
   elevation: withDelay(50, withTiming(open ? 5 : 0, {
    duration: 250,
    easing: Easing.out(Easing.cubic)
   })),
   opacity: withDelay(50, withTiming(open ? 1 : 0, {
    duration: 250,
    easing: Easing.out(Easing.cubic)
   })),
   transform: [{
    scale: withDelay(50, withTiming(open ? 1 : 0.8, {
     duration: 250,
     easing: Easing.out(Easing.cubic)
    }))
   }]
  };
 });

 const buttonStyle2 = useAnimatedStyle(() => {
  return {
   elevation: withDelay(100, withTiming(open ? 5 : 0, {
    duration: 250,
    easing: Easing.out(Easing.cubic)
   })),
   opacity: withDelay(100, withTiming(open ? 1 : 0, {
    duration: 250,
    easing: Easing.out(Easing.cubic)
   })),
   transform: [{
    scale: withDelay(100, withTiming(open ? 1 : 0.8, {
     duration: 250,
     easing: Easing.out(Easing.cubic)
    }))
   }]
  };
 });

 const textStyle1 = useAnimatedStyle(() => {
  return {
   opacity: withDelay(50, withTiming(open ? 1 : 0, {
    duration: 250,
    easing: Easing.out(Easing.cubic)
   })),
   transform: [{
    translateX: withDelay(50, withTiming(open ? 0 : -20, {
     duration: 250,
     easing: Easing.out(Easing.cubic)
    }))
   }]
  };
 });

 const textStyle2 = useAnimatedStyle(() => {
  return {
   opacity: withDelay(100, withTiming(open ? 1 : 0, {
    duration: 250,
    easing: Easing.out(Easing.cubic)
   })),
   transform: [{
    translateX: withDelay(100, withTiming(open ? 0 : -20, {
     duration: 250,
     easing: Easing.out(Easing.cubic)
    }))
   }]
  };
 });

 return (
  <Animated.View style={[style, animatedStyle, styles.container]}>
   <Animated.View style={[translateY]}>
    <View style={styles.buttonsWrapper}>
     <View style={styles.buttonRow}>
      {text2 && (
       <Animated.Text 
        style={[
         styles.buttonText, 
         { color: textColor, backgroundColor: textBackgroundColor, borderRadius: 10, padding: 5 }, 
         textStyle, 
         textStyle2
        ]}
       >
        {text2}
       </Animated.Text>
      )}
      <ThemedButton
       style={styles.fab}
       animatedStyle={buttonStyle2}
       onPress={onPress1}
       iconName="camera"
      />
     </View>
     <View style={styles.buttonRow}>
      {text1 && (
       <Animated.Text 
        style={[
         styles.buttonText, 
         { color: textColor, backgroundColor: textBackgroundColor, borderRadius: 10, padding: 5 }, 
         textStyle, 
         textStyle1,
        ]}
       >
        {text1}
       </Animated.Text>
      )}
      <ThemedButton
       style={styles.fab}
       animatedStyle={buttonStyle1}
       onPress={onPress2}
       iconName="plus-circle"
      />
     </View>
    </View>
   </Animated.View>
   <FAB
    icon={open ? 'close' : 'plus'}
    color={icon}
    style={{ backgroundColor: button }}
    onPress={() => setOpen(!open)}
   />
  </Animated.View>
 );
}

const styles = StyleSheet.create({
 container: {
  alignItems: 'flex-end',
  width: 'auto',
 },
 buttonsWrapper: {
  alignItems: 'flex-end',
 },
 buttonRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginTop: 10,
 },
 fab: {
  padding: 12,
  marginTop: 5,
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
 }
});