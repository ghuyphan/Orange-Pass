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
import { setQrData } from "@/store/reducers/qrSlice"; // To update Redux state
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
// import { exitGuestMode } from "@/services/auth"; // Assuming this is from your auth service
import { deleteQrCode, updateQrIndexes } from "@/services/localDB/qrDB"; // Import DB functions

const GUEST_USER_ID = ""; // Consistent with AuthService

function GuestHomeScreen() {
  // Redux and Context
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const guestUser = useSelector((state: RootState) => state.auth.user);

  // Theme and Appearance
  const color = useThemeColor({ light: "#3A2E24", dark: "#FFF5E1" }, "text");

  // Loading and Syncing
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const [isProcessing, setIsProcessing] = useState(false); // For local DB operations
  const isEmpty = useMemo(() => qrData.length === 0, [qrData]);
  const [initialAnimationsDone, setInitialAnimationsDone] = useState(false);

  // UI State
  const [isActive, setIsActive] = useState(false); // For drag
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastColor, setBottomToastColor] = useState("");
  const [bottomToastIcon, setBottomToastIcon] = useState("");
  const [bottomToastMessage, setBottomToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
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
  const timeoutRefs = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({
    processing: null,
    idle: null,
    edit: null,
    delete: null,
    sheet: null,
    toast: null,
    network: null,
  });

  // Shared Values (Reanimated)
  const isEmptyShared = useSharedValue(qrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350); // For EmptyListItem slide-in
  const listOpacity = useSharedValue(0); // For DraggableFlatList fade-in
  const scrollY = useSharedValue(0);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // Handle initial loading state based on guest user setup
  useEffect(() => {
    if (guestUser && guestUser.id === GUEST_USER_ID) {
      InteractionManager.runAfterInteractions(() => {
        setIsLoading(false);
        setInitialAnimationsDone(true); // Allow animations after interactions
      });
    } else {
      setIsLoading(true); // Should ideally not happen if this screen is only for guests
      setInitialAnimationsDone(false); // Reset if guestUser changes
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
          2000,
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

  const animateEmptyCard = useCallback(() => {
    emptyCardOffset.value = withSpring(0, { damping: 30, stiffness: 150 });
  }, [emptyCardOffset]);

  // Animate empty card or list appearance
  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
    if (initialAnimationsDone) {
      if (isEmpty) {
        listOpacity.value = 0; // Hide list
        emptyCardOffset.value = 350; // Reset for slide-in animation
        animateEmptyCard(); // Slide in EmptyListItem
      } else {
        emptyCardOffset.value = 350; // Ensure EmptyListItem is "off-screen"
        listOpacity.value = withTiming(1, { duration: 300 }); // Fade in list
      }
    }
  }, [
    isEmpty,
    initialAnimationsDone,
    animateEmptyCard,
    listOpacity,
    emptyCardOffset,
    isEmptyShared,
  ]);

  // Animated styles
  const titleContainerStyle = useAnimatedStyle(() => {
    const SCROLL_THRESHOLD = 120;
    const ANIMATION_RANGE = 90;
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD, SCROLL_THRESHOLD + ANIMATION_RANGE],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [0, -35],
      Extrapolation.CLAMP,
    );
    const shouldReduceZIndex = scrollY.value > 120 || isActive || isSheetOpen;
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: shouldReduceZIndex ? 0 : 1,
    };
  }, [isActive, isSheetOpen]);

  const listHeaderStyle = useAnimatedStyle(() => {
    const opacity = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
      { duration: 200, easing: Easing.out(Easing.ease) },
    );
    const scale = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0.95], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) },
    );
    const translateY = withTiming(
      interpolate(scrollY.value, [0, 50], [0, -5], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) },
    );
    return { opacity, transform: [{ scale }, { translateY }] };
  }, []);

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = withTiming(
      isBottomToastVisible ? 30 : isToastVisible ? 80 : 10,
      { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
    );
    return { marginBottom };
  });

  const emptyCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emptyCardOffset.value }],
    flex: 1, // Ensure EmptyListItem takes space if it's a ScrollView
  }));

  const listContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    flex: 1,
  }));

  // Navigation handlers
  const onNavigateToEmptyScreen = useCallback(
    () => router.push("/(guest)/empty-guest"),
    [],
  );
  const onNavigateToDetailScreen = useCallback(
    throttle((item: QRRecord) => {
      router.push({
        pathname: `/detail`, // Assuming guest detail is same or handled by params
        params: {
          id: item.id,
          item: encodeURIComponent(JSON.stringify(item)),
          isGuest: "true", // Optional: flag for detail screen
        },
      });
    }, 300),
    [],
  );
  const onNavigateToScanScreen = useCallback(
    () => router.push("/(guest)/(scan)/scan-main"),
    [],
  );
  const onNavigateToSettingsScreen = useCallback(
    () => router.push("/(guest)/(settings)/settings-guest"),
    [],
  );

  const onNavigateToAddScreen = useCallback(
    throttle(
      (
        codeFormat?: number,
        codeValue?: string,
        bin?: string,
        codeType?: string,
        codeProvider?: string,
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
      300,
    ),
    [],
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
    [selectedItemId],
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
      isHidden?: boolean,
    ) => {
      setSheetType(type);
      setIsSheetOpen(true);
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
    [],
  );

  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    if (event.contentOffset.y > 50 && fabOpen) {
      setFabOpen(false);
    } else if (event.contentOffset.y <= 50 && !fabOpen) {
      setFabOpen(true);
    }
  });

  const onScrollOffsetChange = useCallback(
    (offset: number) => {
      scrollY.value = offset;
    },
    [scrollY],
  );

  // Drag handlers
  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    setIsActive(true);
  }, []);

  // Memoize filtered data
  const filteredData = useMemo(() => {
    if (filter === "all") return qrData;
    return qrData.filter((item) => item.type === filter);
  }, [qrData, filter]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  // Delete handlers
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

      const updatedData = qrData.filter((item) => item.id !== selectedItemId);
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
        is_synced: true, // For guest mode, local changes are "synced" locally
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
        400,
      );
    }
  }, [selectedItemId, qrData, dispatch, t]);

  // Optimize renderItem
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
    [onNavigateToDetailScreen, onOpenSheet],
  );

  // Toast handler
  const showToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
  }, []);

  const handleCopySuccess = useCallback(
    () => showToast(t("homeScreen.copied")),
    [showToast, t],
  );

  // Optimize onDragEnd
  const onDragEnd = useCallback(
    async ({ data: reorderedData }: { data: QRRecord[] }) => {
      triggerHapticFeedback();
      setIsActive(false);
      setIsProcessing(true);
      // setToastMessage(t("homeScreen.reordering"));
      // setIsToastVisible(true);

      let finalDataToSave: QRRecord[];

      if (filter === "all") {
        finalDataToSave = reorderedData.map((item, index) => ({
          ...item,
          qr_index: index,
          updated: new Date().toISOString(),
          is_synced: true, // For guest mode
        }));
        dispatch(setQrData(finalDataToSave));
      } else {
        const reorderedItemsMap = new Map(
          reorderedData.map((item) => [item.id, item]),
        );
        const filteredItemIds = new Set(reorderedData.map((item) => item.id));
        let currentIndex = 0;
        const newFullList = qrData
          .map((item) => {
            if (filteredItemIds.has(item.id)) {
              // Use the reordered item from the filtered list
              return reorderedItemsMap.get(item.id)!;
            }
            return item; // Keep non-filtered items as they are
          })
          .map((item) => ({
            // Re-index the entire list based on the new order
            ...item,
            qr_index: currentIndex++,
            updated: new Date().toISOString(),
            is_synced: true, // For guest mode
          }));
        finalDataToSave = newFullList;
        dispatch(setQrData(finalDataToSave));
      }

      try {
        if (finalDataToSave.length > 0) {
          await updateQrIndexes(finalDataToSave, GUEST_USER_ID);
        }
        // setIsToastVisible(false); // Clear "reordering" toast
        // setTopToastMessage(t("homeScreen.reordered"));
        // setIsTopToastVisible(true);
      } catch (error) {
        console.error("Error reordering QR for guest:", error);
        // setToastMessage(t("homeScreen.reorderError"));
        // Keep isToastVisible true to show the error
      } finally {
        if (timeoutRefs.current.processing)
          clearTimeout(timeoutRefs.current.processing);
        timeoutRefs.current.processing = setTimeout(() => {
          setIsProcessing(false);
          // Only hide toast if it wasn't an error message
          if (!toastMessage.toLowerCase().includes("error")) {
            setIsToastVisible(false);
          }
        }, 400);
      }
    },
    [dispatch, qrData, filter, t, toastMessage], // Added toastMessage
  );

  // Padding values
  const paddingValues = useMemo(() => {
    switch (qrData.length) {
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
  }, [qrData.length]);
  const listContainerPadding = useMemo(() => paddingValues, [paddingValues]);

  // Sheet content
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
      titleContainerStyle,
      onScan,
      onSettings,
    }: {
      titleContainerStyle: any;
      onScan: () => void;
      onSettings: () => void;
    }) => (
      <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
        <View style={styles.headerContainer}>
          <ThemedText style={styles.titleText} type="title">
            {t("homeScreen.title")}
          </ThemedText>
          <View style={styles.titleButtonContainer}>
            <ThemedButton
              iconName="camera"
              style={styles.titleButton}
              onPress={onScan}
              disabled={isLoading} // Disable if still loading
            />
            <ThemedButton
              iconName="cog"
              style={styles.titleButton}
              onPress={onSettings}
              disabled={isLoading} // Disable if still loading
            />
          </View>
        </View>
      </Animated.View>
    ),
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
    ),
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
      <HeaderComponent
        titleContainerStyle={titleContainerStyle}
        onScan={onNavigateToScanScreen}
        onSettings={onNavigateToSettingsScreen}
      />

      {isLoading ? (
        <LoadingComponent />
      ) : isEmpty ? (
        <EmptyListItem
          scrollHandler={scrollHandler}
          emptyCardStyle={emptyCardStyle} // Apply slide-in animation here
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
        // Apply fade-in animation here
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
            data={[...filteredData]}
            renderItem={renderItem}
            keyExtractor={(item) => `draggable-item-${item.id}`}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={[
              styles.listContainer,
              filteredData.length > 0 && { paddingBottom: listContainerPadding },
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

      {!isLoading && ( // Show FAB even if list is empty for guests
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
        isSyncing={isProcessing} // Use isProcessing for guest mode
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
        onClose={() => {
          if (timeoutRefs.current.sheet)
            clearTimeout(timeoutRefs.current.sheet);
          timeoutRefs.current.sheet = setTimeout(
            () => setIsSheetOpen(false),
            50,
          );
        }}
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
    paddingTop: getResponsiveHeight(18.1),
    flexGrow: 1,
  },
  emptyItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    opacity: 0.7,
  },
  toastContainer: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
  },
  bottomToastContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
  },
});
