import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  View,
  FlatList,
  InteractionManager,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { throttle } from "lodash";
import BottomSheet from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

// Types, constants, services, hooks, and components
import QRRecord from "@/types/qrType";
import { height } from "@/constants/Constants";
import { RootState } from "@/store/rootReducer";
import { setQrData } from "@/store/reducers/qrSlice";
import { useThemeColor } from "@/hooks/useThemeColor";
import { triggerHapticFeedback } from "@/utils/haptic";
import { useGalleryPicker } from "@/hooks/useGalleryPicker";
import SheetType from "@/types/sheetType";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemedFAB } from "@/components/buttons";
import { ThemedButton } from "@/components/buttons";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import ThemedCardItem from "@/components/cards/ThemedCardItem";
import {
  ThemedFilterSkeleton,
  ThemedCardSkeleton,
} from "@/components/skeletons";
import { ThemedStatusToast } from "@/components/toast/ThemedStatusToast";
import ThemedBottomToast from "@/components/toast/ThemedBottomToast";
import { ThemedTopToast } from "@/components/toast/ThemedTopToast";
import { ThemedModal } from "@/components/modals/ThemedIconModal";
import ThemedFilter from "@/components/ThemedFilter";
import EmptyListItem from "@/components/lists/EmptyListItem";
import LinkingSheetContent from "@/components/bottomsheet/LinkingSheetContent";
import SettingSheetContent from "@/components/bottomsheet/SettingSheetContent";
import WifiSheetContent from "@/components/bottomsheet/WifiSheetContent";
import {
  getResponsiveHeight,
  getResponsiveWidth,
  getResponsiveFontSize,
} from "@/utils/responsive";
import { t } from "@/i18n";
import { deleteQrCode, updateQrIndexes } from "@/services/localDB/qrDB";

const GUEST_USER_ID = ""; // Consistent with AuthService

