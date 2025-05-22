import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LOGO from '@/assets/svgs/orange-logo.svg';
import { getResponsiveWidth } from '@/utils/responsive';
import { useTheme } from '@/context/ThemeContext';

interface LogoProps {
  size?: number; // Size in percentage of screen width
  containerStyle?: ViewStyle;
  showBackground?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 14, 
  containerStyle, 
  showBackground = true 
}) => {
  const { currentTheme } = useTheme();
  const responsiveSize = getResponsiveWidth(size);
  
  // Calculate padding proportionally based on size
  // In the original code, padding was 3.5 for size 14, so we maintain that ratio
  const paddingRatio = 3.5 / 14;
  const borderRadiusRatio = 5 / 14;
  
  return (
    <View style={[
      showBackground && styles.logoContainer,
      showBackground && { 
        padding: getResponsiveWidth(size * paddingRatio),
        borderRadius: getResponsiveWidth(size * borderRadiusRatio)
      },
      containerStyle
    ]}>
      <LOGO 
        width={responsiveSize} 
        height={responsiveSize} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    backgroundColor: '#FFF5E1',
    alignSelf: 'center',
  }
});