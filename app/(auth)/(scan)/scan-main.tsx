import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  LayoutChangeEvent,
  Linking,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Camera,
  useCodeScanner,
} from 'react-native-vision-camera';

import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedProps,
} from 'react-native-reanimated';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import ImagePicker from 'react-native-image-crop-picker';
import { Redirect, useRouter } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';
import { throttle } from 'lodash';
import BottomSheet from '@gorhom/bottom-sheet';

// Types
import { t } from '@/i18n';

// Constants and Utils
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { MAX_ZOOM_FACTOR } from '@/constants/Constants';
import { storage } from '@/utils/storage';
import { triggerLightHapticFeedback } from '@/utils/haptic';
import { decodeQR } from '@/utils/decodeQR';

// Components
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ScannerFrame } from '@/components/camera/ScannerFrame';
import { FocusIndicator } from '@/components/camera/FocusIndicator';
import { ZoomControl } from '@/components/camera/ZoomControl';
import { QRResult } from '@/components/camera/CodeResult';
import { ThemedView } from '@/components/ThemedView';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
import ThemedSettingSheet from '@/components/bottomsheet/ThemedSettingSheet';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';

// Hooks
import { useMMKVBoolean } from 'react-native-mmkv';
import useHandleCodeScanned from '@/hooks/useHandleCodeScanned';
import { useLocale } from '@/context/LocaleContext';
import { useCameraScanner } from '@/hooks/useCameraScanner';
import { useCameraSetup } from '@/hooks/useCameraSetup';
import { useFocusGesture } from '@/hooks/useFocusGesture';
import { width } from '@/constants/Constants';



const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({ zoom: true });

// Main component
export default function ScanScreen() {
  // 1. Context and Navigation
  const { locale } = useLocale();
  const router = useRouter();

  // 2. Camera Ref and Setup
  const cameraRef = useRef<Camera>(null);
  const { device, hasPermission, torch, toggleFlash } = useCameraSetup(cameraRef);

  // 3. Camera Zoom
  const zoom = useSharedValue(1);
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR);

  const cameraAnimatedProps = useAnimatedProps(() => ({
    zoom: Math.max(Math.min(zoom.value, maxZoom), minZoom),
  }), [maxZoom, minZoom, zoom]);

  // 4. Focus Gesture
  const { gesture, focusPoint, animatedFocusStyle } = useFocusGesture(cameraRef, zoom);

  // 5. Camera Scanner
  const {
    scanFrame,
    codeScannerHighlights,
    codeMetadata,
    codeValue,
    codeType,
    iconName,
    quickScan,
    showIndicator,
    toggleQuickScan,
    toggleShowIndicator,
    createCodeScannerCallback,
  } = useCameraScanner();

  // 6. Auto Brightness
  const [autoBrightness, setAutoBrightness] = useMMKVBoolean('autoBrightness', storage); // Assuming 'storage' is defined elsewhere

  useEffect(() => {
    if (autoBrightness === undefined) {
      setAutoBrightness(true);
    }
  }, [setAutoBrightness, autoBrightness]);

  const toggleAutoBrightness = useCallback(() => {
    setAutoBrightness(prev => !prev); // Simplified boolean toggle
    triggerLightHapticFeedback();
  }, [setAutoBrightness]);

  // 7. Layout and Timeout
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);


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

  const bottomSheetRef = useRef<BottomSheet>(null);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const handleExpandPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);


  const handleOpenSecondSheet = () => {
    if (bottomSheetModalRef.current) {
      bottomSheetModalRef.current.presentSecondSheet();
    }
  };

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  useUnmountBrightness(1, true);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'code-39', 'ean-13', 'ean-8', 'upc-a', 'upc-e', 'data-matrix'],
    onCodeScanned: createCodeScannerCallback,
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

      <SafeAreaView style={styles.cameraContainer}>
        <GestureDetector gesture={gesture}>
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
        </GestureDetector>
        <FocusIndicator focusPoint={focusPoint} animatedFocusStyle={animatedFocusStyle} />
        <ScannerFrame highlight={codeScannerHighlights[0]} layout={layout} scanFrame={scanFrame} />
        <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0 }}>
          {codeMetadata && quickScan === false ? (

            <QRResult
              codeValue={codeValue}
              codeType={codeType}
              iconName={iconName}
              animatedStyle={animatedStyle}
            />
          ) : null}
        </View>
      </SafeAreaView>


      <View style={styles.bottomContainer}>
        <View style={{ flexDirection: 'column', alignItems: 'center', paddingTop: 20, }}>

          <View style={styles.zoomControlContainer}>
            <ZoomControl
              zoom={zoom}
              minZoom={Number(minZoom.toFixed(2))}
              maxZoom={maxZoom}
            />
          </View>
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
      {/* <ThemedSettingSheet
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
      /> */}
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={t('homeScreen.manage')}
        // snapPoints={['25%']}}
        enableDynamicSizing={true}
        // actions={[
        //   {
        //     icon: 'pencil-outline',
        //     iconLibrary: 'MaterialCommunityIcons',
        //     text: t('homeScreen.edit'),
        //     onPress: () => bottomSheetRef.current?.close(),
        //   },
        //   {
        //     icon: 'delete-outline',
        //     iconLibrary: 'MaterialCommunityIcons',
        //     text: t('homeScreen.delete'),
        //     onPress: () => {},
        //   }
        // ]}
        contentType='scroll'
        customContent={
          <View style={{ flex: 1, backgroundColor: 'black' }} />
        }
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
    flex: 1.75,
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
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center'
  },
  zoomControlContainer: {
    alignItems: 'center',
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: width * 0.8,
    flexGrow: 0.8,

    // marginTop: 15,
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