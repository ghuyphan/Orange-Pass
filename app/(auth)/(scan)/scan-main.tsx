import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableWithoutFeedback, LayoutChangeEvent, Linking, SafeAreaView, StatusBar } from 'react-native';
import { Camera, Code, useCameraDevice, useCameraPermission, useCodeScanner, CodeScannerFrame, CameraProps } from 'react-native-vision-camera';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, useAnimatedProps, SharedValue } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import * as Brightness from 'expo-brightness';
import ImagePicker from 'react-native-image-crop-picker';
import { Redirect, useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { MAX_ZOOM_FACTOR } from '@/constants/Constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { throttle, debounce } from 'lodash';
import { t } from '@/i18n';

import { ScannerFrame, FocusIndicator, ZoomControl } from '@/components/camera';
import { ThemedView } from '@/components/ThemedView';
import BottomSheet from '@gorhom/bottom-sheet';
import ThemedSettingSheet from '@/components/bottomsheet/ThemedSettingSheet';

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera)
Reanimated.addWhitelistedNativeProps({
  zoom: true,
})


interface CameraHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Pattern {
  pattern: RegExp;
  handler: () => void;
}

// Hook to manage camera setup and flash control
const useCameraSetup = (cameraRef: React.RefObject<Camera>) => {
  const device = useCameraDevice('back');
  const { hasPermission } = useCameraPermission();
  const [torch, setTorch] = useState<'off' | 'on'>('off');

  const toggleFlash = () => {
    if (device?.hasFlash) {
      setTorch(prevTorch => (prevTorch === 'off' ? 'on' : 'off'));
    } else {
      console.warn('This device does not have a flash');
    }
  };

  return { device, hasPermission, torch, toggleFlash };
};

// Hook to manage tap-to-focus gesture
const useFocusGesture = (cameraRef: React.RefObject<Camera>, zoom: SharedValue<number>) => {
  const [focusPoint, setFocusPoint] = useState<null | { x: number; y: number }>(null);
  const focusOpacity = useSharedValue(0);
  const FOCUS_DEBOUNCE_MS = 50; // Minimum time between focuses in milliseconds

  // Debounced focus function that includes setting the focus point and the animation
  const debouncedFocus = useCallback(debounce((point: { x: number; y: number }) => {
    if (!cameraRef.current) {
      console.warn('Camera not ready yet.');
      return;
    }
    // Set the focus point for visual feedback
    runOnJS(setFocusPoint)(point);
    focusOpacity.value = 1;

    // Adjust the focus point based on the zoom level
    const adjustedPoint = {
      x: point.x / zoom.value,
      y: point.y / zoom.value,
    };

    // Perform the focus action on the camera
    cameraRef.current.focus(adjustedPoint)
      .then(() => console.log('Focus successful'))
      .catch(error => console.error('Focus failed:', error));

    // Fade out the focus indicator after 400ms
    focusOpacity.value = withTiming(0, { duration: 300 });
  }, FOCUS_DEBOUNCE_MS), [zoom.value]);

  const gesture = useMemo(() => Gesture.Tap()
    .onEnd(({ x, y }) => {
      runOnJS(debouncedFocus)({ x, y });
    }), [debouncedFocus]);

  const animatedFocusStyle = useAnimatedStyle(() => ({
    opacity: focusOpacity.value,
    transform: [{ scale: withSpring(focusOpacity.value ? 1 : 0.5) }],
  }));

  // Optional cleanup logic if needed
  useEffect(() => {
    return () => {
      debouncedFocus.cancel(); // Cancel debounced function on unmount
    };
  }, [debouncedFocus]);

  return { gesture, focusPoint, animatedFocusStyle };
};

