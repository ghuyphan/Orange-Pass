import { Dimensions, PixelRatio, ScaledSize } from "react-native";

// --- Interfaces ---
interface ResponsiveOptions {
  scaleUp?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  useScreen?: boolean;
  baseWidth?: number;
  baseHeight?: number;
}

// --- Constants ---
const { width: INITIAL_WINDOW_WIDTH, height: INITIAL_WINDOW_HEIGHT } =
  Dimensions.get("window");
const { width: INITIAL_SCREEN_WIDTH, height: INITIAL_SCREEN_HEIGHT } =
  Dimensions.get("screen");

const DEFAULT_BASE_WIDTH = 360;
const DEFAULT_BASE_HEIGHT = 640;
const BASE_DIMENSION = 100;
const MAX_CACHE_SIZE = 500;
const MAX_SCALE_FACTOR = 1.2;

class ResponsiveManager {
  private static instance: ResponsiveManager;

  // Optimize memory usage with primitives
  private windowWidth: number;
  private windowHeight: number;
  private screenWidth: number;
  private screenHeight: number;
  private invFontScale: number;
  private dimensionsSubscription: { remove: () => void } | null = null;

  // Optimize cache with more efficient data structure
  private cache: Map<string, number> = new Map();
  private cacheHits: Uint16Array = new Uint16Array(MAX_CACHE_SIZE);

  private constructor() {
    this.windowWidth = INITIAL_WINDOW_WIDTH;
    this.windowHeight = INITIAL_WINDOW_HEIGHT;
    this.screenWidth = INITIAL_SCREEN_WIDTH;
    this.screenHeight = INITIAL_SCREEN_HEIGHT;
    this.invFontScale = 1 / PixelRatio.getFontScale();
    this.setupDimensionsListener();
  }

  public static getInstance(): ResponsiveManager {
    return this.instance || (this.instance = new ResponsiveManager());
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
    // Optimize change detection with bitwise operations
    const dimensionsChanged =
      window.width !== this.windowWidth ||
      window.height !== this.windowHeight ||
      screen.width !== this.screenWidth ||
      screen.height !== this.screenHeight;

    const fontScaleChanged =
      1 / PixelRatio.getFontScale() !== this.invFontScale;

    if (dimensionsChanged || fontScaleChanged) {
      this.windowWidth = window.width;
      this.windowHeight = window.height;
      this.screenWidth = screen.width;
      this.screenHeight = screen.height;
      this.invFontScale = 1 / PixelRatio.getFontScale();

      // Optimize cache clearing
      this.cache.clear();
      this.cacheHits.fill(0);
    }
  };

  // Optimized cache management with more efficient eviction
  private manageCache(): void {
    if (this.cache.size > MAX_CACHE_SIZE) {
      // Find lowest hit count indices
      const sortedIndices = Array.from(this.cacheHits.keys()).sort(
        (a, b) => this.cacheHits[a] - this.cacheHits[b]
      );

      // Remove least used items
      const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
      const cacheKeys = Array.from(this.cache.keys());

      for (let i = 0; i < entriesToRemove; i++) {
        const keyToRemove = cacheKeys[sortedIndices[i]];
        this.cache.delete(keyToRemove);
        this.cacheHits[sortedIndices[i]] = 0;
      }
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
    } = options;

    // Optimize cache key generation
    const cacheKey = `${type}|${value}|${scaleUp}|${maxWidth ?? ""}|${
      maxHeight ?? ""
    }|${useScreen}|${baseWidth}|${baseHeight}`;

    // Check cache first - inline optimization
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue !== undefined) {
      const hitIndex = Array.from(this.cache.keys()).indexOf(cacheKey);
      this.cacheHits[hitIndex] = Math.min(this.cacheHits[hitIndex] + 1, 65535);
      return cachedValue;
    }

    // Optimize scaling factor calculation
    let widthScaleFactor = 1;
    let heightScaleFactor = 1;

    if (type !== "font") {
      const currentWidth = useScreen ? this.screenWidth : this.windowWidth;
      const currentHeight = useScreen ? this.screenHeight : this.windowHeight;

      // Use faster Math.min with multiplication
      widthScaleFactor = Math.min(currentWidth / baseWidth, MAX_SCALE_FACTOR);
      heightScaleFactor = Math.min(
        currentHeight / baseHeight,
        MAX_SCALE_FACTOR
      );
    }

    let result: number;
    switch (type) {
      case "font":
        result = scaleUp
          ? value * this.invFontScale
          : value / PixelRatio.getFontScale();
        break;

      case "width": {
        const width = (value * baseWidth) / BASE_DIMENSION;
        result = width * widthScaleFactor;
        result = maxWidth ? Math.min(result, maxWidth) : result;
        break;
      }

      case "height": {
        const height = (value * baseHeight) / BASE_DIMENSION;
        result = height * heightScaleFactor;
        result = maxHeight ? Math.min(result, maxHeight) : result;
        break;
      }

      default:
        result = value;
    }

    // Optimize rounding
    result = +result.toFixed(2);

    // Store in cache
    this.cache.set(cacheKey, result);
    const cacheIndex = Array.from(this.cache.keys()).length - 1;
    this.cacheHits[cacheIndex] = 1;

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

  public get isTablet(): boolean {
    const pixelDensity = PixelRatio.get();
    const adjustedWidth = this.screenWidth * pixelDensity;
    const adjustedHeight = this.screenHeight * pixelDensity;

    // Optimize tablet detection calculation
    return Math.hypot(adjustedWidth, adjustedHeight) >= 1000;
  }
}

const responsive = ResponsiveManager.getInstance();

export const getResponsiveFontSize = (size: number, scaleUp = false): number =>
  responsive.getResponsiveValue("font", size, { scaleUp });

export const getResponsiveWidth = (
  percentage: number,
  maxWidth?: number,
  useScreen = false,
  baseWidth = DEFAULT_BASE_WIDTH
): number =>
  responsive.getResponsiveValue("width", percentage, {
    maxWidth,
    useScreen,
    baseWidth,
  });

export const getResponsiveHeight = (
  percentage: number,
  maxHeight?: number,
  useScreen = false,
  baseHeight = DEFAULT_BASE_HEIGHT
): number =>
  responsive.getResponsiveValue("height", percentage, {
    maxHeight,
    useScreen,
    baseHeight,
  });

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
