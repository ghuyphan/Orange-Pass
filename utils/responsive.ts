import { Dimensions, PixelRatio, Platform, ScaledSize } from "react-native";

// --- Interfaces ---
interface ResponsiveOptions {
  scaleUp?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  useScreen?: boolean;
  baseWidth?: number;
  baseHeight?: number;
  minScale?: number;
  maxScale?: number;
  scalingMethod?: "linear" | "sqrt" | "pow";
}

// --- Constants ---
const { width: INITIAL_WINDOW_WIDTH, height: INITIAL_WINDOW_HEIGHT } =
  Dimensions.get("window");
const { width: INITIAL_SCREEN_WIDTH, height: INITIAL_SCREEN_HEIGHT } =
  Dimensions.get("screen");

// Default design dimensions (based on iPhone 8)
const DEFAULT_BASE_WIDTH = 375;
const DEFAULT_BASE_HEIGHT = 667;
const BASE_DIMENSION = 100;
const MAX_CACHE_SIZE = 500;
const DEFAULT_MAX_SCALE_FACTOR = 1.5;
const DEFAULT_MIN_SCALE_FACTOR = 0.85;

// Device detection constants
const TABLET_DIAGONAL_THRESHOLD = 1000; // in pixels
const LARGE_SCREEN_WIDTH_THRESHOLD = 768; // in dp

class ResponsiveManager {
  private static instance: ResponsiveManager;

  // Optimize memory usage with primitives
  private windowWidth: number;
  private windowHeight: number;
  private screenWidth: number;
  private screenHeight: number;
  private pixelDensity: number;
  private invFontScale: number;
  private dimensionsSubscription: { remove: () => void } | null = null;
  private deviceType: "phone" | "tablet" | "desktop";

  // Optimize cache with more efficient data structure
  private cache: Map<string, number> = new Map();
  private cacheHits: Uint16Array = new Uint16Array(MAX_CACHE_SIZE);
  private cacheKeys: string[] = [];

  private constructor() {
    this.windowWidth = INITIAL_WINDOW_WIDTH;
    this.windowHeight = INITIAL_WINDOW_HEIGHT;
    this.screenWidth = INITIAL_SCREEN_WIDTH;
    this.screenHeight = INITIAL_SCREEN_HEIGHT;
    this.pixelDensity = PixelRatio.get();
    this.invFontScale = 1 / PixelRatio.getFontScale();
    this.deviceType = this.detectDeviceType();
    this.setupDimensionsListener();
  }

  public static getInstance(): ResponsiveManager {
    return this.instance || (this.instance = new ResponsiveManager());
  }

  private detectDeviceType(): "phone" | "tablet" | "desktop" {
    const pixelDensity = PixelRatio.get();
    const adjustedWidth = this.screenWidth * pixelDensity;
    const adjustedHeight = this.screenHeight * pixelDensity;
    const diagonalSize = Math.sqrt(
      Math.pow(adjustedWidth, 2) + Math.pow(adjustedHeight, 2)
    );

    if (Platform.OS === "web" && this.screenWidth > 1024) {
      return "desktop";
    } else if (
      diagonalSize >= TABLET_DIAGONAL_THRESHOLD ||
      Math.max(this.screenWidth, this.screenHeight) >= LARGE_SCREEN_WIDTH_THRESHOLD
    ) {
      return "tablet";
    }
    return "phone";
  }

  private setupDimensionsListener(): void {
    this.dimensionsSubscription = Dimensions.addEventListener(
      "change",
      this.handleDimensionsChange
    );
  }

  public cleanup(): void {
    this.dimensionsSubscription?.remove();
    this.dimensionsSubscription = null;
  }

  private handleDimensionsChange = ({
    window,
    screen,
  }: {
    window: ScaledSize;
    screen: ScaledSize;
  }): void => {
    const dimensionsChanged =
      Math.abs(window.width - this.windowWidth) > 0.5 ||
      Math.abs(window.height - this.windowHeight) > 0.5 ||
      Math.abs(screen.width - this.screenWidth) > 0.5 ||
      Math.abs(screen.height - this.screenHeight) > 0.5;

    const pixelDensityChanged = Math.abs(PixelRatio.get() - this.pixelDensity) > 0.01;
    const fontScaleChanged =
      Math.abs(1 / PixelRatio.getFontScale() - this.invFontScale) > 0.01;

    if (dimensionsChanged || fontScaleChanged || pixelDensityChanged) {
      this.windowWidth = window.width;
      this.windowHeight = window.height;
      this.screenWidth = screen.width;
      this.screenHeight = screen.height;
      this.pixelDensity = PixelRatio.get();
      this.invFontScale = 1 / PixelRatio.getFontScale();
      this.deviceType = this.detectDeviceType();

      // Clear cache on dimension changes
      this.cache.clear();
      this.cacheHits.fill(0);
      this.cacheKeys = [];
    }
  };

