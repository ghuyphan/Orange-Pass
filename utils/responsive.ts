import { Dimensions, PixelRatio, Platform, ScaledSize } from "react-native";

// --- Interfaces ---

/**
 * Options for customizing responsive value calculations.
 */
interface ResponsiveOptions {
  /**
   * If true, ignores the user's system font scale setting when calculating font size.
   * If false (default), the system font scale setting is respected.
   * @default false
   */
  ignoreSystemFontScale?: boolean;
  /**
   * Optional maximum width constraint for the calculated value (applies to 'width' type).
   */
  maxWidth?: number;
  /**
   * Optional maximum height constraint for the calculated value (applies to 'height' type).
   */
  maxHeight?: number;
  /**
   * If true, uses screen dimensions instead of window dimensions for calculations.
   * Screen dimensions usually include areas like status bars or navigation bars.
   * @default false
   */
  useScreen?: boolean;
  /**
   * The base width of the design reference (e.g., Figma design width).
   * @default 375
   */
  baseWidth?: number;
  /**
   * The base height of the design reference (e.g., Figma design height).
   * @default 667
   */
  baseHeight?: number;
  /**
   * The minimum scaling factor allowed. Prevents elements from becoming too small.
   * @default 0.85
   */
  minScale?: number;
  /**
   * The maximum scaling factor allowed. Prevents elements from becoming too large.
   * @default 1.5
   */
  maxScale?: number;
  /**
   * The method used for applying the scale factor.
   * 'linear': Direct multiplication (value * scaleFactor).
   * 'sqrt': Square root scaling (value * sqrt(scaleFactor)) - less aggressive scaling up.
   * 'pow': Power scaling (value * pow(scaleFactor, 0.8)) - custom power curve.
   * @default 'linear'
   */
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
/** Base dimension used for percentage calculations (width/height). 100 means input is a percentage. */
const BASE_DIMENSION = 100;
const MAX_CACHE_SIZE = 500;
const DEFAULT_MAX_SCALE_FACTOR = 1.5;
const DEFAULT_MIN_SCALE_FACTOR = 0.85;

// Device detection constants
const TABLET_DIAGONAL_THRESHOLD = 1000; // in pixels
const LARGE_SCREEN_WIDTH_THRESHOLD = 768; // in dp

/**
 * Manages responsive UI calculations based on device dimensions, pixel density,
 * font scale, and device type. Uses a singleton pattern and caching for performance.
 */
class ResponsiveManager {
  private static instance: ResponsiveManager;

  private windowWidth: number;
  private windowHeight: number;
  private screenWidth: number;
  private screenHeight: number;
  private pixelDensity: number;
  private currentFontScale: number; // Store current font scale directly
  private dimensionsSubscription: { remove: () => void } | null = null;
  private deviceType: "phone" | "tablet" | "desktop";

  // Cache remains the same as per request
  private cache: Map<string, number> = new Map();
  private cacheHits: Uint16Array = new Uint16Array(MAX_CACHE_SIZE);
  private cacheKeys: string[] = [];

  private constructor() {
    this.windowWidth = INITIAL_WINDOW_WIDTH;
    this.windowHeight = INITIAL_WINDOW_HEIGHT;
    this.screenWidth = INITIAL_SCREEN_WIDTH;
    this.screenHeight = INITIAL_SCREEN_HEIGHT;
    this.pixelDensity = PixelRatio.get();
    this.currentFontScale = PixelRatio.getFontScale();
    this.deviceType = this.detectDeviceType();
    this.setupDimensionsListener();
  }

  /**
   * Gets the singleton instance of the ResponsiveManager.
   */
  public static getInstance(): ResponsiveManager {
    return this.instance || (this.instance = new ResponsiveManager());
  }

  /**
   * Detects the type of device based on screen dimensions and pixel density.
   */
  private detectDeviceType(): "phone" | "tablet" | "desktop" {
    const pixelDensity = this.pixelDensity; // Use stored density
    const adjustedWidth = this.screenWidth * pixelDensity;
    const adjustedHeight = this.screenHeight * pixelDensity;
    const diagonalSize = Math.sqrt(
      Math.pow(adjustedWidth, 2) + Math.pow(adjustedHeight, 2)
    );

    if (Platform.OS === "web" && this.screenWidth > 1024) {
      return "desktop";
    } else if (
      diagonalSize >= TABLET_DIAGONAL_THRESHOLD ||
      Math.max(this.screenWidth, this.screenHeight) >=
        LARGE_SCREEN_WIDTH_THRESHOLD
    ) {
      return "tablet";
    }
    return "phone";
  }

