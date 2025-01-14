import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

// Define types for dimensions
type DimensionsType = {
  window: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
  };
};

class ResponsiveManager {
  private static instance: ResponsiveManager;
  private dimensions: DimensionsType;
  private invFontScale: number;

  private constructor() {
    const window = Dimensions.get('window');
    const screen = Dimensions.get('screen');
    
    this.dimensions = {
      window: { width: window.width, height: window.height },
      screen: { width: screen.width, height: screen.height }
    };
    this.invFontScale = 1 / PixelRatio.getFontScale();
    this.setupDimensionsListener();
  }

  public static getInstance(): ResponsiveManager {
    if (!ResponsiveManager.instance) {
      ResponsiveManager.instance = new ResponsiveManager();
    }
    return ResponsiveManager.instance;
  }

  private setupDimensionsListener(): void {
    // Listen for window dimension changes
    Dimensions.addEventListener('change', ({ window, screen }: { 
      window: ScaledSize, 
      screen: ScaledSize 
    }) => {
      const dimensionsChanged = 
        window.width !== this.dimensions.window.width ||
        window.height !== this.dimensions.window.height ||
        screen.width !== this.dimensions.screen.width ||
        screen.height !== this.dimensions.screen.height;

      if (dimensionsChanged) {
        this.dimensions = {
          window: { width: window.width, height: window.height },
          screen: { width: screen.width, height: screen.height }
        };
        this.invFontScale = 1 / PixelRatio.getFontScale();
      }
    });
  }

  public getResponsiveFontSize(size: number, scaleUp = false): number {
    return scaleUp ? size / this.invFontScale : size * this.invFontScale;
  }

  public getResponsiveWidth(percentage: number, maxWidth?: number, useScreen = false): number {
    const baseWidth = useScreen ? this.dimensions.screen.width : this.dimensions.window.width;
    const width = (percentage / 100) * baseWidth;
    return maxWidth ? Math.min(width, maxWidth) : width;
  }

  public getResponsiveHeight(percentage: number, maxHeight?: number, useScreen = false): number {
    const baseHeight = useScreen ? this.dimensions.screen.height : this.dimensions.window.height;
    const height = (percentage / 100) * baseHeight;
    return maxHeight ? Math.min(height, maxHeight) : height;
  }

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

// Export utility functions
export const getResponsiveFontSize = (size: number, scaleUp = false): number =>
  responsive.getResponsiveFontSize(size, scaleUp);

export const getResponsiveWidth = (
  percentage: number, 
  maxWidth?: number, 
  useScreen = false
): number => responsive.getResponsiveWidth(percentage, maxWidth, useScreen);

export const getResponsiveHeight = (
  percentage: number, 
  maxHeight?: number, 
  useScreen = false
): number => responsive.getResponsiveHeight(percentage, maxHeight, useScreen);

// Export dimensions
export const WINDOW_WIDTH = responsive.windowWidth;
export const WINDOW_HEIGHT = responsive.windowHeight;
export const SCREEN_WIDTH = responsive.screenWidth;
export const SCREEN_HEIGHT = responsive.screenHeight;

export default responsive;