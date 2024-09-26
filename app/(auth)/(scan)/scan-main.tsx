import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableWithoutFeedback, LayoutChangeEvent, Linking, SafeAreaView, StatusBar } from 'react-native';
import { Camera, Code, useCameraDevice, useCameraPermission, useCodeScanner, CodeScannerFrame } from 'react-native-vision-camera';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, useAnimatedProps } from 'react-native-reanimated';
import {
  useUnmountBrightness,
  setBrightnessLevel
} from '@reeq/react-native-device-brightness';
import ImagePicker from 'react-native-image-crop-picker';
import { Redirect, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { MAX_ZOOM_FACTOR } from '@/constants/Constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { debounce } from 'lodash';
import { storage } from '@/utils/storage';

import { ScannerFrame, FocusIndicator, ZoomControl } from '@/components/camera';
import { ThemedView } from '@/components/ThemedView';
import BottomSheet from '@gorhom/bottom-sheet';
import ThemedSettingSheet from '@/components/bottomsheet/ThemedSettingSheet';
import { useMMKVBoolean } from 'react-native-mmkv';
import { triggerLightHapticFeedback } from '@/utils/haptic';
import useHandleCodeScanned from '@/hooks/useHandleCodeScanned'; // Import the custom hook

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({ zoom: true });

// Types
interface CameraHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Custom hooks
const useCameraSetup = (cameraRef: React.RefObject<Camera>) => {
  const device = useCameraDevice('back');
  const { hasPermission } = useCameraPermission();
  const [torch, setTorch] = useState<'off' | 'on'>('off');

  const toggleFlash = useCallback(() => {
    if (device?.hasFlash) {
      setTorch(prevTorch => (prevTorch === 'off' ? 'on' : 'off'));
    } else {
      console.warn('This device does not have a flash');
    }
  }, [device?.hasFlash]);

  return { device, hasPermission, torch, toggleFlash };
};

const useFocusGesture = (cameraRef: React.RefObject<Camera>, zoom: Reanimated.SharedValue<number>) => {
  const [focusPoint, setFocusPoint] = useState<null | { x: number; y: number }>(null);
  const focusOpacity = useSharedValue(0);
  const FOCUS_DEBOUNCE_MS = 50;

  const debouncedFocus = useCallback(
    debounce((point: { x: number; y: number }) => {
      if (!cameraRef.current) {
        console.warn('Camera not ready yet.');
        return;
      }
      runOnJS(setFocusPoint)(point);
      focusOpacity.value = 1;

      const adjustedPoint = {
        x: point.x / zoom.value,
        y: point.y / zoom.value,
      };

      cameraRef.current.focus(adjustedPoint)
        .then(() => console.log('Focus successful'))
        .catch(error => console.error('Focus failed:', error));

      focusOpacity.value = withTiming(0, { duration: 300 });
    }, FOCUS_DEBOUNCE_MS),
    [zoom.value]
  );

  const gesture = useMemo(
    () => Gesture.Tap().onEnd(({ x, y }) => {
      runOnJS(debouncedFocus)({ x, y });
    }),
    [debouncedFocus]
  );

  const animatedFocusStyle = useAnimatedStyle(() => ({
    opacity: focusOpacity.value,
    transform: [{ scale: withSpring(focusOpacity.value ? 1 : 0.5) }],
  }));

  useEffect(() => () => {
    debouncedFocus.cancel();
  }, [debouncedFocus]);

  return { gesture, focusPoint, animatedFocusStyle };
};

// Main component
export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);
  const { device, hasPermission, torch, toggleFlash } = useCameraSetup(cameraRef);

  //MMKV settings
  const [quickScan, setQuickScan] = useMMKVBoolean('quickScan', storage);
  const [showIndicator, setShowIndicator] = useMMKVBoolean('showIndicator', storage);
  const [autoBrightness, setAutoBrightness] = useMMKVBoolean('autoBrightness', storage);

  useEffect(() => {
    if (showIndicator === undefined) {
      setShowIndicator(true);
    }
  }, [setShowIndicator, showIndicator]);

  useEffect(() => {
    if (autoBrightness === undefined) {
      setAutoBrightness(true);
    }
  }, [setAutoBrightness, autoBrightness]);

  const toggleQuickScan = useCallback(() => {
    setQuickScan(prev => !!!prev);
    triggerLightHapticFeedback();
  }, []);

  const toggleShowIndicator = useCallback(() => {
    setShowIndicator(prev => !!!prev);
    triggerLightHapticFeedback();
  }, [])

  const toggleAutoBrightness = useCallback(() => {
    setAutoBrightness(prev => !!!prev);
    triggerLightHapticFeedback();
  }, [])

  const zoom = useSharedValue(1);
  const { gesture, focusPoint, animatedFocusStyle } = useFocusGesture(cameraRef, zoom);
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR);

  const cameraAnimatedProps = useAnimatedProps(() => ({
    zoom: Math.max(Math.min(zoom.value, maxZoom), minZoom),
  }), [maxZoom, minZoom, zoom]);

  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameCounterRef = useRef(0);
  const [scanFrame, setScanFrame] = useState<CodeScannerFrame>({ height: 1, width: 1 });
  const [codeScannerHighlights, setCodeScannerHighlights] = useState<CameraHighlight[]>([]);
  const [codeMetadata, setCodeMetadata] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [codeType, setCodeType] = useState('');
  const [iconName, setIconName] = useState<keyof typeof Ionicons.glyphMap>('compass');
  const [isConnecting, setIsConnecting] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const handleExpandPress = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  useUnmountBrightness(0.8, true);

  const handleCodeScanned = useCallback(
    useHandleCodeScanned({
      isConnecting,
      quickScan,
      setCodeType,
      setIconName,
      setCodeValue,
      setIsConnecting,
    }),
    [isConnecting, quickScan, setCodeType, setIconName, setCodeValue, setIsConnecting]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'code-39', 'ean-13', 'ean-8', 'upc-a', 'upc-e', 'data-matrix'],
    onCodeScanned: (codes: Code[], frame: CodeScannerFrame) => {
      frameCounterRef.current++;
      if (isConnecting) return; // Stop scanning if already connecting

      // Process every 4th frame (adjust frame skip logic here as needed)
      if (frameCounterRef.current % 3 === 0) {
        setScanFrame(frame);

        // Clear previous timeout to prevent stale highlights
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        if (codes.length > 0) {
          const firstCode = codes[0];

          // Update metadata
          setCodeMetadata(firstCode.value ?? '');

          // Conditionally set the scanner highlights if showIndicator is true
          if (showIndicator) {
            setCodeScannerHighlights([{
              height: firstCode.frame?.height ?? 0,
              width: firstCode.frame?.width ?? 0,
              x: firstCode.frame?.x ?? 0,
              y: firstCode.frame?.y ?? 0,
            }]);

            // Reset highlights and metadata only if the indicator is shown
            timeoutRef.current = setTimeout(() => {
              setCodeScannerHighlights([]);
              setCodeMetadata('');
              setCodeType('');
              setCodeValue('');
            }, 1000);
          }
          // Only call handleCodeScanned if not already connecting
          handleCodeScanned(firstCode.value ?? '');

        } else {
          // No codes found, clear the timeout and reset states
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setIsConnecting(false); // Reset the connection flag
          setCodeType('');
          setCodeValue('');
          setCodeScannerHighlights([]);
          setCodeMetadata('');
        }
      }
    },
  });

  const onOpenGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.openPicker({
        width: 300,
        height: 400,
        includeBase64: true,
      });
      if (result) {
        const base64Data = result;
        const imageUri = `data:${result.mime};base64,${base64Data}`;
        // Process the image data here
      }
    } catch (error) {
      console.log('Error opening image picker:', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      timeoutRef.current && clearTimeout(timeoutRef.current);
    };
  }, []);

  const onResultTap = useCallback((url: string, codeType: string) => {
    switch (codeType) {
      case 'URL':
        Linking.openURL(url);
        break;
      case 'WIFI':
        console.log(url);
        break;
    }
  }, []);

  const cameraOpacity = useSharedValue(0);
  const animatedCameraStyle = useAnimatedStyle(() => ({
    opacity: withTiming(cameraOpacity.value, { duration: 500 }),
  }));

  useEffect(() => {
    if (device) {
      const timeout = setTimeout(() => {
        cameraOpacity.value = 1;
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
          <Reanimated.View style={[StyleSheet.absoluteFill, animatedCameraStyle]}>
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
          </Reanimated.View>
          <FocusIndicator focusPoint={focusPoint} animatedFocusStyle={animatedFocusStyle} />
          {showIndicator == true ? <ScannerFrame highlight={codeScannerHighlights[0]} layout={layout} scanFrame={scanFrame} /> : null}
        </SafeAreaView>
      </GestureDetector>

      <View style={styles.bottomContainer}>
        {codeMetadata && quickScan === false ? (
          <TouchableWithoutFeedback onPress={() => onResultTap(codeMetadata, codeType)}>
            <View style={styles.qrResultContainer}>
              <Ionicons name={iconName} size={18} color="black" />
              <ThemedText type='defaultSemiBold' numberOfLines={1} style={styles.qrResultText}>{codeValue}</ThemedText>
            </View>
          </TouchableWithoutFeedback>
        ) : null}
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
      <ThemedSettingSheet
        ref={bottomSheetRef}
        setting1Text='Quick Scan Mode'
        setting1Description='Automatically scan for QR codes and barcodes.'
        setting1Value={quickScan}
        onSetting1Press={toggleQuickScan}
        setting2Text='Show Scan Indicator'
        setting2Description='Show a visual indicator at the scan point. Turn this on if your devices is fast'
        setting2Value={showIndicator}
        onSetting2Press={toggleShowIndicator}
        setting3Text='High Brightness'
        setting3Description='Automatically turn up screen brightness to improve visibility.'
        setting3Value={autoBrightness}
        onSetting3Press={toggleAutoBrightness}
      />
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
    bottom: 260,
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