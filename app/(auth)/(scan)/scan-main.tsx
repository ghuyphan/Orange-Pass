import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  Linking,
  SafeAreaView,
  StatusBar
} from 'react-native';
import {
  Camera,
  Code,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  CodeScannerFrame
} from 'react-native-vision-camera';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
  useAnimatedProps,
  SharedValue
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import ImagePicker from 'react-native-image-crop-picker';
import { Redirect, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { debounce, throttle } from 'lodash';

// Components
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ScannerFrame } from '@/components/camera/ScannerFrame';
import { FocusIndicator } from '@/components/camera/FocusIndicator';
import { ZoomControl } from '@/components/camera/ZoomControl';
import { ThemedView } from '@/components/ThemedView';
import ThemedSettingSheet from '@/components/bottomsheet/ThemedSettingSheet';
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';

// Constants and Utils
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { MAX_ZOOM_FACTOR } from '@/constants/Constants';
import { storage } from '@/utils/storage';
import { triggerLightHapticFeedback } from '@/utils/haptic';
import { decodeQR } from '@/utils/decodeQR';

// Hooks
import { useMMKVBoolean } from 'react-native-mmkv';
import useHandleCodeScanned from '@/hooks/useHandleCodeScanned';
import { useLocale } from '@/context/LocaleContext';

// Types
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { t } from '@/i18n';


const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({ zoom: true });

// Types
interface CameraHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ThemedSettingSheetMethods extends BottomSheetModal {
  presentSecondSheet: () => void;
  dismissSecondSheet: () => void;
  expandSecondSheet: () => void;
  collapseSecondSheet: () => void;
  closeSecondSheet: () => void;
  snapSecondSheetToIndex: (index: number) => void;
  snapSecondSheetToPosition: (position: string | number) => void;
  forceCloseSecondSheet: () => void;
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

const useFocusGesture = (cameraRef: React.RefObject<Camera>, zoom: SharedValue<number>) => {
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
  const { locale } = useLocale();
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);
  const { device, hasPermission, torch, toggleFlash } = useCameraSetup(cameraRef);