// Main ScanScreen component
export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);
  const { device, hasPermission, torch, toggleFlash } = useCameraSetup(cameraRef);

  const zoom = useSharedValue(1)
  const { gesture, focusPoint, animatedFocusStyle } = useFocusGesture(cameraRef, zoom);
  const minZoom = device?.minZoom ?? 1
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR)

  const cameraAnimatedProps = useAnimatedProps<CameraProps>(() => {
    const z = Math.max(Math.min(zoom.value, maxZoom), minZoom)
    return {
      zoom: z,
    }
  }, [maxZoom, minZoom, zoom])

  const [layout, setLayout] = useState<LayoutChangeEvent['nativeEvent']['layout']>({ x: 0, y: 0, width: 0, height: 0 });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameCounterRef = useRef(0); // Used to skip frames when scanning
  const [scanFrame, setScanFrame] = useState<CodeScannerFrame>({ height: 1, width: 1 });
  const [codeScannerHighlights, setCodeScannerHighlights] = useState<CameraHighlight[]>([]);
  const [codeMetadata, setCodeMetadata] = useState<string>('');
  const [codeValue, setCodeValue] = useState<string>('');
  const [codeType, setCodeType] = useState<string>('');
  const [iconName, setIconName] = useState<keyof typeof Ionicons.glyphMap>('compass');

  const bottomSheetRef = useRef<BottomSheet>(null);
  const handleExpandPress = useCallback(() => {
    // setSelectedItemId(id);
    bottomSheetRef.current?.expand();
}, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    if (event.nativeEvent.layout) {
      setLayout(event.nativeEvent.layout);
    }
  }, []);


  const handleCodeScanned = useCallback(throttle((codeMetadata: string) => {
    const patterns: { [key: string]: Pattern } = {
      WIFI: {
        pattern: /^WIFI:/,
        handler: () => {
          const ssidMatch = codeMetadata.match(/S:([^;]*)/);
          const ssid = ssidMatch ? ssidMatch[1] : 'Unknown';
          setCodeType('WIFI');
          setIconName('wifi');
          setCodeValue(`${t('scanScreen.join')} "${ssid}" ${t('scanScreen.join2')}`);
        },
      },
      URL: {
        pattern: /^(https:\/\/|http:\/\/)/,
        handler: () => {
          const url = codeMetadata.replace(/^https?:\/\//, '');
          setCodeType('URL');
          setIconName('compass');
          setCodeValue(`${t('scanScreen.goto')} "${url}"`);
        },
      },
      VietQR: {
        pattern: /^000201010211/,
        handler: () => {
          if (codeMetadata.includes('MOMO')) {
            setCodeType('ewallet');
            setIconName('qr-code');
            setCodeValue(`${t('scanScreen.momoPayment')}`);
          } else if (codeMetadata.includes('zalopay')) {
            setCodeType('ewallet');
            setIconName('qr-code');
            setCodeValue(`${t('scanScreen.zalopayPayment')}`);
          } else {
            setCodeType('card');
            setIconName('qr-code');
            setCodeValue(codeMetadata);
          }
        },
      },
    };

    for (const key in patterns) {
      const { pattern, handler } = patterns[key];
      if (pattern.test(codeMetadata)) {
        handler();
        return;
      }
    }

    setCodeType('unknown');
    setCodeValue(t('scanScreen.unknownCode'));
  }, 500), []);


  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'code-39', 'ean-13', 'ean-8', 'upc-a', 'upc-e', 'data-matrix'],
    onCodeScanned: (codes: Code[], frame: CodeScannerFrame) => {
      frameCounterRef.current++;

      // Process every 4th frame (adjust frame skip logic here as needed)
      if (frameCounterRef.current % 4 === 0) {
        setScanFrame(frame);

        // Clear previous timeout to prevent stale highlights
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // If codes are detected, process the first one
        if (codes.length > 0) {
          const firstCode = codes[0];

          // Update metadata and highlight box
          setCodeMetadata(firstCode.value ?? '');
          setCodeScannerHighlights([{
            height: firstCode.frame?.height ?? 0,
            width: firstCode.frame?.width ?? 0,
            x: firstCode.frame?.x ?? 0,
            y: firstCode.frame?.y ?? 0,
          }]);

          // Call the handleCodeScanned function to process the scanned code
          handleCodeScanned(firstCode.value ?? '');

          // Reset the highlights and metadata after 800ms
          timeoutRef.current = setTimeout(() => {
            setCodeScannerHighlights([]);
            setCodeMetadata('');
            setCodeType('');
            setCodeValue('');
          }, 1000);
        }
      }
    },
  });

  const onOpenGallery = async () => {
    try {
      const result = await ImagePicker.openPicker({
        width: 300,
        height: 400,
        includeBase64: true, // Get the image as a base64 string
      });

      if (result) {
        const base64Data = result;
        const imageUri = `data:${result.mime};base64,${base64Data}`;

        // Now, process the image data using a canvas to extract pixel data
      }
    } catch (error) {
      console.log('Error opening image picker:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const restoreBrightness = async () => {
        try {
          const { status } = await Brightness.getPermissionsAsync();
          if (status === 'granted') {
            // Explicitly set to automatic mode
            await Brightness.setSystemBrightnessModeAsync(Brightness.BrightnessMode.AUTOMATIC);
          }
        } catch (error) {
          console.log(error);
        }
      };
      // Restore brightness when the screen loses focus
      return () => {
        restoreBrightness();
      };
    }, [])
  );


  // Clean up timeout when component unmounts
  useEffect(() => {
    return () => {
      timeoutRef.current && clearTimeout(timeoutRef.current);
    };
  }, []);

  const onResultTap = (url: string, codeType: string) => {
    switch (codeType) {
      case 'URL':
        Linking.openURL(url);
        break;
      case 'WIFI':
        console.log(url);
        break;
    }
  }

  const cameraOpacity = useSharedValue(0);  // Initialize camera opacity
  const animatedCameraStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(cameraOpacity.value, { duration: 500 }),  // Animate opacity
    };
  });

  useEffect(() => {
    // Delay the camera preview 
    if (device) {
      const timeout = setTimeout(() => {
        cameraOpacity.value = 1;  // Set the camera opacity to 1 after the delay
      }, 600); 
      return () => clearTimeout(timeout);
    }
  }, [device]);

  if (!hasPermission) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Redirect href="/(auth)/(scan)/permission" />
      </ThemedView>
    );
  }

  if (!device) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loaderText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <SafeAreaView style={styles.cameraContainer}>
            <Animated.View style={[StyleSheet.absoluteFill, animatedCameraStyle]}>
              <ReanimatedCamera
                ref={cameraRef}
                torch={torch}
                style={StyleSheet.absoluteFill}
                device={device}
                onLayout={onLayout}
                isActive={true}
                codeScanner={codeScanner}
                resizeMode='cover'
                videoStabilizationMode='auto'
                animatedProps={cameraAnimatedProps}
              />
            </Animated.View>
          <FocusIndicator focusPoint={focusPoint} animatedFocusStyle={animatedFocusStyle} />
          <ScannerFrame highlight={codeScannerHighlights[0]} layout={layout} scanFrame={scanFrame} />
        </SafeAreaView>
      </GestureDetector>

      <View style={styles.bottomContainer}>
        {codeMetadata && (
          <TouchableWithoutFeedback onPress={() => onResultTap(codeMetadata, codeType)}>
            <View style={styles.qrResultContainer}>
              <Ionicons name={iconName} size={18} color="black" />
              <ThemedText type='defaultSemiBold' numberOfLines={1} style={styles.qrResultText}>{codeValue}</ThemedText>
            </View>
          </TouchableWithoutFeedback>
        )}
        <ZoomControl
          zoom={zoom}
          minZoom={Number(minZoom.toFixed(2))}
          maxZoom={maxZoom}
        />
        <View style={styles.bottomButtonsContainer}>
          <ThemedButton
            iconName="images"
            iconColor="white"
            underlayColor='#fff'
            onPress={onOpenGallery}
            style={styles.bottomButton}
          />
          <ThemedButton
            iconName="settings"
            iconColor="white"
            underlayColor='#fff'
            onPress={handleExpandPress}
            style={styles.bottomButton}
          />
        </View>
      </View>

      <View style={styles.headerContainer}>
        <ThemedButton iconColor='#fff' style={styles.headerButton} onPress={() => router.back()} iconName="chevron-back" />
        <ThemedButton underlayColor='#fff' iconColor={torch === 'on' ? '#FFCC00' : '#fff'} style={styles.headerButton} onPress={toggleFlash} iconName={torch === 'on' ? 'flash' : 'flash-off'} />
      </View>
      <StatusBar barStyle="light-content" />
      <ThemedSettingSheet ref={bottomSheetRef} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    marginTop: STATUSBAR_HEIGHT,
    flex: 2.5,
    backgroundColor: 'black',
    borderRadius: 10,
    overflow: 'hidden',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  loaderText: {
    color: 'white',
    marginTop: 10,
  },
  headerContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 25,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  bottomContainer: {
    flex: 1,
  },
  qrResultContainer: {
    position: 'absolute',
    bottom: 240,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFCC00',
    borderRadius: 25,
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  qrResultText: {
    color: 'black',
    fontSize: 12,
    overflow: 'hidden',
    maxWidth: 200,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 10,
  },
  bottomButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 15,
    borderRadius: 50,
  },
});