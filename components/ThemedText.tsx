import React, { forwardRef } from 'react';
import { Text, type TextProps, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export const ThemedText = forwardRef<Text, ThemedTextProps>(({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}, ref) => {  // Added forwardRef here
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      ref={ref} // Pass the ref down to the Text component
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
});

ThemedText.displayName = 'ThemedText'; // Add displayName for better debugging


const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    // fontWeight: '400',
    fontFamily: 'Roboto-Regular', // Use Roboto-Regular
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    // fontWeight: '600',
    fontWeight: 'medium',
    fontFamily: 'Roboto-Medium', // Use Roboto-Medium
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
    fontFamily: 'Roboto-Bold', // Use Roboto-Bold
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold', // Use Roboto-Bold
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
    fontFamily: 'Roboto-Regular', // Use Roboto-Regular
  },
});