  //MMKV settings
  const [quickScan, setQuickScan] = useMMKVBoolean('quickScan', storage);
  const [showIndicator, setShowIndicator] = useMMKVBoolean('showIndicator', storage);
  const [autoBrightness, setAutoBrightness] = useMMKVBoolean('autoBrightness', storage);
  const bottomSheetModalRef = useRef<ThemedSettingSheetMethods>(null);

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
  }, [setQuickScan]);

  const toggleShowIndicator = useCallback(() => {
    setShowIndicator(prev => !!!prev);
    triggerLightHapticFeedback();
  }, [setShowIndicator])

  const toggleAutoBrightness = useCallback(() => {
    setAutoBrightness(prev => !!!prev);
    triggerLightHapticFeedback();
  }, [setAutoBrightness]);

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
  const [iconName, setIconName] = useState<keyof typeof MaterialIcons.glyphMap>('explore');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);

  const handleCodeScanned = useHandleCodeScanned();


  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 2500);
  };

  // const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const handleExpandPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);


  const handleOpenSecondSheet = () => {
    if (bottomSheetModalRef.current) {
      bottomSheetModalRef.current.presentSecondSheet();
    }
  };

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  useUnmountBrightness(0.8, true);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'code-39', 'ean-13', 'ean-8', 'upc-a', 'upc-e', 'data-matrix'],
    onCodeScanned: (codes: Code[], frame: CodeScannerFrame) => {
      if (isConnecting || frameCounterRef.current++ % 4 !== 0) return;

      setScanFrame(frame);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (codes.length > 0) {
        const firstCode = codes[0];
        const { value, frame: codeFrame } = firstCode;


        setCodeMetadata(value ?? '');

        if (showIndicator) {
          setCodeScannerHighlights([{
            height: codeFrame?.height ?? 0,
            width: codeFrame?.width ?? 0,
            x: codeFrame?.x ?? 0,
            y: codeFrame?.y ?? 0,
          }]);

          timeoutRef.current = setTimeout(() => {
            setCodeScannerHighlights([]);
          }, 2000);
        } else {
          setCodeScannerHighlights([]);
        }

        const result = handleCodeScanned(value ?? '', {
          quickScan,
          t,
          setIsConnecting,
        });
        setCodeType(result.codeType);
        setIconName(result.iconName);
        setCodeValue(result.codeValue);

      } else {
        console.log('No codes found');
        setIsConnecting(false);
        setCodeType('');
        setCodeValue('');
        setCodeScannerHighlights([]);
        setCodeMetadata('');
      }
    },
  });

  const onOpenGallery = useCallback(async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 300,
        height: 400,
        includeBase64: true,
        mediaType: 'photo',
      });

      if (!image.path) {
        return;
      }

      // decodeQRCode(image.path);
      const decode = await decodeQR(image.path);

      const result = handleCodeScanned(decode?.value ?? '', {
        quickScan,
        codeFormat: decode?.format,
        t,
        setIsConnecting,
      });


      if (result && result.codeFormat !== undefined) {
        onNavigateToAddScreen(result.codeFormat, result.codeValue);
      } else {
        // console.log('Failed to decode QR code');
        showToast('Failed to decode QR code');
      }

    } catch (error) {
      console.log('Error opening image picker:', error);
    } finally {

    }
  }, []);

  const onNavigateToAddScreen = useCallback(
    throttle((codeType: number, codeValue: string) => {
      router.push({
        pathname: `/(auth)/(add)/add-new`,
        params: {
          codeType: codeType,
          codeValue: codeValue
        },
      });
    }, 1000),
    []
  );

  // Utility function for showing toast messages

  useEffect(() => {
    return () => {
      timeoutRef.current && clearTimeout(timeoutRef.current);
    };
  }, []);

  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  useEffect(() => {
    if (codeMetadata.length > 0) {

      opacity.value = withTiming(1, { duration: 300 });

    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [codeMetadata, opacity]);


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
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [device, cameraOpacity]);

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
          <ScannerFrame highlight={codeScannerHighlights[0]} layout={layout} scanFrame={scanFrame} />
          {codeMetadata && quickScan === false ? (
            <Animated.View style={[styles.qrResult, animatedStyle]}>
              <TouchableWithoutFeedback
                onPress={() => onResultTap(codeMetadata, codeType)}
              >
                <View style={styles.qrResultContainer}>
                  <MaterialIcons name={iconName} size={18} color="black" />
                  <ThemedText type='defaultSemiBold' numberOfLines={1} style={styles.qrResultText}>{codeValue}</ThemedText>
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          ) : null}
        </SafeAreaView>
      </GestureDetector>

      <View style={styles.bottomContainer}>

        <View style={styles.zoomControlContainer}>
          <ZoomControl
            zoom={zoom}
            minZoom={Number(minZoom.toFixed(2))}
            maxZoom={maxZoom}
          />
        </View>

        <View style={styles.bottomButtonsContainer}>
          <ThemedButton
            iconName="image"
            iconColor="white"
            underlayColor='#fff'
            onPress={onOpenGallery}
            style={styles.bottomButton}
            loading={isDecoding}
            loadingColor='#fff'
          />
          <ThemedButton
            iconName="cog"
            iconColor="white"
            underlayColor='#fff'
            onPress={handleExpandPress}
            style={styles.bottomButton}
          />
        </View>
      </View>

      <View style={styles.headerContainer}>
        <ThemedButton iconColor='#fff' style={styles.headerButton} onPress={() => router.back()} iconName="chevron-left" />
        <ThemedButton underlayColor='#fff' iconColor={torch === 'on' ? '#FFCC00' : '#fff'} style={styles.headerButton} onPress={toggleFlash} iconName={torch === 'on' ? 'flash' : 'flash-off'} />
      </View>
      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
      />
      <StatusBar barStyle="light-content" />
      <ThemedSettingSheet
        ref={bottomSheetModalRef}
        setting1Text='Quick Scan Mode'
        setting1Description='Automatically scan for QR codes and barcodes.'
        setting1Value={quickScan}
        onSetting1Press={toggleQuickScan}
        setting2Text='Animate Scan Indicator'
        setting2Description='Animate the scanner indicator when scanning. Turn it off to improve performance.'
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
    marginTop: STATUSBAR_HEIGHT + 10,
    flex: 2.5,
    backgroundColor: 'black',
    borderRadius: 16,
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
    top: STATUSBAR_HEIGHT + 45,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bottomContainer: {
    // flex: 1, // Remove this line
    height: 250, // Set a fixed height if needed
  },
  qrResult: {
    position: 'absolute',
    bottom: 15,
    alignItems: 'center',
    alignSelf: 'center',
  },

  qrResultContainer: {
    position: 'absolute',
    bottom: 0,
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
  zoomControlContainer: {
    position: 'absolute',
    bottom: 10, // Adjust this value as needed
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 95, // Adjust if necessary
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 10,
  },
  bottomButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 50,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 35,
    left: 15,
    right: 15,
  },
});