  /**
   * Sets up the event listener for dimension changes.
   */
  private setupDimensionsListener(): void {
    if (this.dimensionsSubscription) return; // Prevent multiple listeners
    this.dimensionsSubscription = Dimensions.addEventListener(
      "change",
      this.handleDimensionsChange
    );
  }

  /**
   * Removes the dimension change event listener. Should be called during app cleanup.
   */
  public cleanup(): void {
    this.dimensionsSubscription?.remove();
    this.dimensionsSubscription = null;
    // Optionally clear instance for testing/re-initialization
    // ResponsiveManager.instance = null;
  }

  /**
   * Handles updates when device dimensions, density, or font scale change.
   */
  private handleDimensionsChange = ({
    window,
    screen,
  }: {
    window: ScaledSize;
    screen: ScaledSize;
  }): void => {
    const newPixelDensity = PixelRatio.get();
    const newFontScale = PixelRatio.getFontScale();

    const dimensionsChanged =
      Math.abs(window.width - this.windowWidth) > 0.5 ||
      Math.abs(window.height - this.windowHeight) > 0.5 ||
      Math.abs(screen.width - this.screenWidth) > 0.5 ||
      Math.abs(screen.height - this.screenHeight) > 0.5;

    const pixelDensityChanged =
      Math.abs(newPixelDensity - this.pixelDensity) > 0.01;
    const fontScaleChanged =
      Math.abs(newFontScale - this.currentFontScale) > 0.01;

    if (dimensionsChanged || fontScaleChanged || pixelDensityChanged) {
      this.windowWidth = window.width;
      this.windowHeight = window.height;
      this.screenWidth = screen.width;
      this.screenHeight = screen.height;
      this.pixelDensity = newPixelDensity;
      this.currentFontScale = newFontScale;
      this.deviceType = this.detectDeviceType(); // Re-detect device type

      // Clear cache on significant changes
      this.cache.clear();
      this.cacheHits.fill(0);
      this.cacheKeys = [];
    }
  };

