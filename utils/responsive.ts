import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

// Use 'screen' instead of 'window' for more stable dimensions
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// Cache the inverse font scale for efficiency
const invFontScale = 1 / PixelRatio.getFontScale();

/**
 * Converts a font size to a responsive font size based on the current font scale.
 * @param size The original font size.
 * @param scaleUp If true, multiplies by fontScale instead of dividing (default: false)
 * @returns The responsive font size.
 */
export const getResponsiveFontSize = (size: number, scaleUp = false) =>
  scaleUp ? size / invFontScale : size * invFontScale;

/**
 * Converts a width percentage to a responsive width in pixels.
 * @param percentage The width percentage (0-100).
 * @param maxWidth Optional maximum width constraint
 * @returns The responsive width in pixels.
 */
export const getResponsiveWidth = (percentage: number, maxWidth?: number) => {
  const width = (percentage / 100) * SCREEN_WIDTH;
  return maxWidth ? Math.min(width, maxWidth) : width;
};

/**
 * Converts a height percentage to a responsive height in pixels.
 * @param percentage The height percentage (0-100).
 * @param maxHeight Optional maximum height constraint
 * @returns The responsive height in pixels.
 */
export const getResponsiveHeight = (percentage: number, maxHeight?: number) => {
  const height = (percentage / 100) * SCREEN_HEIGHT;
  return maxHeight ? Math.min(height, maxHeight) : height;
};

// Update dimensions on screen changes (only if necessary)
Dimensions.addEventListener('change', ({ screen }: { screen: ScaledSize }) => {
  // Update only if dimensions actually change
  if (screen.width !== SCREEN_WIDTH || screen.height !== SCREEN_HEIGHT) {
    // Use Object.assign for efficiency 
    Object.assign(module.exports, {
      SCREEN_WIDTH: screen.width,
      SCREEN_HEIGHT: screen.height,
    });
  }
});