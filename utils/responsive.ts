import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

// Use interface for better type checking and readability
interface DimensionsType {
  window: ScaledSize;
  screen: ScaledSize;
}

class ResponsiveManager {
  private static instance: ResponsiveManager | null = null; // Allow null for lazy initialization
  private dimensions: DimensionsType;
  private invFontScale: number;

  private constructor() {
    this.dimensions = {
      window: Dimensions.get('window'), // Initialize directly
      screen: Dimensions.get('screen'),
    };
    this.invFontScale = 1 / PixelRatio.getFontScale();
    this.setupDimensionsListener();
  }

  public static getInstance(): ResponsiveManager {
    // Use lazy initialization (more efficient if not always used)
    if (!ResponsiveManager.instance) {
      ResponsiveManager.instance = new ResponsiveManager();
    }
    return ResponsiveManager.instance;
  }

  private setupDimensionsListener(): void {
    // Use a more descriptive name for the event handler
    Dimensions.addEventListener('change', this.handleDimensionsChange);
  }

  // Separate handler function for clarity and potential reusability
  private handleDimensionsChange = ({ window, screen }: { window: ScaledSize; screen: ScaledSize }): void => {
    // More efficient comparison: check if references are different
    if (window !== this.dimensions.window || screen !== this.dimensions.screen) {
      this.dimensions = { window, screen };
      this.invFontScale = 1 / PixelRatio.getFontScale();
    }
  };

    // Combine getResponsiveFontSize, getResponsiveWidth, and getResponsiveHeight into one function
  public getResponsiveValue(
    type: 'font' | 'width' | 'height',
    value: number,
    options: {
      scaleUp?: boolean;
      maxWidth?: number;
      maxHeight?: number;
      useScreen?: boolean;
    } = {} // Use an options object
  ): number {
      const { scaleUp = false, maxWidth, maxHeight, useScreen = false } = options;

      switch (type) {
          case 'font':
              return scaleUp ? value / this.invFontScale : value * this.invFontScale;
          case 'width': {
              const baseWidth = useScreen ? this.dimensions.screen.width : this.dimensions.window.width;
              const width = (value / 100) * baseWidth;
              return maxWidth ? Math.min(width, maxWidth) : width;
          }
          case 'height': {
              const baseHeight = useScreen ? this.dimensions.screen.height : this.dimensions.window.height;
              const height = (value / 100) * baseHeight;
              return maxHeight ? Math.min(height, maxHeight) : height;
          }
          default:
              // TypeScript will enforce that type is one of the above, but good practice to have a default
              return value;
      }
  }

  // Use getters only when necessary.  Direct access is often more efficient.
  public get windowWidth(): number {
    return this.dimensions.window.width;
  }

  public get windowHeight(): number {
    return this.dimensions.window.height;
  }

  public get screenWidth(): number {
    return this.dimensions.screen.width;
  }

  public get screenHeight(): number {
    return this.dimensions.screen.height;
  }
}

// Export a singleton instance
const responsive = ResponsiveManager.getInstance();

// Export utility functions using the combined function
export const getResponsiveFontSize = (size: number, scaleUp = false): number =>
  responsive.getResponsiveValue('font', size, { scaleUp });

export const getResponsiveWidth = (
  percentage: number,
  maxWidth?: number,
  useScreen = false
): number => responsive.getResponsiveValue('width', percentage, { maxWidth, useScreen });

export const getResponsiveHeight = (
  percentage: number,
  maxHeight?: number,
  useScreen = false
): number => responsive.getResponsiveValue('height', percentage, { maxHeight, useScreen });

// Export dimensions directly (more efficient)
export const { windowWidth: WINDOW_WIDTH, windowHeight: WINDOW_HEIGHT, screenWidth: SCREEN_WIDTH, screenHeight: SCREEN_HEIGHT } = responsive;

export default responsive;