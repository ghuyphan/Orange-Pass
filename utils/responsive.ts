import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

// --- Interfaces ---

// Describes the shape of the dimensions object (window and screen sizes).
interface DimensionsType {
  window: ScaledSize;
  screen: ScaledSize;
}

// Options for customizing how responsive values are calculated.
interface ResponsiveOptions {
  scaleUp?: boolean;       // Should font sizes scale up beyond their base size?
  maxWidth?: number;       // Maximum width (in pixels).
  maxHeight?: number;      // Maximum height (in pixels).
  useScreen?: boolean;    // Use screen dimensions instead of window dimensions?
}

// --- Constants ---

// Get initial window and screen dimensions. These are used as the starting point.
const { width: INITIAL_WINDOW_WIDTH, height: INITIAL_WINDOW_HEIGHT } = Dimensions.get('window');
const { width: INITIAL_SCREEN_WIDTH, height: INITIAL_SCREEN_HEIGHT } = Dimensions.get('screen');

// Calculate the inverse font scale.  Used for scaling font sizes.
const INITIAL_INV_FONT_SCALE = 1 / PixelRatio.getFontScale();

// Base dimension for percentage calculations (it's always 100%).
const BASE_DIMENSION = 100;

// Maximum number of cached values.  Helps prevent memory issues.
const MAX_CACHE_SIZE = 500;


// --- The ResponsiveManager Class ---

class ResponsiveManager {
  // --- Singleton Instance ---
  private static instance: ResponsiveManager;

  // --- Private Properties ---

  // Store the current window and screen dimensions.
  private windowWidth: number;
  private windowHeight: number;
  private screenWidth: number;
  private screenHeight: number;

  // Store the inverse font scale.
  private invFontScale: number;

  // Store the subscription for the Dimensions event listener.  Used for cleanup.
  private dimensionsSubscription: { remove: () => void } | null = null;

  // Cache to store previously calculated responsive values.
  // The key is a string that represents the calculation parameters.
  // The value is the calculated result.
  private cache: Map<string, number> = new Map();

  // Track how many times each cached value has been accessed (for LRU cache).
  private cacheHits: Map<string, number> = new Map();


  // --- Constructor ---

  // Private constructor to enforce singleton pattern.
  private constructor() {
    // Initialize with the pre-calculated initial dimensions.
    this.windowWidth = INITIAL_WINDOW_WIDTH;
    this.windowHeight = INITIAL_WINDOW_HEIGHT;
    this.screenWidth = INITIAL_SCREEN_WIDTH;
    this.screenHeight = INITIAL_SCREEN_HEIGHT;
    this.invFontScale = INITIAL_INV_FONT_SCALE;

    // Set up the listener to handle dimension changes.
    this.setupDimensionsListener();
  }

  // --- Singleton Access ---

  // Get the single instance of the ResponsiveManager.
  public static getInstance(): ResponsiveManager {
    if (!ResponsiveManager.instance) {
      ResponsiveManager.instance = new ResponsiveManager();
    }
    return ResponsiveManager.instance;
  }

  // --- Event Listener Setup ---

  // Set up the listener for Dimensions changes.
  private setupDimensionsListener(): void {
    this.dimensionsSubscription = Dimensions.addEventListener(
      'change',
      this.handleDimensionsChange
    );
  }

  // --- Cleanup (Important for Preventing Memory Leaks) ---
  public cleanup(): void {
    if (this.dimensionsSubscription) {
      this.dimensionsSubscription.remove(); // Remove the event listener.
      this.dimensionsSubscription = null;
    }
  }

  // --- Event Handler ---

  // Called when the window or screen dimensions change.
  private handleDimensionsChange = ({
    window,
    screen,
  }: {
    window: ScaledSize;
    screen: ScaledSize;
  }): void => {

    // Check if the dimensions *actually* changed (width or height).
      const dimensionsChanged =
          window.width !== this.windowWidth ||
          window.height !== this.windowHeight ||
          screen.width !== this.screenWidth ||
          screen.height !== this.screenHeight;

    // Also check if the font scale changed
    const fontScaleChanged = 1 / PixelRatio.getFontScale() !== this.invFontScale;
    // If either dimensions or font scale changed, update the values and clear the cache.
    if (dimensionsChanged || fontScaleChanged) {
      this.windowWidth = window.width;
      this.windowHeight = window.height;
      this.screenWidth = screen.width;
      this.screenHeight = screen.height;
      this.invFontScale = 1 / PixelRatio.getFontScale();
      this.cache.clear();        // Clear the cache.
      this.cacheHits.clear();    // Clear cache hit counts.
    }
  };

  // --- Cache Management (LRU) ---

