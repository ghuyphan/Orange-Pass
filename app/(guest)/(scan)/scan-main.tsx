// src/screens/(guest)/scan.tsx

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  Suspense,
} from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  AppState,
  PermissionsAndroid,
  LayoutChangeEvent,
  TouchableWithoutFeedback
} from "react-native";
import { Camera, useCodeScanner } from "react-native-vision-camera";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedProps,
} from "react-native-reanimated";
import { useUnmountBrightness } from "@reeq/react-native-device-brightness";
import { Redirect, useRouter } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import { throttle } from "lodash";
import BottomSheet from "@gorhom/bottom-sheet";

// Local imports
import { t } from "@/i18n";
import { STATUSBAR_HEIGHT } from "@/constants/Statusbar";
import { MAX_ZOOM_FACTOR, width } from "@/constants/Constants";
import { triggerLightHapticFeedback } from "@/utils/haptic";
import SheetType from "@/types/sheetType";

// Components
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ScannerFrame } from "@/components/camera/ScannerFrame";
import { FocusIndicator } from "@/components/camera/FocusIndicator";
import {
  ZoomControl,
  ZoomControlHandle,
} from "@/components/camera/ZoomControl";
import { QRResult } from "@/components/camera/CodeResult";
import { ThemedView } from "@/components/ThemedView";
import { ThemedStatusToast } from "@/components/toast/ThemedStatusToast";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import WifiSheetContent from "@/components/bottomsheet/WifiSheetContent";
import LinkingSheetContent from "@/components/bottomsheet/LinkingSheetContent";
import ScanSettingsSheetContent from "@/components/bottomsheet/ScanSettingsSheetContent";

// Hooks
import { useLocale } from "@/context/LocaleContext";
import { useCameraScanner } from "@/hooks/useCameraScanner";
import { useCameraSetup } from "@/hooks/useCameraSetup";
import { useCameraGestures } from "@/hooks/useCameraGestures";
import { useGalleryPicker } from "@/hooks/useGalleryPicker";
import { getResponsiveHeight, getResponsiveWidth } from "@/utils/responsive";
import { ThemedDualButton } from "@/components/buttons/ThemedDualButton";

// Create animated camera component
const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({ zoom: true });

