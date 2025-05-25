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
import ServerRecord from "@/types/serverDataTypes"; // Ensure this type is correctly defined
import { height } from "@/constants/Constants";
import { RootState } from "@/store/rootReducer";
import { setQrData } from "@/store/reducers/qrSlice";
import {
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  fetchServerData, // This function's return type is crucial
  getUnsyncedQrCodes,
  insertOrUpdateQrCodes, // Expects ServerRecord[]
  updateQrIndexes,
  hasLocalData,
} from "@/services/localDB/qrDB";
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

function HomeScreen() {
  // Redux and Context
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? "");

  // Theme and Appearance
  const color = useThemeColor({ light: "#3A2E24", dark: "#FFF5E1" }, "text");

  // Loading and Syncing
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isSyncing, setIsSyncing] = useState(false);
  const isEmpty = useMemo(() => qrData.length === 0, [qrData]);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [initialAnimationsDone, setInitialAnimationsDone] = useState(false);

  // UI State
  const [isActive, setIsActive] = useState(false);
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
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout | null }>({
    sync: null,
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

  // Sync with server
  const syncWithServer = useCallback(
    async (userIdToSync: string) => {
      if (isOffline || isSyncing) {
        return;
      }

      setIsSyncing(true);
      setSyncStatus("syncing");
      setTopToastMessage(t("homeScreen.syncStarted"));
      setIsTopToastVisible(true);

      InteractionManager.runAfterInteractions(async () => {
        try {
          await syncQrCodes(userIdToSync); // Push local changes

          // Fetch data from server. This might return QRRecord-like objects.
          const rawDataFromServer = await fetchServerData(userIdToSync);

          if (rawDataFromServer && rawDataFromServer.length > 0) {
            // Transform rawDataFromServer to ServerRecord[]
            // Ensure each item has collectionId and collectionName
            const serverData: ServerRecord[] = rawDataFromServer.map(
              (item: any) => {
                // Ensure item is treated as a base QRRecord and add missing fields
                const baseRecord = item as QRRecord;
                return {
                  ...baseRecord, // Spread all properties from the fetched item
                  // !!! REPLACE THESE WITH ACTUAL VALUES OR LOGIC !!!
                  collectionId:
                    (item as any).collectionId ||
                    "YOUR_QR_COLLECTION_ID_PLACEHOLDER",
                  collectionName:
                    (item as any).collectionName ||
                    "YOUR_QR_COLLECTION_NAME_PLACEHOLDER",
                  // Ensure all other fields required by ServerRecord are present
                  // and correctly typed. For example, if ServerRecord expects dates as ISO strings:
                  // created: new Date(baseRecord.created).toISOString(),
                  // updated: new Date(baseRecord.updated).toISOString(),
                };
              },
            );
            await insertOrUpdateQrCodes(serverData);
          }

          const finalLocalData = await getQrCodesByUserId(userIdToSync);
          dispatch(setQrData(finalLocalData));
          setSyncStatus("synced");
          setTopToastMessage(t("homeScreen.syncSuccess"));
          setIsTopToastVisible(true);

          if (timeoutRefs.current.sync) clearTimeout(timeoutRefs.current.sync);
          timeoutRefs.current.sync = setTimeout(
            () => setSyncStatus("idle"),
            3000,
          );
        } catch (error) {
          console.error("Error during sync process:", error);
          setSyncStatus("error");
          setTopToastMessage(t("homeScreen.syncError"));
          setIsTopToastVisible(true);
        } finally {
          setIsSyncing(false);
        }
      });
    },
    [isOffline, isSyncing, dispatch, t], // Removed userIdToSync from here as it's an arg
  );

  // Initialize data
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setSyncStatus("idle");
      return;
    }

    let isMounted = true;

    const initializeData = async () => {
      setIsLoading(true);

      let localLoadSuccess = false;
      try {
        const currentLocalData = await getQrCodesByUserId(userId);
        if (!isMounted) return;
        dispatch(setQrData(currentLocalData));
        localLoadSuccess = true;
      } catch (error) {
        console.error("Error loading local data:", error);
        if (isMounted) {
          setSyncStatus("error");
          setTopToastMessage(t("homeScreen.loadError"));
          setIsTopToastVisible(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          InteractionManager.runAfterInteractions(() => {
            if (isMounted) {
              setInitialAnimationsDone(true);
            }
          });
        }
      }

      if (!localLoadSuccess || !isMounted) return;

      InteractionManager.runAfterInteractions(async () => {
        if (!isMounted || isOffline) {
          if (isMounted && syncStatus !== "error") {
            setSyncStatus("idle");
          }
          return;
        }
        if (syncStatus === "error") return;

        try {
          const unsyncedCodes = await getUnsyncedQrCodes(userId);
          const localDbExists = await hasLocalData(userId);
          const needsSync = !localDbExists || unsyncedCodes.length > 0;

          if (needsSync && isMounted) {
            await syncWithServer(userId);
          } else if (isMounted) {
            setSyncStatus("synced");
            if (timeoutRefs.current.idle)
              clearTimeout(timeoutRefs.current.idle);
            timeoutRefs.current.idle = setTimeout(() => {
              if (isMounted && syncStatus === "synced") {
                setSyncStatus("idle");
              }
            }, 3000);
          }
        } catch (error) {
          console.error("Error determining sync necessity:", error);
          if (isMounted) {
            setSyncStatus("error");
            setTopToastMessage(t("homeScreen.syncCheckError"));
            setIsTopToastVisible(true);
          }
        }
      });
    };

    initializeData();

    return () => {
      isMounted = false;
      if (timeoutRefs.current.idle) clearTimeout(timeoutRefs.current.idle);
    };
  }, [userId]);

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
  }, [isOffline, t]);

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
    flex: 1,
  }));

  const listContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    flex: 1,
  }));

  // Navigation handlers
  const onNavigateToEmptyScreen = useCallback(
    () => router.push("/empty"),
    [],
  );
  const onNavigateToDetailScreen = useCallback(
    throttle((item: QRRecord) => {
      router.push({
        pathname: `/detail`,
        params: {
          id: item.id,
          item: encodeURIComponent(JSON.stringify(item)),
          user_id: userId,
        },
      });
    }, 300),
    [userId],
  );
  const onNavigateToScanScreen = useCallback(
    () => router.push("/(scan)/scan-main"),
    [],
  );
  const onNavigateToSettingsScreen = useCallback(
    () => router.push("/settings"),
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
          pathname: `/(auth)/(add)/add-new`,
          params: {
            codeFormat,
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
          pathname: `/(edit)/edit`,
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

      switch (type) {
        case "wifi":
          if (ssid && password) {
            setWifiSsid(ssid);
            setWifiPassword(password);
            setWifiIsWep(isWep ?? false);
            setWifiIsHidden(isHidden ?? false);
          }
          break;
        case "linking":
          if (url) setLinkingUrl(url);
          break;
        default:
          break;
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

  const handleSync = useCallback(() => {
    if (userId) syncWithServer(userId);
  }, [syncWithServer, userId]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  // Optimize renderItem with useCallback
  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive: itemIsActive,
    }: {
      item: QRRecord;
      drag: () => void;
      isActive: boolean;
    }) => (
      <ScaleDecorator activeScale={0.9}>
        <ThemedCardItem
          isActive={itemIsActive}
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

  const onDragEnd = useCallback(
    ({ data: reorderedData }: { data: QRRecord[] }) => {
      triggerHapticFeedback();
      setIsActive(false);

      if (!userId) return;

      if (filter === "all") {
        dispatch(setQrData(reorderedData));
        InteractionManager.runAfterInteractions(() => {
          const updatedData = reorderedData.map((item, index) => ({
            ...item,
            qr_index: index,
            updated: new Date().toISOString(),
          }));
          updateQrIndexes(updatedData, userId).catch(console.error);
        });
      } else {
        const reorderedItemsMap = new Map(
          reorderedData.map((item) => [item.id, item]),
        );
        const filteredItemIds = new Set(reorderedData.map((item) => item.id));
        const newFullList = qrData.map((item) => {
          if (filteredItemIds.has(item.id)) {
            return reorderedItemsMap.get(item.id)!;
          }
          return item;
        });
        dispatch(setQrData(newFullList));
        InteractionManager.runAfterInteractions(() => {
          const finalData = newFullList.map((item, index) => ({
            ...item,
            qr_index: index,
            updated: new Date().toISOString(),
          }));
          updateQrIndexes(finalData, userId).catch(console.error);
        });
      }
    },
    [dispatch, qrData, filter, userId],
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

  // Delete handlers
  const onDeleteSheetPress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);

  const onDeletePress = useCallback(async () => {
    if (!selectedItemId || !userId) return;

    setIsModalVisible(false);

    try {
      setIsSyncing(true);
      setIsToastVisible(true);
      setToastMessage(t("homeScreen.deleting"));

      await deleteQrCode(selectedItemId, userId);
      const updatedData = qrData.filter((item) => item.id !== selectedItemId);
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(reindexedData));
      await updateQrIndexes(reindexedData, userId);

      setIsModalVisible(false);
      setIsToastVisible(false);
    } catch (error) {
      setToastMessage(t("homeScreen.deleteError"));
      setIsToastVisible(true);
    } finally {
      setSelectedItemId(null);

      if (timeoutRefs.current.delete)
        clearTimeout(timeoutRefs.current.delete);
      timeoutRefs.current.delete = setTimeout(() => setIsSyncing(false), 400);
    }
  }, [selectedItemId, qrData, dispatch, t, userId]);

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

  const listContainerPadding = useMemo(
    () => paddingValues,
    [paddingValues],
  );

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

  // Memoize the header component
  const HeaderComponent = React.memo(
    ({
      titleContainerStyle,
      syncStatus,
      isLoading,
      onSync,
      onScan,
      onSettings,
    }: {
      titleContainerStyle: any;
      syncStatus: "idle" | "syncing" | "synced" | "error";
      isLoading: boolean;
      onSync: () => void;
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
              iconName="cloud-sync"
              syncStatus={syncStatus}
              style={styles.titleButton}
              onPress={onSync}
              disabled={syncStatus === "syncing" || isLoading}
            />
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
      </Animated.View>
    ),
  );

  // Memoize the loading component
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

  // Memoize the list header component
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

  // Memoize the empty item component
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
        syncStatus={syncStatus}
        isLoading={isLoading}
        onSync={handleSync}
        onScan={onNavigateToScanScreen}
        onSettings={onNavigateToSettingsScreen}
      />

      {(isLoading || (isSyncing )) ? ( // Or just (isLoading || isSyncing) if you always want it
        <LoadingComponent />
      ) : isEmpty ? (
        <EmptyListItem

          scrollHandler={scrollHandler}
          emptyCardStyle={emptyCardStyle}
          onNavigateToEmptyScreen={onNavigateToEmptyScreen}
          onNavigateToScanScreen={onNavigateToScanScreen}
          dropdownOptions={[
            { label: "homeScreen.fab.add", onPress: onNavigateToAddScreen },
            { label: "homeScreen.fab.scan", onPress: onNavigateToScanScreen },
            { label: "homeScreen.fab.gallery", onPress: onOpenGallery },
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
            data={[...filteredData]}
            renderItem={renderItem}
            keyExtractor={(item) => `draggable-item-${item.id}`}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={[
              styles.listContainer,
              // Apply paddingBottom only when there are filtered items to display
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

      {!isLoading && qrData.length > 0 && (
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
        isSyncing={isSyncing}
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
        primaryActionText={t("homeScreen.move")}
        onPrimaryAction={onDeletePress}
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t("homeScreen.cancel")}
        title={t("homeScreen.confirmDeleteTitle")}
        message={t("homeScreen.confirmDeleteMessage")}
        isVisible={isModalVisible}
        iconName="delete-outline"
      />
    </ThemedView>
  );
}

export default React.memo(HomeScreen);

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