function GuestHomeScreen() {
  // Redux and Context
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const guestUser = useSelector((state: RootState) => state.auth.user);

  // --- FIX: Add local state for the list's UI ---
  const [localQrData, setLocalQrData] = useState<QRRecord[]>(qrData);

  // Theme and Appearance
  const color = useThemeColor({ light: "#3A2E24", dark: "#FFF5E1" }, "text");

  // Loading and Syncing
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Kept for delete operation
  // --- FIX: isEmpty now depends on the local state for immediate UI feedback ---
  const isEmpty = useMemo(() => localQrData.length === 0, [localQrData]);
  const [initialAnimationsDone, setInitialAnimationsDone] = useState(false);

  // UI State
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastColor, setBottomToastColor] = useState("");
  const [bottomToastIcon, setBottomToastIcon] = useState("");
  const [bottomToastMessage, setBottomToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [linkingUrl, setLinkingUrl] = useState<string | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState<string | null>(null);
  const [wifiIsWep, setWifiIsWep] = useState(false);
  const [wifiIsHidden, setWifiIsHidden] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Refs
  const flatListRef = useRef<FlatList<QRRecord> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const timeoutRefs = useRef<{
    [key: string]: ReturnType<typeof setTimeout> | null;
  }>({
    processing: null,
    edit: null,
    delete: null,
    network: null,
  });

  // Shared Values (Reanimated)
  const scrollY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const isSheetOpen = useSharedValue(false);
  const isEmptyShared = useSharedValue(localQrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350);
  const listOpacity = useSharedValue(0);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // --- FIX: Keep local state in sync with Redux for external changes (e.g., add/delete) ---
  useEffect(() => {
    setLocalQrData(qrData);
  }, [qrData]);

  // --- FIX: This new useEffect handles persisting the changes in the background ---
  useEffect(() => {
    // Guard against running on initial mount or if data is unchanged from Redux
    if (JSON.stringify(localQrData) === JSON.stringify(qrData)) {
      return;
    }

    const finalDataToSave = localQrData.map((item, index) => ({
      ...item,
      qr_index: index,
      updated: new Date().toISOString(),
      is_synced: true,
    }));

    dispatch(setQrData(finalDataToSave));

    if (finalDataToSave.length > 0) {
      updateQrIndexes(finalDataToSave, GUEST_USER_ID).catch((error) => {
        console.error("Error reordering QR for guest:", error);
      });
    }
  }, [localQrData, qrData, dispatch]);

  // Handle initial loading state
  useEffect(() => {
    if (guestUser && guestUser.id === GUEST_USER_ID) {
      InteractionManager.runAfterInteractions(() => {
        setIsLoading(false);
        setInitialAnimationsDone(true);
      });
    } else {
      setIsLoading(true);
      setInitialAnimationsDone(false);
    }
  }, [guestUser]);

  // Network status toasts
  const prevIsOffline = useRef(isOffline);
  useEffect(() => {
    if (isOffline) {
      setBottomToastIcon("wifi-off");
      setBottomToastMessage(t("homeScreen.offline"));
      setBottomToastColor("#f2726f");
      setIsBottomToastVisible(true);
    } else {
      if (prevIsOffline.current) {
        setBottomToastIcon("wifi");
        setBottomToastMessage(t("homeScreen.online"));
        setBottomToastColor("#4caf50");
        setIsBottomToastVisible(true);
        if (timeoutRefs.current.network)
          clearTimeout(timeoutRefs.current.network);
        timeoutRefs.current.network = setTimeout(
          () => setIsBottomToastVisible(false),
          2000
        );
      } else {
        setIsBottomToastVisible(false);
      }
    }
    prevIsOffline.current = isOffline;
    return () => {
      if (timeoutRefs.current.network)
        clearTimeout(timeoutRefs.current.network);
    };
  }, [isOffline]);

  // Animation logic
  const animateEmptyCard = useCallback(() => {
    emptyCardOffset.value = withSpring(0, { damping: 30, stiffness: 150 });
  }, [emptyCardOffset]);

  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
    if (initialAnimationsDone) {
      if (isEmpty) {
        listOpacity.value = 0;
        emptyCardOffset.value = 350;
        animateEmptyCard();
      } else {
        emptyCardOffset.value = 350;
        listOpacity.value = withTiming(1, { duration: 300 });
      }
    }
  }, [isEmpty, initialAnimationsDone, animateEmptyCard]);

  // Animated styles
  const titleContainerStyle = useAnimatedStyle(() => {
    const SCROLL_THRESHOLD = 120;
    const ANIMATION_RANGE = 90;
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD, SCROLL_THRESHOLD + ANIMATION_RANGE],
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [0, -35],
      Extrapolation.CLAMP
    );
    const shouldReduceZIndex =
      scrollY.value > SCROLL_THRESHOLD || isActive.value || isSheetOpen.value;
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: shouldReduceZIndex ? 0 : 1,
    };
  }, []);

  const listHeaderStyle = useAnimatedStyle(() => {
    const opacity = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
      { duration: 200, easing: Easing.out(Easing.ease) }
    );
    const scale = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0.95], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) }
    );
    const translateY = withTiming(
      interpolate(scrollY.value, [0, 50], [0, -5], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) }
    );
    return { opacity, transform: [{ scale }, { translateY }] };
  }, []);

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = withTiming(
      isBottomToastVisible ? 30 : isToastVisible ? 80 : 10,
      { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    return { marginBottom };
  }, [isBottomToastVisible, isToastVisible]);

  const emptyCardStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: emptyCardOffset.value }],
      flex: 1,
    }),
    []
  );

  const listContainerAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: listOpacity.value,
      flex: 1,
    }),
    []
  );

  // Navigation handlers
  const onNavigateToEmptyScreen = useCallback(
    () => router.push("/(guest)/empty-guest"),
    []
  );
  const onNavigateToDetailScreen = useCallback(
    throttle((item: QRRecord) => {
      router.push({
        pathname: `/detail`,
        params: {
          id: item.id,
          item: encodeURIComponent(JSON.stringify(item)),
          isGuest: "true",
        },
      });
    }, 300),
    []
  );
  const onNavigateToScanScreen = useCallback(
    () => router.push("/(guest)/(scan)/scan-main"),
    []
  );
  const onNavigateToSettingsScreen = useCallback(
    () => router.push("/(guest)/(settings)/settings-guest"),
    []
  );
  const onNavigateToAddScreen = useCallback(
    throttle(
      (
        codeFormat?: number,
        codeValue?: string,
        bin?: string,
        codeType?: string,
        codeProvider?: string
      ) => {
        router.push({
          pathname: `/(guest)/add-guest`,
          params: {
            codeFormat: codeFormat?.toString(),
            codeValue,
            codeBin: bin,
            codeType,
            codeProvider,
          },
        });
      },
      300
    ),
    []
  );
  const onNavigateToEditScreen = useCallback(
    throttle(() => {
      if (!selectedItemId) return;
      bottomSheetRef.current?.close();
      if (timeoutRefs.current.edit) clearTimeout(timeoutRefs.current.edit);
      timeoutRefs.current.edit = setTimeout(() => {
        router.push({
          pathname: `/(guest)/(edit)/edit`,
          params: { id: selectedItemId },
        });
      }, 200);
    }, 300),
    [selectedItemId]
  );

  // Sheet handlers
  const onOpenSheet = useCallback(
    (
      type: SheetType,
      id?: string,
      url?: string,
      ssid?: string,
      password?: string,
      isWep?: boolean,
      isHidden?: boolean
    ) => {
      setSheetType(type);
      setSelectedItemId(id || null);
      if (type === "wifi" && ssid && password) {
        setWifiSsid(ssid);
        setWifiPassword(password);
        setWifiIsWep(isWep ?? false);
        setWifiIsHidden(isHidden ?? false);
      } else if (type === "linking" && url) {
        setLinkingUrl(url);
      }
      bottomSheetRef.current?.snapToIndex(0);
    },
    []
  );

  const handleSheetChange = useCallback(
    (index: number) => {
      isSheetOpen.value = index > -1;
    },
    [isSheetOpen]
  );

  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onScrollOffsetChange = useCallback(
    (offset: number) => {
      scrollY.value = offset;
    },
    [scrollY]
  );

  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    isActive.value = true;
  }, [isActive]);

  // --- FIX: Use localQrData for UI rendering ---
  const filteredData = useMemo(() => {
    if (filter === "all") return localQrData;
    return localQrData.filter((item) => item.type === filter);
  }, [localQrData, filter]);

  const handleFilterChange = useCallback(
    (newFilter: string) => setFilter(newFilter),
    []
  );
  const onDeleteSheetPress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);
  const onDeletePress = useCallback(async () => {
    if (!selectedItemId) return;
    try {
      setIsProcessing(true);
      setIsToastVisible(true);
      setToastMessage(t("homeScreen.deleting"));

      // This part is correct: it gets the latest from Redux, dispatches the change,
      // and the useEffect will sync localQrData automatically.
      const updatedData = qrData.filter((item) => item.id !== selectedItemId);
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
        is_synced: true,
      }));
      dispatch(setQrData(reindexedData));

      await deleteQrCode(selectedItemId, GUEST_USER_ID);
      if (reindexedData.length > 0) {
        await updateQrIndexes(reindexedData, GUEST_USER_ID);
      }

      setIsModalVisible(false);
      setIsToastVisible(false);
      setTopToastMessage(t("homeScreen.deleted"));
      setIsTopToastVisible(true);
    } catch (error) {
      console.error("Error deleting QR for guest:", error);
      setToastMessage(t("homeScreen.deleteError"));
      setIsToastVisible(true);
    } finally {
      setSelectedItemId(null);
      if (timeoutRefs.current.delete) clearTimeout(timeoutRefs.current.delete);
      timeoutRefs.current.delete = setTimeout(
        () => setIsProcessing(false),
        400
      );
    }
  }, [selectedItemId, qrData, dispatch]);

  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive: isItemActive,
    }: {
      item: QRRecord;
      drag: () => void;
      isActive: boolean;
    }) => (
      <ScaleDecorator activeScale={0.9}>
        <ThemedCardItem
          isActive={isItemActive}
          onItemPress={() => onNavigateToDetailScreen(item)}
          code={item.code}
          type={item.type}
          metadata={item.metadata}
          metadata_type={item.metadata_type}
          onMoreButtonPress={() => onOpenSheet("setting", item.id)}
          accountName={item.account_name}
          accountNumber={item.account_number}
          onDrag={drag}
        />
      </ScaleDecorator>
    ),
    [onNavigateToDetailScreen, onOpenSheet]
  );
  const showToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
  }, []);
  const handleCopySuccess = useCallback(
    () => showToast(t("homeScreen.copied")),
    [showToast]
  );

  // --- FIX: onDragEnd now only updates local state for a smooth UI. ---
  const onDragEnd = useCallback(
    ({ data: reorderedData }: { data: QRRecord[] }) => {
      triggerHapticFeedback();
      isActive.value = false;

      let finalData;
      if (filter === "all") {
        finalData = reorderedData;
      } else {
        const newOrderedFullList: QRRecord[] = [];
        let reorderedDataIndex = 0;
        localQrData.forEach((originalItem) => {
          if (originalItem.type === filter) {
            if (reorderedData[reorderedDataIndex]) {
              newOrderedFullList.push(reorderedData[reorderedDataIndex]);
              reorderedDataIndex++;
            }
          } else {
            newOrderedFullList.push(originalItem);
          }
        });
        finalData = newOrderedFullList;
      }
      setLocalQrData(finalData);
    },
    [filter, localQrData]
  );

  // --- FIX: Use localQrData for UI calculations ---
  const listContainerPadding = useMemo(() => {
    switch (localQrData.length) {
      case 0:
        return 0;
      case 1:
        return height * 0.72;
      case 2:
        return height * 0.45;
      case 3:
        return height * 0.2;
      default:
        return 100;
    }
  }, [localQrData.length]);

  const renderSheetContent = () => {
    switch (sheetType) {
      case "wifi":
        return (
          <WifiSheetContent
            ssid={wifiSsid || ""}
            password={wifiPassword || ""}
            isWep={wifiIsWep}
            isHidden={wifiIsHidden}
          />
        );
      case "linking":
        return (
          <LinkingSheetContent
            url={linkingUrl}
            onCopySuccess={handleCopySuccess}
          />
        );
      case "setting":
        return (
          <SettingSheetContent
            onEdit={onNavigateToEditScreen}
            onDelete={onDeleteSheetPress}
          />
        );
      default:
        return null;
    }
  };

  // Memoized components
  const HeaderComponent = React.memo(
    ({
      onScan,
      onSettings,
    }: {
      onScan: () => void;
      onSettings: () => void;
    }) => (
      <View style={styles.headerContainer}>
        <ThemedText style={styles.titleText} type="title">
          {t("homeScreen.title")}
        </ThemedText>
        <View style={styles.titleButtonContainer}>
          <ThemedButton
            iconName="camera"
            style={styles.titleButton}
            onPress={onScan}
            disabled={isLoading}
          />
          <ThemedButton
            iconName="cog"
            style={styles.titleButton}
            onPress={onSettings}
            disabled={isLoading}
          />
        </View>
      </View>
    )
  );
  const LoadingComponent = React.memo(() => (
    <View style={styles.loadingContainer}>
      <View style={{ marginBottom: 20 }}>
        <ThemedFilterSkeleton show={true} />
      </View>
      {Array.from({ length: 3 }).map((_, index) => (
        <ThemedCardSkeleton key={index} index={index} />
      ))}
    </View>
  ));
  const ListHeaderComponent = React.memo(
    ({
      listHeaderStyle,
      filter,
      onFilterChange,
    }: {
      listHeaderStyle: any;
      filter: string;
      onFilterChange: (filter: string) => void;
    }) => (
      <Animated.View
        style={[listHeaderStyle, { marginBottom: getResponsiveHeight(3.6) }]}
      >
        <ThemedFilter
          selectedFilter={filter}
          onFilterChange={onFilterChange}
        />
      </Animated.View>
    )
  );
  const EmptyItemComponent = React.memo(({ color }: { color: string }) => (
    <View style={styles.emptyItem}>
      <MaterialIcons color={color} name="search" size={50} />
      <ThemedText style={{ textAlign: "center", lineHeight: 30 }}>
        {t("homeScreen.noItemFound")}
      </ThemedText>
    </View>
  ));

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
        <HeaderComponent
          onScan={onNavigateToScanScreen}
          onSettings={onNavigateToSettingsScreen}
        />
      </Animated.View>

      {isLoading ? (
        <LoadingComponent />
      ) : isEmpty ? (
        <EmptyListItem
          scrollHandler={scrollHandler}
          emptyCardStyle={emptyCardStyle}
          onNavigateToEmptyScreen={onNavigateToEmptyScreen}
          onNavigateToScanScreen={onNavigateToScanScreen}
          dropdownOptions={[
            {
              label: "homeScreen.fab.add",
              onPress: onNavigateToAddScreen,
            },
            {
              label: "homeScreen.fab.scan",
              onPress: onNavigateToScanScreen,
            },
            {
              label: "homeScreen.fab.gallery",
              onPress: onOpenGallery,
            },
          ]}
        />
      ) : (
        <Animated.View style={listContainerAnimatedStyle}>
          <DraggableFlatList
            ref={flatListRef}
            bounces={true}
            ListHeaderComponent={
              <ListHeaderComponent
                listHeaderStyle={listHeaderStyle}
                filter={filter}
                onFilterChange={handleFilterChange}
              />
            }
            ListEmptyComponent={<EmptyItemComponent color={color} />}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}
            data={filteredData} // --- FIX: Use data derived from local state
            renderItem={renderItem}
            keyExtractor={(item) => `draggable-item-${item.id}`}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={[
              styles.listContainer,
              filteredData.length > 0 && {
                paddingBottom: listContainerPadding,
              },
            ]}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onDragBegin={onDragBegin}
            onDragEnd={onDragEnd}
            dragItemOverflow={false}
            onScrollOffsetChange={onScrollOffsetChange}
            decelerationRate={"fast"}
          />
        </Animated.View>
      )}

      {!isLoading && (
        <ThemedFAB
          actions={[
            {
              text: "homeScreen.fab.add",
              iconName: "plus-circle",
              onPress: onNavigateToAddScreen,
            },
            {
              text: "homeScreen.fab.scan",
              iconName: "camera",
              onPress: onNavigateToScanScreen,
            },
            {
              text: "homeScreen.fab.gallery",
              iconName: "image",
              onPress: onOpenGallery,
            },
          ]}
          style={styles.fab}
          animatedStyle={fabStyle}
        />
      )}

      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
        isSyncing={isProcessing}
      />
      <ThemedTopToast
        message={topToastMessage}
        isVisible={isTopToastVisible}
        onVisibilityToggle={(isVisible) => setIsTopToastVisible(isVisible)}
        duration={2000}
      />
      <ThemedBottomToast
        isVisible={isBottomToastVisible}
        message={bottomToastMessage}
        iconName={
          bottomToastIcon as keyof typeof MaterialCommunityIcons.glyphMap
        }
        style={styles.bottomToastContainer}
        backgroundColor={bottomToastColor}
      />
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={
          sheetType === "setting"
            ? t("homeScreen.manage")
            : sheetType === "wifi"
              ? t("homeScreen.wifi")
              : sheetType === "linking"
                ? t("homeScreen.linking")
                : t("homeScreen.settings")
        }
        onChange={handleSheetChange}
        snapPoints={
          sheetType === "setting"
            ? ["25%"]
            : sheetType === "wifi"
              ? ["38%"]
              : sheetType === "linking"
                ? ["35%"]
                : ["35%"]
        }
        styles={{
          customContent: {
            borderRadius: getResponsiveWidth(4),
            marginHorizontal: getResponsiveWidth(3.6),
          },
        }}
        customContent={<View>{renderSheetContent()}</View>}
      />
      <ThemedModal
        primaryActionText={t("homeScreen.delete")}
        onPrimaryAction={onDeletePress}
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t("homeScreen.cancel")}
        title={t("homeScreen.confirmDeleteTitle")}
        message={t("homeScreen.confirmDeleteMessage")}
        isVisible={isModalVisible}
        iconName="delete"
      />
    </ThemedView>
  );
}

export default React.memo(GuestHomeScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    position: "absolute",
    top: getResponsiveHeight(10),
    left: 0,
    right: 0,
    flexDirection: "column",
    gap: 15,
    zIndex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  titleText: {
    fontSize: getResponsiveFontSize(28),
  },
  titleButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleButton: {},
  listContainer: {
    paddingTop: getResponsiveHeight(18.4),
    flexGrow: 1,
  },
  emptyItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    opacity: 0.7,
    paddingHorizontal: getResponsiveWidth(5),
    minHeight: getResponsiveHeight(30),
  },
  toastContainer: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
    zIndex: 10,
  },
  bottomToastContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9,
  },
  fab: {
    bottom: getResponsiveHeight(2),
    right: getResponsiveWidth(3.6),
    position: "absolute",
    zIndex: 3,
  },
  loadingContainer: {
    paddingTop: getResponsiveHeight(18),
    paddingHorizontal: 15,
    flex: 1,
    justifyContent: "flex-start",
  },
});