export default function GuestScanScreen() {
  // Context and Navigation
  const { locale } = useLocale();
  const router = useRouter();
  const isMounted = useRef(true);

  // Camera Ref and Setup
  const cameraRef = useRef<Camera>(null as unknown as Camera);
  const zoomControlRef = useRef<ZoomControlHandle>(null);
  const [setupCamera, setSetupCamera] = useState(false);
  const { device, hasPermission, torch, toggleFlash } =
    useCameraSetup(cameraRef);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [allPermissionsGranted, setAllPermissionsGranted] = useState<
    boolean | null
  >(null);

  const zoom = useSharedValue(1);
  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_ZOOM_FACTOR);

  const cameraAnimatedProps = useAnimatedProps(
    () => ({
      zoom: Math.max(Math.min(zoom.value, maxZoom), minZoom),
    }),
    [maxZoom, minZoom, zoom]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setSetupCamera(true);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      isMounted.current = false;
    };
  }, []);

  const { gesture, animatedFocusStyle } = useCameraGestures(
    cameraRef,
    zoom,
    minZoom,
    maxZoom,
    zoomControlRef
  );

  const {
    scanFrame,
    codeScannerHighlights,
    codeMetadata,
    codeValue,
    codeType,
    iconName,
    showIndicator,
    toggleShowIndicator,
    createCodeScannerCallback,
  } = useCameraScanner();

  const [layout, setLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [cameraIsActive, setCameraIsActive] = useState(true);
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [linkingUrl, setLinkingUrl] = useState<string | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState<string | null>(null);
  const [wifiIsWep, setWifiIsWep] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        setIsToastVisible(false);
      }
    }, 2500);
    return timeoutId;
  }, []);

  useEffect(() => {
    let toastTimeoutId: number | null = null;
    return () => {
      if (toastTimeoutId) clearTimeout(toastTimeoutId);
    };
  }, []);

  useEffect(() => {
    if (codeValue && sheetType) {
      bottomSheetRef.current?.close();
    }
  }, [codeValue, sheetType]);

  useEffect(() => {
    if (codeValue) {
      triggerLightHapticFeedback();
    }
  }, [codeValue]);

  const handleBackgroundTap = useCallback(() => {
    // The deactivateSlider function is safe to call even if the slider is closed,
    // as it has an internal check.
    zoomControlRef.current?.deactivateSlider();
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  useUnmountBrightness(1, true);

  const codeScanner = useCodeScanner({
    codeTypes: [
      "qr",
      "code-128",
      "code-39",
      "ean-13",
      "ean-8",
      "upc-a",
      "upc-e",
      "data-matrix",
    ],
    onCodeScanned: createCodeScannerCallback,
  });

  const onNavigateToAddScreen = useCallback(
    throttle(
      (codeFormat, codeValue, bin, codeType, codeProvider) => {
        if (isMounted.current) {
          router.push({
            pathname: `/(guest)/add-guest`,
            params: {
              codeFormat,
              codeValue,
              codeBin: bin,
              codeType,
              codeProvider,
            },
          });
        }
      },
      1000,
      { leading: true, trailing: false }
    ),
    [router]
  );

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setSheetType(null);
      }
    },
    [setSheetType]
  );

  const onOpenSheet = useCallback(
    (
      type: SheetType,
      id?: string,
      url?: string,
      ssid?: string,
      pass?: string,
      isWep?: boolean,
      isHidden?: boolean
    ) => {
      if (type === null) return;
      setSheetType(type);
      if (url) setLinkingUrl(url);
      if (ssid) setWifiSsid(ssid);
      if (pass) setWifiPassword(pass);
      if (isWep !== undefined) setWifiIsWep(isWep);
      bottomSheetRef.current?.snapToIndex(0);
    },
    []
  );

  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  const renderSheetContent = useCallback(() => {
    if (!sheetType) return null;

    switch (sheetType) {
      case "wifi":
        return (
          <WifiSheetContent
            ssid={wifiSsid || ""}
            password={wifiPassword || ""}
            isWep={wifiIsWep}
            isHidden={false}
          />
        );
      case "linking":
        return (
          <LinkingSheetContent
            url={linkingUrl || ""}
            onCopySuccess={() => showToast(t("scanScreen.copied"))}
          />
        );
      case "setting":
        return (
          <ScanSettingsSheetContent
            showIndicator={showIndicator}
            onToggleShowIndicator={toggleShowIndicator}
            onNavigateToSettings={() => router.push("/settings")}
          />
        );
      default:
        return null;
    }
  }, [
    sheetType,
    wifiSsid,
    wifiPassword,
    wifiIsWep,
    linkingUrl,
    showIndicator,
    toggleShowIndicator,
    router,
    showToast,
  ]);

  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (codeMetadata.length > 0) {
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [codeMetadata, opacity]);

  const cameraOpacity = useSharedValue(0);
  const animatedCameraStyle = useAnimatedStyle(() => ({
    opacity: withTiming(cameraOpacity.value, { duration: 500 }),
  }));

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      const isActive = nextAppState === "active";
      setCameraIsActive(isActive);

      if (isActive) {
        zoom.value = 1;
        zoomControlRef.current?.deactivateSlider();
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [zoom]);

  useEffect(() => {
    if (device && setupCamera) {
      const timeout = setTimeout(() => {
        if (isMounted.current) {
          cameraOpacity.value = 1;
          setIsCameraReady(true);
        }
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [device, cameraOpacity, setupCamera]);

  const checkAllPermissions = async () => {
    try {
      if (!hasPermission) return false;

      const hasFineLocationPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      const hasCoarseLocationPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );

      return hasFineLocationPermission && hasCoarseLocationPermission;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  };

  const requestPermissions = useCallback(async () => {
    try {
      const cameraStatus = await Camera.requestCameraPermission();
      const locationStatus = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      return (
        cameraStatus === "granted" &&
        locationStatus["android.permission.ACCESS_FINE_LOCATION"] ===
        "granted" &&
        locationStatus["android.permission.ACCESS_COARSE_LOCATION"] ===
        "granted"
      );
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    const verifyPermissions = async () => {
      const permissionsGranted = await checkAllPermissions();

      if (!permissionsGranted) {
        const result = await requestPermissions();
        setAllPermissionsGranted(result);
      } else {
        setAllPermissionsGranted(true);
      }
    };

    verifyPermissions();
  }, [requestPermissions]);

  useEffect(() => {
    return () => {
      setWifiPassword(null);
      setLinkingUrl(null);
    };
  }, []);

  if (allPermissionsGranted === false) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Redirect href="/(guest)/(scan)/permission" />
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

  const calculatedTitle =
    sheetType === "setting"
      ? t("scanScreen.settings")
      : sheetType === "wifi"
        ? t("scanScreen.wifi")
        : sheetType === "linking"
          ? t("scanScreen.linking")
          : t("scanScreen.settings");

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.cameraContainer}>
        <GestureDetector gesture={gesture}>
          <Reanimated.View
            onLayout={onLayout}
            style={[StyleSheet.absoluteFill, animatedCameraStyle]}
          >
            {isCameraReady ? (
              <>
                <ReanimatedCamera
                  ref={cameraRef}
                  torch={torch}
                  style={StyleSheet.absoluteFill}
                  device={device}
                  isActive={cameraIsActive}
                  codeScanner={codeScanner}
                  resizeMode="cover"
                  videoStabilizationMode="auto"
                  animatedProps={cameraAnimatedProps}
                />
                <View>
                  <FocusIndicator animatedFocusStyle={animatedFocusStyle} />
                  {showIndicator && (
                    <ScannerFrame
                      highlight={codeScannerHighlights[0]}
                      layout={layout}
                      scanFrame={scanFrame}
                    />
                  )}
                </View>
              </>
            ) : (
              <View style={styles.cameraFallback}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.cameraFallbackText}>
                  {t("scanScreen.cameraLoading")}
                </Text>
              </View>
            )}
          </Reanimated.View>
        </GestureDetector>
        <View style={styles.qrResultContainer}>
          {codeMetadata.length > 0 && (
            <QRResult
              codeValue={codeValue}
              animatedStyle={animatedStyle}
              onNavigateToAdd={onNavigateToAddScreen}
            />
          )}
        </View>
        {device && (
          <View style={styles.zoomControlContainer}>
            <ZoomControl
              ref={zoomControlRef}
              zoom={zoom}
              minZoom={Number(minZoom.toFixed(2))}
              maxZoom={maxZoom}
            />
          </View>
        )}
      </SafeAreaView>

      <View style={styles.bottomContainer}>
        <TouchableWithoutFeedback
          onPress={handleBackgroundTap}
        >
          <View style={styles.bottomButtonsContainer}>
            <ThemedButton
              iconName="image"
              iconColor="white"
              onPress={onOpenGallery}
              style={styles.bottomButton}
              loading={isDecoding}
              loadingColor="#fff"
              variant="glass"
            />
            <ThemedButton
              iconName="history"
              iconColor="white"
              // Navigate to a new history screen
              // onPress={() => router.push("/(guest)/scan/history")}
              onPress={() => { }}
              style={styles.bottomButton}
              variant="glass"
            />
          </View>
        </TouchableWithoutFeedback>
      </View>

      <View style={styles.headerContainer}>
        <ThemedButton
          iconColor="#fff"
          style={styles.headerButton}
          onPress={() => router.back()}
          iconName="chevron-left"
          variant="glass"
        />
        <ThemedDualButton
          variant="glass"
          style={styles.headerButton}
          iconColor="#fff"
          rightIconColor={torch === "on" ? "#FFCC00" : "#fff"}
          leftIconColor={showIndicator ? "#FFCC00" : "#fff"}
          leftButton={{
            iconName: "scan-helper",
            onPress: toggleShowIndicator,
            isSlashed: !showIndicator,
          }}
          rightButton={{
            iconName: "flash",
            onPress: toggleFlash,
            isSlashed: torch === "off",
          }}
        />
      </View>

      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
      />

      {isCameraReady && (
        <Suspense fallback={null}>
          <ThemedReuseableSheet
            ref={bottomSheetRef}
            title={calculatedTitle}
            onChange={handleSheetChange}
            snapPoints={
              sheetType === "setting"
                ? ["35%"]
                : sheetType === "wifi"
                  ? wifiPassword
                    ? ["45%"]
                    : ["38%"]
                  : sheetType === "linking"
                    ? ["35%"]
                    : ["35%"]
            }
            styles={{
              customContent: {
                marginHorizontal: getResponsiveWidth(3.6),
              },
            }}
            customContent={
              <View style={styles.sheetContentContainer}>
                {renderSheetContent()}
              </View>
            }
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  cameraContainer: {
    marginTop: STATUSBAR_HEIGHT + getResponsiveHeight(11),
    flex: getResponsiveHeight(0.35),
    backgroundColor: "black",
    overflow: "hidden",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  loaderText: {
    color: "white",
    marginTop: 10,
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  cameraFallbackText: {
    color: "white",
    marginTop: 10,
  },
  headerContainer: {
    position: "absolute",
    top: STATUSBAR_HEIGHT + getResponsiveHeight(4.5),
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  headerButton: {
    marginHorizontal: 15,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  bottomContainer: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
  },
  zoomControlContainer: {
    alignItems: "center",
    position: "absolute",
    bottom: 10,
    right: 0,
    left: 0,
  },
  qrResultContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
  },
  bottomButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: width * 0.7,
    flexGrow: 1,
  },
  bottomButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 15,
    borderRadius: 50,
  },
  toastContainer: {
    position: "absolute",
    bottom: 35,
    left: 15,
    right: 15,
  },
  sheetContentContainer: {
    flex: 1,
  },
});