  // Cache management logic (unchanged as requested)
  private manageCache(): void {
    if (this.cache.size > MAX_CACHE_SIZE) {
      const sortedIndices = Array.from(this.cacheHits.entries())
        .slice(0, this.cacheKeys.length)
        .sort(([, a], [, b]) => a - b)
        .map(([index]) => index);

      const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
      for (let i = 0; i < entriesToRemove && i < sortedIndices.length; i++) {
        const index = sortedIndices[i];
        if (index < this.cacheKeys.length) {
          const keyToRemove = this.cacheKeys[index];
          this.cache.delete(keyToRemove);
          this.cacheHits[index] = 0;
          this.cacheKeys[index] = "";
        }
      }

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

  /**
   * Applies the selected scaling method to a value.
   */
  private applyScalingMethod(
    value: number,
    scaleFactor: number,
    method: "linear" | "sqrt" | "pow" = "linear"
  ): number {
    switch (method) {
      case "sqrt":
        return value * Math.sqrt(scaleFactor);
      case "pow":
        // Example power curve, adjust exponent as needed
        return value * Math.pow(scaleFactor, 0.8);
      case "linear":
      default:
        return value * scaleFactor;
    }
  }

  /**
   * Calculates a responsive value (font size, width, or height) based on current
   * device properties and provided options. Uses caching for performance.
   *
   * @param type The type of value to calculate ('font', 'width', 'height').
   * @param value The base value (e.g., font size in points, width/height percentage relative to BASE_DIMENSION).
   * @param options Configuration options for the calculation.
   * @returns The calculated responsive value.
   */
  public getResponsiveValue(
    type: "font" | "width" | "height",
    value: number,
    options: ResponsiveOptions = {}
  ): number {
    const {
      // --- Updated Font Scaling Option ---
      ignoreSystemFontScale = false, // Default: respect system scale
      // ------------------------------------
      maxWidth,
      maxHeight,
      useScreen = false,
      baseWidth = DEFAULT_BASE_WIDTH,
      baseHeight = DEFAULT_BASE_HEIGHT,
      minScale = DEFAULT_MIN_SCALE_FACTOR,
      maxScale = DEFAULT_MAX_SCALE_FACTOR,
      scalingMethod = "linear",
    } = options;

    // Updated cache key generation
    const cacheKey = `${type}|${value}|${ignoreSystemFontScale}|${
      maxWidth ?? ""
    }|${maxHeight ?? ""}|${useScreen}|${baseWidth}|${baseHeight}|${minScale}|${maxScale}|${scalingMethod}`;

    // Check cache first
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      const hitIndex = this.cacheKeys.indexOf(cacheKey);
      if (hitIndex !== -1) {
        this.cacheHits[hitIndex] = Math.min(this.cacheHits[hitIndex] + 1, 65535);
      }
      return cachedValue;
    }

    let widthScaleFactor = 1;
    let heightScaleFactor = 1;

    const currentWidth = useScreen ? this.screenWidth : this.windowWidth;
    const currentHeight = useScreen ? this.screenHeight : this.windowHeight;

    // Calculate scale factors with bounds (only for width/height types initially)
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
        // --- Updated Font Logic ---
        // Determine base font size considering system scale setting
        const baseFontSize = ignoreSystemFontScale
          ? value / this.currentFontScale // Counteract system scale if ignoring
          : value; // Use value directly if respecting system scale
        // --------------------------

        // Apply device-specific adjustments
        let deviceAdjustment = 1;
        if (this.deviceType === "tablet") {
          deviceAdjustment = this.isPortrait ? 1.1 : 1.05;
        } else if (this.deviceType === "desktop") {
          deviceAdjustment = 1.15;
        }

        // Scale based on screen width compared to base width
        const screenRatio = currentWidth / baseWidth;
        // Apply min/max clamping to the final scale factor
        const fontScaleFactor = Math.max(
          minScale,
          Math.min(screenRatio * deviceAdjustment, maxScale)
        );

        result = this.applyScalingMethod(
          baseFontSize, // Use the adjusted base size
          fontScaleFactor,
          scalingMethod
        );
        break;
      }

      case "width": {
        // Calculate base width from percentage input
        const baseValueWidth = (value * baseWidth) / BASE_DIMENSION;
        result = this.applyScalingMethod(
          baseValueWidth,
          widthScaleFactor,
          scalingMethod
        );

        // Apply device-specific adjustments
        if (this.deviceType === "tablet" && !this.isPortrait) {
          result *= 0.95; // Slightly reduce width on landscape tablets
        }

        // Apply max width constraint
        result = maxWidth ? Math.min(result, maxWidth) : result;
        break;
      }

      case "height": {
        // Calculate base height from percentage input
        const baseValueHeight = (value * baseHeight) / BASE_DIMENSION;
        result = this.applyScalingMethod(
          baseValueHeight,
          heightScaleFactor,
          scalingMethod
        );

        // Apply device-specific adjustments
        if (this.deviceType === "tablet" && this.isPortrait) {
          result *= 0.95; // Slightly reduce height on portrait tablets
        }

        // Apply max height constraint
        result = maxHeight ? Math.min(result, maxHeight) : result;
        break;
      }

      default:
        // Should not happen with typed input, but provide fallback
        console.warn("Unsupported responsive type:", type);
        result = value;
    }

    // Rounding logic (unchanged)
    result =
      Math.abs(result - Math.round(result)) < 0.1
        ? Math.round(result)
        : +result.toFixed(2);

    // Store in cache (unchanged)
    this.cache.set(cacheKey, result);
    const emptyIndex = this.cacheKeys.indexOf("");
    if (emptyIndex !== -1) {
      this.cacheKeys[emptyIndex] = cacheKey;
      this.cacheHits[emptyIndex] = 1;
    } else if (this.cacheKeys.length < MAX_CACHE_SIZE) {
      // Only push if cache is not full (manageCache handles eviction)
      this.cacheKeys.push(cacheKey);
      this.cacheHits[this.cacheKeys.length - 1] = 1;
    }

    // Manage cache periodically (unchanged)
    if (this.cache.size > MAX_CACHE_SIZE && this.cache.size % 50 === 0) {
      this.manageCache();
    }

    return result;
  }

  // --- Getters for current state ---

  /** Gets the current window width. */
  public get windowWidthValue(): number {
    return this.windowWidth;
  }
  /** Gets the current window height. */
  public get windowHeightValue(): number {
    return this.windowHeight;
  }
  /** Gets the current screen width. */
  public get screenWidthValue(): number {
    return this.screenWidth;
  }
  /** Gets the current screen height. */
  public get screenHeightValue(): number {
    return this.screenHeight;
  }
  /** Returns true if the current orientation is portrait. */
  public get isPortrait(): boolean {
    // Use window dimensions for orientation check
    return this.windowHeight >= this.windowWidth;
  }
  /** Returns true if the current orientation is landscape. */
  public get isLandscape(): boolean {
    return !this.isPortrait;
  }
  /** Returns true if the device is detected as a tablet or desktop. */
  public get isTablet(): boolean {
    return this.deviceType === "tablet" || this.deviceType === "desktop";
  }
  /** Returns true if the device is detected as a phone. */
  public get isPhone(): boolean {
    return this.deviceType === "phone";
  }
  /** Returns true if the device is detected as desktop (web). */
  public get isDesktop(): boolean {
    return this.deviceType === "desktop";
  }
  /** Gets the current device pixel ratio. */
  public get pixelRatio(): number {
    return this.pixelDensity;
  }
  /** Gets the current system font scale factor. */
  public get fontScale(): number {
    return this.currentFontScale;
  }
  /** Gets the detected device type ('phone', 'tablet', 'desktop'). */
  public get deviceTypeValue(): "phone" | "tablet" | "desktop" {
    return this.deviceType;
  }
}