  // Optimized cache management with more efficient eviction
  private manageCache(): void {
    if (this.cache.size > MAX_CACHE_SIZE) {
      // Find lowest hit count indices
      const sortedIndices = Array.from(this.cacheHits.entries())
        .slice(0, this.cacheKeys.length)
        .sort(([, a], [, b]) => a - b)
        .map(([index]) => index);

      // Remove least used items
      const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < entriesToRemove && i < sortedIndices.length; i++) {
        const index = sortedIndices[i];
        if (index < this.cacheKeys.length) {
          const keyToRemove = this.cacheKeys[index];
          this.cache.delete(keyToRemove);
          this.cacheHits[index] = 0;
          // Mark this slot as available by setting to empty string
          this.cacheKeys[index] = "";
        }
      }

      // Compact the arrays if needed
      if (this.cacheKeys.filter(Boolean).length < this.cacheKeys.length * 0.7) {
        this.cacheKeys = this.cacheKeys.filter(Boolean);
        const newHits = new Uint16Array(MAX_CACHE_SIZE);
        this.cacheKeys.forEach((key, i) => {
          const oldIndex = this.cacheKeys.indexOf(key);
          if (oldIndex !== -1) {
            newHits[i] = this.cacheHits[oldIndex];
          }
        });
        this.cacheHits = newHits;
      }
    }
  }

  private applyScalingMethod(
    value: number,
    scaleFactor: number,
    method: "linear" | "sqrt" | "pow" = "linear"
  ): number {
    switch (method) {
      case "sqrt":
        return value * Math.sqrt(scaleFactor);
      case "pow":
        return value * Math.pow(scaleFactor, 0.8); // Less aggressive than square
      case "linear":
      default:
        return value * scaleFactor;
    }
  }

  public getResponsiveValue(
    type: "font" | "width" | "height",
    value: number,
    options: ResponsiveOptions = {}
  ): number {
    const {
      scaleUp = false,
      maxWidth,
      maxHeight,
      useScreen = false,
      baseWidth = DEFAULT_BASE_WIDTH,
      baseHeight = DEFAULT_BASE_HEIGHT,
      minScale = DEFAULT_MIN_SCALE_FACTOR,
      maxScale = DEFAULT_MAX_SCALE_FACTOR,
      scalingMethod = "linear",
    } = options;

    // Optimize cache key generation
    const cacheKey = `${type}|${value}|${scaleUp}|${maxWidth ?? ""}|${
      maxHeight ?? ""
    }|${useScreen}|${baseWidth}|${baseHeight}|${minScale}|${maxScale}|${scalingMethod}`;

    // Check cache first - inline optimization
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      const hitIndex = this.cacheKeys.indexOf(cacheKey);
      if (hitIndex !== -1) {
        this.cacheHits[hitIndex] = Math.min(this.cacheHits[hitIndex] + 1, 65535);
      }
      return cachedValue;
    }

    // Optimize scaling factor calculation
    let widthScaleFactor = 1;
    let heightScaleFactor = 1;

    const currentWidth = useScreen ? this.screenWidth : this.windowWidth;
    const currentHeight = useScreen ? this.screenHeight : this.windowHeight;

    // Calculate scale factors with bounds
    if (type !== "font") {
      widthScaleFactor = Math.max(
        minScale,
        Math.min(currentWidth / baseWidth, maxScale)
      );
      heightScaleFactor = Math.max(
        minScale,
        Math.min(currentHeight / baseHeight, maxScale)
      );
    }

    let result: number;
    switch (type) {
      case "font": {
        // Font scaling based on device type and orientation
        const baseFontScale = scaleUp
          ? value * this.invFontScale
          : value / PixelRatio.getFontScale();

        // Apply device-specific adjustments
        let deviceAdjustment = 1;
        if (this.deviceType === "tablet") {
          deviceAdjustment = this.isPortrait ? 1.1 : 1.05;
        } else if (this.deviceType === "desktop") {
          deviceAdjustment = 1.15;
        }

        // Scale based on screen width compared to base width
        const screenRatio = currentWidth / baseWidth;
        const fontScaleFactor = Math.max(
          minScale,
          Math.min(screenRatio * deviceAdjustment, maxScale)
        );

        result = this.applyScalingMethod(baseFontScale, fontScaleFactor, scalingMethod);
        break;
      }

      case "width": {
        const width = (value * baseWidth) / BASE_DIMENSION;
        // For width, we primarily scale based on width ratio
        result = this.applyScalingMethod(width, widthScaleFactor, scalingMethod);
        
        // Apply device-specific adjustments
        if (this.deviceType === "tablet" && !this.isPortrait) {
          // Adjust for landscape tablets
          result *= 0.95;
        }
        
        result = maxWidth ? Math.min(result, maxWidth) : result;
        break;
      }

      case "height": {
        const height = (value * baseHeight) / BASE_DIMENSION;
        // For height, we primarily scale based on height ratio
        result = this.applyScalingMethod(height, heightScaleFactor, scalingMethod);
        
        // Apply device-specific adjustments
        if (this.deviceType === "tablet" && this.isPortrait) {
          // Adjust for portrait tablets
          result *= 0.95;
        }
        
        result = maxHeight ? Math.min(result, maxHeight) : result;
        break;
      }

      default:
        result = value;
    }

    // Optimize rounding - use integer values when possible to avoid subpixel rendering issues
    result = Math.abs(result - Math.round(result)) < 0.1 
      ? Math.round(result) 
      : +result.toFixed(2);

    // Store in cache
    this.cache.set(cacheKey, result);
    
    // Find an empty slot or add to the end
    const emptyIndex = this.cacheKeys.indexOf("");
    if (emptyIndex !== -1) {
      this.cacheKeys[emptyIndex] = cacheKey;
      this.cacheHits[emptyIndex] = 1;
    } else {
      this.cacheKeys.push(cacheKey);
      this.cacheHits[this.cacheKeys.length - 1] = 1;
    }

    // Manage cache periodically
    if (this.cache.size % 50 === 0) {
      this.manageCache();
    }

    return result;
  }

  // Optimized getters with direct return
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
  public get isLandscape(): boolean {
    return !this.isPortrait;
  }
  public get isTablet(): boolean {
    return this.deviceType === "tablet" || this.deviceType === "desktop";
  }
  public get isPhone(): boolean {
    return this.deviceType === "phone";
  }
  public get isDesktop(): boolean {
    return this.deviceType === "desktop";
  }
  public get pixelRatio(): number {
    return this.pixelDensity;
  }
  public get fontScale(): number {
    return 1 / this.invFontScale;
  }
}

