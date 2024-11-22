import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext'; // Import your ThemeContext
import { Colors } from '@/constants/Colors';

// Define a type for the props
type ThemeColorProps = {
  light?: string;
  dark?: string;
};

export function useThemeColor(
  props: ThemeColorProps,
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  // Use your ThemeContext to get the current theme
  const { currentTheme } = useTheme(); 

  // Memoize the color value for performance
  const color = useMemo(() => {
    const colorFromProps = props[currentTheme];

    if (colorFromProps) {
      return colorFromProps;
    } else if (Colors[currentTheme][colorName]) {
      return Colors[currentTheme][colorName];
    } else {
      // Default fallback if color not found in Colors
      return colorName === 'text' ? 'black' : 'white'; 
    }
  }, [props, currentTheme, colorName]);

  return color;
}