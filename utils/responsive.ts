import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

// --- Interfaces ---

interface DimensionsType {
  window: ScaledSize;
  screen: ScaledSize;
}

interface ResponsiveOptions {
  scaleUp?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  useScreen?: boolean;
  baseWidth?: number; // Add baseWidth for custom scaling
  baseHeight?: number; // Add baseHeight for custom scaling
}

// --- Constants ---

const { width: INITIAL_WINDOW_WIDTH, height: INITIAL_WINDOW_HEIGHT } = Dimensions.get('window');
const { width: INITIAL_SCREEN_WIDTH, height: INITIAL_SCREEN_HEIGHT } = Dimensions.get('screen');

const INITIAL_INV_FONT_SCALE = 1 / PixelRatio.getFontScale();

const BASE_DIMENSION = 100;
const MAX_CACHE_SIZE = 500;

// --- Default Base Dimensions (for standard scaling) ---
// These are the key changes to address the "too big on small screens" issue.
// We're using a smaller base width/height as a reference.  This will prevent
// excessively large scaling on smaller, lower-DPI devices.
const DEFAULT_BASE_WIDTH = 360;  //  Common small screen width
const DEFAULT_BASE_HEIGHT = 640; // Common small screen height


class ResponsiveManager {
  private static instance: ResponsiveManager;

  private windowWidth: number;
  private windowHeight: number;
  private screenWidth: number;
  private screenHeight: number;
  private invFontScale: number;
  private dimensionsSubscription: { remove: () => void } | null = null;
  private cache: Map<string, number> = new Map();
  private cacheHits: Map<string, number> = new Map();


  private constructor() {
    this.windowWidth = INITIAL_WINDOW_WIDTH;
    this.windowHeight = INITIAL_WINDOW_HEIGHT;
    this.screenWidth = INITIAL_SCREEN_WIDTH;
    this.screenHeight = INITIAL_SCREEN_HEIGHT;
    this.invFontScale = INITIAL_INV_FONT_SCALE;
    this.setupDimensionsListener();
  }

  public static getInstance(): ResponsiveManager {
    if (!ResponsiveManager.instance) {
      ResponsiveManager.instance = new ResponsiveManager();
    }
    return ResponsiveManager.instance;
  }


  private setupDimensionsListener(): void {
    this.dimensionsSubscription = Dimensions.addEventListener(
      'change',
      this.handleDimensionsChange
    );
  }

  public cleanup(): void {
    if (this.dimensionsSubscription) {
      this.dimensionsSubscription.remove();
      this.dimensionsSubscription = null;
    }
  }

  private handleDimensionsChange = ({
    window,
    screen,
  }: {
    window: ScaledSize;
    screen: ScaledSize;
  }): void => {

    const dimensionsChanged =
      window.width !== this.windowWidth ||
      window.height !== this.windowHeight ||
      screen.width !== this.screenWidth ||
      screen.height !== this.screenHeight;

    const fontScaleChanged = 1 / PixelRatio.getFontScale() !== this.invFontScale;
    if (dimensionsChanged || fontScaleChanged) {
      this.windowWidth = window.width;
      this.windowHeight = window.height;
      this.screenWidth = screen.width;
      this.screenHeight = screen.height;
      this.invFontScale = 1 / PixelRatio.getFontScale();
      this.cache.clear();
      this.cacheHits.clear();
    }
  };