// --- Public API ---

/** Singleton instance of the ResponsiveManager. */
const responsive = ResponsiveManager.getInstance();

/**
 * Calculates a responsive font size.
 * @param size The base font size in points.
 * @param options Options, including `ignoreSystemFontScale`.
 * @returns The calculated responsive font size.
 */
export const getResponsiveFontSize = (
  size: number,
  options: Omit<
    ResponsiveOptions,
    "maxWidth" | "maxHeight" | "useScreen" | "scaleUp" // Exclude irrelevant/old options
  > = {}
): number => responsive.getResponsiveValue("font", size, options);

/**
 * Calculates a responsive width based on a percentage of the base width.
 * @param percentage A value from 0-100 representing the percentage of the base width.
 * @param options Options like `maxWidth`, `useScreen`, `baseWidth`, etc.
 * @returns The calculated responsive width in pixels.
 */
export const getResponsiveWidth = (
  percentage: number,
  options: Omit<ResponsiveOptions, "ignoreSystemFontScale" | "scaleUp"> = {} // Exclude irrelevant/old options
): number => responsive.getResponsiveValue("width", percentage, options);

/**
 * Calculates a responsive height based on a percentage of the base height.
 * @param percentage A value from 0-100 representing the percentage of the base height.
 * @param options Options like `maxHeight`, `useScreen`, `baseHeight`, etc.
 * @returns The calculated responsive height in pixels.
 */
export const getResponsiveHeight = (
  percentage: number,
  options: Omit<ResponsiveOptions, "ignoreSystemFontScale" | "scaleUp"> = {} // Exclude irrelevant/old options
): number => responsive.getResponsiveValue("height", percentage, options);

// --- Shorthand Aliases ---

/** Shorthand for getResponsiveFontSize. */
export const rs = (
  size: number,
  options: Omit<
    ResponsiveOptions,
    "maxWidth" | "maxHeight" | "useScreen" | "scaleUp"
  > = {}
): number => getResponsiveFontSize(size, options);

/** Shorthand for getResponsiveWidth. */
export const rw = (
  percentage: number,
  options: Omit<ResponsiveOptions, "ignoreSystemFontScale" | "scaleUp"> = {}
): number => getResponsiveWidth(percentage, options);

/** Shorthand for getResponsiveHeight. */
export const rh = (
  percentage: number,
  options: Omit<ResponsiveOptions, "ignoreSystemFontScale" | "scaleUp"> = {}
): number => getResponsiveHeight(percentage, options);

/**
 * Call this function when your app is unmounting or cleaning up
 * to remove the dimension event listener.
 */
export const cleanupResponsiveManager = (): void => {
  responsive.cleanup();
};

/** Default export of the singleton instance. */
export default responsive;

// --- Removed Static Exports ---
// Exporting static values can be misleading as they don't update.
// Use the instance getters instead (e.g., responsive.windowWidthValue).
/*
export const WINDOW_WIDTH = responsive.windowWidthValue; // DO NOT USE - Static
export const WINDOW_HEIGHT = responsive.windowHeightValue; // DO NOT USE - Static
export const SCREEN_WIDTH = responsive.screenWidthValue; // DO NOT USE - Static
export const SCREEN_HEIGHT = responsive.screenHeightValue; // DO NOT USE - Static
export const IS_PORTRAIT = responsive.isPortrait; // DO NOT USE - Static
export const IS_LANDSCAPE = responsive.isLandscape; // DO NOT USE - Static
export const IS_TABLET = responsive.isTablet; // DO NOT USE - Static
export const IS_PHONE = responsive.isPhone; // DO NOT USE - Static
export const IS_DESKTOP = responsive.isDesktop; // DO NOT USE - Static
export const PIXEL_RATIO = responsive.pixelRatio; // DO NOT USE - Static
export const FONT_SCALE = responsive.fontScale; // DO NOT USE - Static
*/
