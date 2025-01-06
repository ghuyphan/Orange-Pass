import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

// Define a type for the dimensions state
type Dimensions = {
  width: number;
  height: number;
};

// Create a class to manage responsive calculations
class ResponsiveManager {
  private static instance: ResponsiveManager;
  private dimensions: Dimensions;
  private invFontScale: number;

  private constructor() {
    const { width, height } = Dimensions.get('screen');
    this.dimensions = { width, height };
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
    Dimensions.addEventListener('change', ({ screen }: { screen: ScaledSize }) => {
      if (screen.width !== this.dimensions.width || screen.height !== this.dimensions.height) {
        this.dimensions = {
          width: screen.width,
          height: screen.height,
        };
        this.invFontScale = 1 / PixelRatio.getFontScale();
      }
    });
  }

  public getResponsiveFontSize(size: number, scaleUp = false): number {
    return scaleUp ? size / this.invFontScale : size * this.invFontScale;
  }

  public getResponsiveWidth(percentage: number, maxWidth?: number): number {
    const width = (percentage / 100) * this.dimensions.width;
    return maxWidth ? Math.min(width, maxWidth) : width;
  }

  public getResponsiveHeight(percentage: number, maxHeight?: number): number {
    const height = (percentage / 100) * this.dimensions.height;
    return maxHeight ? Math.min(height, maxHeight) : height;
  }

  public get screenWidth(): number {
    return this.dimensions.width;
  }

  public get screenHeight(): number {
    return this.dimensions.height;
  }
}

// Export a singleton instance
const responsive = ResponsiveManager.getInstance();

// Export convenient utility functions
export const getResponsiveFontSize = (size: number, scaleUp = false): number =>
  responsive.getResponsiveFontSize(size, scaleUp);

export const getResponsiveWidth = (percentage: number, maxWidth?: number): number =>
  responsive.getResponsiveWidth(percentage, maxWidth);

export const getResponsiveHeight = (percentage: number, maxHeight?: number): number =>
  responsive.getResponsiveHeight(percentage, maxHeight);

export const SCREEN_WIDTH = responsive.screenWidth;
export const SCREEN_HEIGHT = responsive.screenHeight;

export default responsive;