  private manageCache(): void {
    if (this.cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(this.cacheHits.entries());
      entries.sort((a, b) => a[1] - b[1]);
      const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
        this.cacheHits.delete(entries[i][0]);
      }
    }
  }

  public getResponsiveValue(
    type: 'font' | 'width' | 'height',
    value: number,
    options: ResponsiveOptions = {}
  ): number {
    const { scaleUp = false, maxWidth, maxHeight, useScreen = false, baseWidth = DEFAULT_BASE_WIDTH, baseHeight = DEFAULT_BASE_HEIGHT } = options;

    const cacheKey = `${type}-${value}-${scaleUp}-${maxWidth}-${maxHeight}-${useScreen}-${baseWidth}-${baseHeight}`;

    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      this.cacheHits.set(cacheKey, (this.cacheHits.get(cacheKey) || 0) + 1);
      return cachedValue;
    }

    let result: number;

    // --- Scaling Factor Calculation ---
    // This is the most important addition.  We calculate a scaling factor
    // that considers the relationship between the actual screen/window size
    // and our base dimensions. This prevents over-scaling on smaller screens.
    let widthScaleFactor = 1;
    let heightScaleFactor = 1;

    if (type !== 'font') { // Don't apply scale factor to font (it has its own scaling)
        const currentWidth = useScreen ? this.screenWidth : this.windowWidth;
        const currentHeight = useScreen ? this.screenHeight : this.windowHeight;
        widthScaleFactor = currentWidth / baseWidth;
        heightScaleFactor = currentHeight / baseHeight;

        // Limit scaling to prevent excessively large elements.  This is crucial.
        widthScaleFactor = Math.min(widthScaleFactor, 1.2); // Limit to 120%
        heightScaleFactor = Math.min(heightScaleFactor, 1.2);  // Limit to 120%
    }
    
    switch (type) {
      case 'font':
        // Use PixelRatio.getFontScale() and allow for scaling up (if enabled)
        result = scaleUp
          ? value * this.invFontScale //scale up
          : value / PixelRatio.getFontScale();
        break;

      case 'width': {
        const width = (value * baseWidth) / BASE_DIMENSION;  // Calculate relative to baseWidth
        result = width * widthScaleFactor; //Apply scaling factor
        result = maxWidth ? Math.min(result, maxWidth) : result;
        break;
      }

      case 'height': {
        const height = (value * baseHeight) / BASE_DIMENSION; // Calculate relative to baseHeight
         result = height * heightScaleFactor; // Apply scaling factor
        result = maxHeight ? Math.min(result, maxHeight) : result;
        break;
      }

      default:
        result = value;
    }

    result = Math.round(result * 100) / 100;
    this.cache.set(cacheKey, result);
    this.cacheHits.set(cacheKey, 1);
    this.manageCache();

    return result;
  }

  public get windowWidthValue(): number {
    return this.windowWidth;
  }

  public get windowHeightValue(): number {
    return this.windowHeight;
  }

  public get screenWidthValue(): number {
    return this.screenWidth;
  }

  public get screenHeightValue(): number {
    return this.screenHeight;
  }
  public get isPortrait(): boolean {
    return this.windowHeight > this.windowWidth;
  }

  public get isTablet(): boolean {
    const pixelDensity = PixelRatio.get();
    const adjustedWidth = this.screenWidth * pixelDensity;
    const adjustedHeight = this.screenHeight * pixelDensity;
    return (
      Math.sqrt(
        Math.pow(adjustedWidth, 2) + Math.pow(adjustedHeight, 2)
      ) >= 1000
    );
  }
}

const responsive = ResponsiveManager.getInstance();

export const getResponsiveFontSize = (size: number, scaleUp = false): number =>
  responsive.getResponsiveValue('font', size, { scaleUp });

export const getResponsiveWidth = (
  percentage: number,
  maxWidth?: number,
  useScreen = false,
    baseWidth = DEFAULT_BASE_WIDTH // Allow overriding baseWidth
): number => responsive.getResponsiveValue('width', percentage, { maxWidth, useScreen, baseWidth });

export const getResponsiveHeight = (
  percentage: number,
  maxHeight?: number,
  useScreen = false,
    baseHeight = DEFAULT_BASE_HEIGHT // Allow overriding baseHeight
): number => responsive.getResponsiveValue('height', percentage, { maxHeight, useScreen, baseHeight });

export const WINDOW_WIDTH = responsive.windowWidthValue;
export const WINDOW_HEIGHT = responsive.windowHeightValue;
export const SCREEN_WIDTH = responsive.screenWidthValue;
export const SCREEN_HEIGHT = responsive.screenHeightValue;
export const IS_PORTRAIT = responsive.isPortrait;
export const IS_TABLET = responsive.isTablet;
export const cleanupResponsiveManager = (): void => {
  responsive.cleanup();
};

export default responsive;