  // Limit the size of the cache to prevent memory issues.
  private manageCache(): void {
    if (this.cache.size > MAX_CACHE_SIZE) {
      // Least Recently Used (LRU) cache eviction.
      // 1. Get all cache entries.
      const entries = Array.from(this.cacheHits.entries());

      // 2. Sort entries by hit count (least used first).
      entries.sort((a, b) => a[1] - b[1]);

      // 3. Calculate how many entries to remove (20% in this case).
      const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);

      // 4. Remove the least used entries from both the cache and the hit counts.
      for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
        this.cacheHits.delete(entries[i][0]);
      }
    }
  }

  // --- Core Calculation Function ---

  // Calculate a responsive value (font size, width, or height).
  public getResponsiveValue(
    type: 'font' | 'width' | 'height',  // Type of value ('font', 'width', or 'height').
    value: number,                     // The base value (e.g., font size in points, width/height percentage).
    options: ResponsiveOptions = {}    // Optional parameters.
  ): number {
    // Destructure the options with default values.
    const { scaleUp = false, maxWidth, maxHeight, useScreen = false } = options;

    // Create a unique key for the cache based on all parameters.
    const cacheKey = `${type}-${value}-${scaleUp}-${maxWidth}-${maxHeight}-${useScreen}`;

    // Check if the value is already in the cache.
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      // If found in cache, update the hit count and return the cached value.
      this.cacheHits.set(cacheKey, (this.cacheHits.get(cacheKey) || 0) + 1);
      return cachedValue;
    }

    // If not in cache, calculate the value.
    let result: number;

    switch (type) {
      case 'font':
        // Font size calculation.
        result = scaleUp
          ? value * this.invFontScale
          : value / PixelRatio.getFontScale(); // Use getFontScale for consistency.
        break;

      case 'width': {
        // Width calculation.
        const baseWidth = useScreen ? this.screenWidth : this.windowWidth; // Use screen or window width.
        const width = (value * baseWidth) / BASE_DIMENSION; // Calculate the width.
        result = maxWidth ? Math.min(width, maxWidth) : width; // Apply maxWidth if provided.
        break;
      }

      case 'height': {
        // Height calculation.
        const baseHeight = useScreen ? this.screenHeight : this.windowHeight; // Use screen or window height.
        const height = (value * baseHeight) / BASE_DIMENSION; // Calculate the height.
        result = maxHeight ? Math.min(height, maxHeight) : height; // Apply maxHeight if provided.
        break;
      }

      default:
        // If the type is invalid, return the original value.
        result = value;
    }

    // Round the result to 2 decimal places.
    result = Math.round(result * 100) / 100;

    // Store the calculated value in the cache.
    this.cache.set(cacheKey, result);
    this.cacheHits.set(cacheKey, 1); // Set initial hit count to 1.

    // Manage the cache size (LRU eviction).
    this.manageCache();

    return result;
  }

  // --- Getters for Dimensions ---

  // Get the current window width.
  public get windowWidthValue(): number {
    return this.windowWidth;
  }

  // Get the current window height.
  public get windowHeightValue(): number {
    return this.windowHeight;
  }

  // Get the current screen width.
  public get screenWidthValue(): number {
    return this.screenWidth;
  }

  // Get the current screen height.
  public get screenHeightValue(): number {
    return this.screenHeight;
  }

  // --- Utility Methods ---

  // Check if the device is in portrait orientation.
  public get isPortrait(): boolean {
    return this.windowHeight > this.windowWidth;
  }

  // Check if the device is a tablet (a simple heuristic).
  public get isTablet(): boolean {
    const pixelDensity = PixelRatio.get();
    const adjustedWidth = this.screenWidth * pixelDensity;
    const adjustedHeight = this.screenHeight * pixelDensity;

    // A common (though not perfect) way to define a tablet.
    return (
      Math.sqrt(
        Math.pow(adjustedWidth, 2) + Math.pow(adjustedHeight, 2)
      ) >= 1000
    );
  }
}

// --- Exported Functions and Values ---

// Export a singleton instance of the ResponsiveManager.
const responsive = ResponsiveManager.getInstance();

// --- Utility Functions (for convenience) ---

// Get a responsive font size.
export const getResponsiveFontSize = (size: number, scaleUp = false): number =>
  responsive.getResponsiveValue('font', size, { scaleUp });

// Get a responsive width.
export const getResponsiveWidth = (
  percentage: number,
  maxWidth?: number,
  useScreen = false
): number => responsive.getResponsiveValue('width', percentage, { maxWidth, useScreen });

// Get a responsive height.
export const getResponsiveHeight = (
  percentage: number,
  maxHeight?: number,
  useScreen = false
): number => responsive.getResponsiveValue('height', percentage, { maxHeight, useScreen });

// --- Exported Constants (for direct access) ---

// Export the current window and screen dimensions.
export const WINDOW_WIDTH = responsive.windowWidthValue;
export const WINDOW_HEIGHT = responsive.windowHeightValue;
export const SCREEN_WIDTH = responsive.screenWidthValue;
export const SCREEN_HEIGHT = responsive.screenHeightValue;
export const IS_PORTRAIT = responsive.isPortrait;
export const IS_TABLET = responsive.isTablet;

// --- Export Cleanup Function ---

// Export the cleanup function to be called when the app unmounts.
export const cleanupResponsiveManager = (): void => {
  responsive.cleanup();
};

// Export the ResponsiveManager instance as the default export.
export default responsive;