const responsive = ResponsiveManager.getInstance();

export const getResponsiveFontSize = (
  size: number, 
  options: Omit<ResponsiveOptions, "maxWidth" | "maxHeight" | "useScreen"> = {}
): number =>
  responsive.getResponsiveValue("font", size, options);

export const getResponsiveWidth = (
  percentage: number,
  options: Omit<ResponsiveOptions, "scaleUp"> = {}
): number =>
  responsive.getResponsiveValue("width", percentage, options);

export const getResponsiveHeight = (
  percentage: number,
  options: Omit<ResponsiveOptions, "scaleUp"> = {}
): number =>
  responsive.getResponsiveValue("height", percentage, options);

// Shorthand functions for common use cases
export const rs = (size: number, options = {}): number => 
  getResponsiveFontSize(size, options);

export const rw = (percentage: number, options = {}): number => 
  getResponsiveWidth(percentage, options);

export const rh = (percentage: number, options = {}): number => 
  getResponsiveHeight(percentage, options);

// Export constants
export const WINDOW_WIDTH = responsive.windowWidthValue;
export const WINDOW_HEIGHT = responsive.windowHeightValue;
export const SCREEN_WIDTH = responsive.screenWidthValue;
export const SCREEN_HEIGHT = responsive.screenHeightValue;
export const IS_PORTRAIT = responsive.isPortrait;
export const IS_LANDSCAPE = responsive.isLandscape;
export const IS_TABLET = responsive.isTablet;
export const IS_PHONE = responsive.isPhone;
export const IS_DESKTOP = responsive.isDesktop;
export const PIXEL_RATIO = responsive.pixelRatio;
export const FONT_SCALE = responsive.fontScale;

export const cleanupResponsiveManager = (): void => {
  responsive.cleanup();
};

export default responsive;
