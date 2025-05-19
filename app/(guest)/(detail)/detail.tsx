import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Linking from "expo-linking";
import { useDispatch, useSelector } from "react-redux";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUnmountBrightness } from "@reeq/react-native-device-brightness";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { throttle } from "lodash";
import { MMKV } from "react-native-mmkv";
import * as Clipboard from "expo-clipboard";

// Local imports
import { RootState } from "@/store/rootReducer";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { t } from "@/i18n";
// Components
import { ThemedView } from "@/components/ThemedView";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ThemedPinnedCard } from "@/components/cards";
import { ThemedText } from "@/components/ThemedText";
import { ThemedStatusToast } from "@/components/toast/ThemedStatusToast";
import { ThemedModal } from "@/components/modals/ThemedIconModal";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";

// Utilities
import { returnItemData } from "@/utils/returnItemData";
import { getVietQRData } from "@/utils/vietQR";
import { getIconPath } from "@/utils/returnIcon";
import { returnItemsByType } from "@/utils/returnItemData";
import { deleteQrCode, updateQrIndexes } from "@/services/localDB/qrDB";

import { setQrData } from "@/store/reducers/qrSlice";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { ThemedTopToast } from "@/components/toast/ThemedTopToast";
import SettingSheetContent from "@/components/bottomsheet/SettingSheetContent";

// Constants
const DEFAULT_AMOUNT_SUGGESTIONS = [
  "10,000",
  "20,000",
  "50,000",
  "100,000",
  "500,000",
  "1,000,000",
];
const SUGGESTION_MULTIPLIERS = [1000, 10000, 100000, 1000000];
const LAST_USED_BANK_KEY = "lastUsedBank";
const BANK_LOAD_DELAY = 300;
const EDIT_NAVIGATION_DELAY = 10;
const THROTTLE_WAIT = 500;
const INITIAL_BANK_COUNT = 6; // Show only first 6 banks initially
const BANK_BATCH_SIZE = 6; // Number of banks to load each time

// Types
interface ItemData {
  id: string;
  code: string;
  type: "bank" | "store" | "ewallet";
  metadata: string;
  metadata_type: "qr" | "barcode";
  account_name?: string;
  account_number?: string;
  style?: object;
}

interface BankItem {
  code: string;
  name: string;
}

// MMKV instance
const storage = new MMKV();

// Utility function to format the amount
const formatAmount = (numStr: string): string =>
  numStr.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Helper to safely parse and format suggestions
const generateSuggestion = (prefix: number, multiplier: number): string => {
  const result = prefix * multiplier;
  if (!Number.isSafeInteger(result)) {
    console.warn(`Generated suggestion exceeds safe integer limit: ${result}`);
    return result.toLocaleString("en-US");
  }
  return formatAmount(String(result));
};

const DetailScreen = () => {
  const { currentTheme } = useTheme();
  const dispatch = useDispatch();
  const { item: encodedItem, id } = useLocalSearchParams();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const router = useRouter();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const editNavigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [toastKey, setToastKey] = useState(0);
  const [amount, setAmount] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  
  // Modified state for progressive loading
  const [vietQRBanks, setVietQRBanks] = useState<BankItem[]>([]);
  const [allBanks, setAllBanks] = useState<BankItem[]>([]);
  const [isLoadingMoreBanks, setIsLoadingMoreBanks] = useState(false);
  const [isBanksInitiallyLoading, setIsBanksInitiallyLoading] = useState(true);

  const item = useMemo<ItemData | null>(() => {
    if (!encodedItem) return null;
    try {
      return JSON.parse(decodeURIComponent(String(encodedItem)));
    } catch (error) {
      console.error("Failed to parse item:", error);
      return null;
    }
  }, [encodedItem]);

  // Theme-based colors
  const cardColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
    [currentTheme],
  );
  const buttonColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.buttonBackground
        : Colors.dark.buttonBackground,
    [currentTheme],
  );
  const buttonTextColor = useMemo(
    () => (currentTheme === "light" ? Colors.light.icon : Colors.dark.icon),
    [currentTheme],
  );
  const iconColor = useMemo(
    () => (currentTheme === "light" ? Colors.light.icon : Colors.dark.icon),
    [currentTheme],
  );
  const textColor = useMemo(
    () => (currentTheme === "light" ? Colors.light.text : Colors.dark.text),
    [currentTheme],
  );
  const placeholderColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.placeHolder
        : Colors.dark.placeHolder,
    [currentTheme],
  );
  const currencyBorderColor = useMemo(
    () =>
      currentTheme === "light"
        ? "rgba(0, 0, 0, 0.2)"
        : "rgba(255, 255, 255, 0.2)",
    [currentTheme],
  );
  const currencyTextColor = useMemo(
    () =>
      currentTheme === "light"
        ? "rgba(0, 0, 0, 0.2)"
        : "rgba(255, 255, 255, 0.2)",
    [currentTheme],
  );
  const backgroundColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.background
        : Colors.dark.background,
    [currentTheme],
  );

  // Dynamic suggestion list based on user input and multipliers
  const dynamicSuggestions = useMemo(() => {
    const numericString = amount.replace(/,/g, "");

    if (!numericString || numericString === "0") {
      return DEFAULT_AMOUNT_SUGGESTIONS;
    }

    try {
      const numericPrefix = parseInt(numericString, 10);
      if (isNaN(numericPrefix) || numericPrefix === 0) {
        return DEFAULT_AMOUNT_SUGGESTIONS;
      }

      const generatedSuggestions = SUGGESTION_MULTIPLIERS.map((multiplier) =>
        generateSuggestion(numericPrefix, multiplier),
      );
      return generatedSuggestions;
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return DEFAULT_AMOUNT_SUGGESTIONS;
    }
  }, [amount]);

  // Load banks effect - modified for progressive loading
  useEffect(() => {
    const loadInitialBanks = async () => {
      if (item?.type !== "store") return;
      
      setIsBanksInitiallyLoading(true);
      
      // Initial banks load with delay to prevent transition lag
      const timerId = setTimeout(() => {
        let banks = returnItemsByType("vietqr");
        const lastUsedBankCode = storage.getString(LAST_USED_BANK_KEY);
        
        // Save all banks for later use
        setAllBanks(banks);
        
        // Prioritize last used bank if available
        if (lastUsedBankCode) {
          const lastUsedBankIndex = banks.findIndex(
            (bank) => bank.code === lastUsedBankCode,
          );
          if (lastUsedBankIndex > -1) {
            const lastUsedBank = banks.splice(lastUsedBankIndex, 1)[0];
            banks.unshift(lastUsedBank);
          }
        }
        
        // Only set the first few banks initially
        setVietQRBanks(banks.slice(0, INITIAL_BANK_COUNT));
        setIsBanksInitiallyLoading(false);
      }, BANK_LOAD_DELAY);

      return () => clearTimeout(timerId);
    };

    loadInitialBanks();
  }, [item?.type]);

  // Cleanup for editNavigationTimeoutRef
  useEffect(() => {
    return () => {
      if (editNavigationTimeoutRef.current) {
        clearTimeout(editNavigationTimeoutRef.current);
      }
    };
  }, []);

  // --- Callbacks ---
  const handleExpandPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const onEditPress = useCallback(
    throttle(() => {
      bottomSheetRef.current?.close();
      if (editNavigationTimeoutRef.current) {
        clearTimeout(editNavigationTimeoutRef.current);
      }
      editNavigationTimeoutRef.current = setTimeout(() => {
        router.push({
          pathname: `/(edit)/edit`,
          params: { id: id },
        });
      }, EDIT_NAVIGATION_DELAY);
    }, THROTTLE_WAIT),
    [id, router],
  );

  const onDeletePress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);

  // Handle loading more banks when user scrolls
  const handleLoadMoreBanks = useCallback(() => {
    if (vietQRBanks.length >= allBanks.length || isLoadingMoreBanks) return;
    
    setIsLoadingMoreBanks(true);
    
    // Add a small delay to prevent UI jank during scroll
    setTimeout(() => {
      const nextBatch = allBanks.slice(
        vietQRBanks.length, 
        vietQRBanks.length + BANK_BATCH_SIZE
      );
      
      setVietQRBanks(current => [...current, ...nextBatch]);
      setIsLoadingMoreBanks(false);
    }, 100);
  }, [vietQRBanks.length, allBanks, isLoadingMoreBanks]);

  const onDeleteItem = useCallback(async () => {
    if (!id || Array.isArray(id)) return;

    setIsSyncing(true);
    setIsToastVisible(true);
    setToastMessage(t("homeScreen.deleting"));

    try {
      await deleteQrCode(id);
      const updatedData = qrData.filter((qrItem) => qrItem.id !== id);
      const reindexedData = updatedData.map((qrItem, index) => ({
        ...qrItem,
        qr_index: index,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(reindexedData));
      await updateQrIndexes(reindexedData);

      setIsModalVisible(false);
      setIsToastVisible(false);
      router.replace("/home");
    } catch (error) {
      console.error("Error deleting QR code:", error);
      setToastMessage(t("homeScreen.deleteError"));
      setIsToastVisible(true);
      setIsModalVisible(false);
    } finally {
      setIsSyncing(false);
    }
  }, [id, qrData, dispatch, router]);

  const handleOpenMap = useCallback(() => {
    if (!item) return;
    const itemName = returnItemData(item.code, item.type);
    if (!itemName?.name) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      itemName.name,
    )}`;
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open Google Maps:", err);
      setIsToastVisible(true);
      setToastMessage(t("detailsScreen.failedToOpenGoogleMaps"));
    });
  }, [item]);

  const handleOpenBank = useCallback(
    async (code: string) => {
      let lowerCaseCode = code.toLowerCase();
      if (lowerCaseCode === "vib") lowerCaseCode = "vib-2";
      else if (lowerCaseCode === "acb") lowerCaseCode = "acb-biz";

      const url = `https://dl.vietqr.io/pay?app=${lowerCaseCode}`;

      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          storage.set(LAST_USED_BANK_KEY, code);

          if (item?.type === "store") {
            setVietQRBanks((currentBanks) => {
              const updatedBanks = [...currentBanks];
              const bankIndex = updatedBanks.findIndex((b) => b.code === code);
              if (bankIndex > 0) {
                const [selectedBank] = updatedBanks.splice(bankIndex, 1);
                updatedBanks.unshift(selectedBank);
                return updatedBanks;
              }
              return currentBanks;
            });
            
            // Also update allBanks for consistency
            setAllBanks((currentBanks) => {
              const updatedBanks = [...currentBanks];
              const bankIndex = updatedBanks.findIndex((b) => b.code === code);
              if (bankIndex > 0) {
                const [selectedBank] = updatedBanks.splice(bankIndex, 1);
                updatedBanks.unshift(selectedBank);
                return updatedBanks;
              }
              return currentBanks;
            });
          }
        } else {
          console.warn(`Cannot open URL: ${url}`);
          setIsToastVisible(true);
          setToastMessage(t("detailsScreen.cannotOpenBankApp"));
          await Linking.openURL("https://vietqr.io");
        }
      } catch (err) {
        console.error("Failed to open bank app:", err);
        setIsToastVisible(true);
        setToastMessage(t("detailsScreen.failedToOpenBankApp"));
      }
    },
    [item?.type],
  );

  const showTopToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
    setToastKey((prevKey) => prevKey + 1);
  }, []);

  const onVisibilityToggle = useCallback((isVisible: boolean) => {
    setIsTopToastVisible(isVisible);
  }, []);

  const onNavigateToSelectScreen = useCallback(() => {
    router.push({
      pathname: "/(auth)/(detail)/bank-select",
      params: { 
        banks: JSON.stringify(allBanks), // Send all banks to avoid reloading
        selectedBankCode: storage.getString(LAST_USED_BANK_KEY) || ""
      }
    });
  }, [router, allBanks]);

  const handleTransferAmount = useCallback(
    throttle(async () => {
      if (!item || !amount) return;

      if (isOffline) {
        showTopToast(t("detailsScreen.offlineMessage"));
        return;
      }

      setIsSyncing(true);
      setIsToastVisible(true);
      setToastMessage(t("detailsScreen.generatingQRCode"));

      try {
        const itemName = returnItemData(item.code, item.type);
        const message = `${t("detailsScreen.transferMessage")} ${
          item.account_name
        }`;
        const numericAmount = parseInt(amount.replace(/,/g, ""), 10);

        if (isNaN(numericAmount)) {
          throw new Error("Invalid amount format");
        }

        const response = await getVietQRData(
          item.account_number ?? "",
          item.account_name ?? "",
          itemName?.bin || "",
          numericAmount,
          message,
        );

        const qrCode = response?.data?.qrCode;
        if (!qrCode) {
          throw new Error("Failed to retrieve QR code from response");
        }

        router.replace({
          pathname: "/qr-screen",
          params: {
            metadata: qrCode,
            amount: amount,
            originalItem: encodeURIComponent(JSON.stringify(item)),
          },
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
        setToastMessage(t("detailsScreen.generateError"));
        setIsToastVisible(true);
        setIsSyncing(false);
      }
    }, THROTTLE_WAIT),
    [item, amount, router, showTopToast, isOffline],
  );

  const onCopyAccountNumber = useCallback(() => {
    if (item?.account_number) {
      Clipboard.setStringAsync(item.account_number);
      showTopToast(t("detailsScreen.copiedToClipboard"));
    }
  }, [item?.account_number, showTopToast]);

  // --- Render Functions ---
  const renderSuggestionItem = useCallback(
    ({ item: suggestionItem }: { item: string }) => (
      <Pressable
        onPress={() => setAmount(suggestionItem)}
        style={[styles.suggestionItem, { backgroundColor: buttonColor }]}
      >
        <ThemedText style={styles.suggestionText}>{suggestionItem}</ThemedText>
      </Pressable>
    ),
    [buttonColor],
  );

  const renderPaymentMethodItem = useCallback(
    ({ item: bankItem }: { item: BankItem }) => (
      <Pressable
        style={[styles.bankItemPressable, { backgroundColor: buttonColor }]}
        onPress={() => handleOpenBank(bankItem.code)}
      >
        <View style={styles.bankIconContainer}>
          <Image
            source={getIconPath(bankItem.code)}
            style={styles.bankIcon}
            resizeMode="contain"
          />
        </View>
        <ThemedText
          numberOfLines={1}
          style={[styles.bankItemText, { color: buttonTextColor }]}
        >
          {bankItem.name}
        </ThemedText>
      </Pressable>
    ),
    [handleOpenBank, buttonColor, buttonTextColor],
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.loadingSkeleton}>
        <ActivityIndicator
          size={getResponsiveFontSize(25)}
          color={iconColor}
        />
      </View>
    ),
    [iconColor],
  );
  
  // Add footer component for bank list
  const renderBankListFooter = useCallback(() => {
    if (isLoadingMoreBanks) {
      return (
        <View style={styles.bankListFooter}>
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      );
    }
    if (vietQRBanks.length < allBanks.length) {
      return (
        <Pressable 
          style={[styles.bankItemPressable, { backgroundColor: buttonColor }]}
          onPress={handleLoadMoreBanks}
        >
          <View style={styles.bankIconContainer}>
            <MaterialCommunityIcons 
              name="dots-horizontal" 
              size={getResponsiveFontSize(24)} 
              color={iconColor} 
            />
          </View>
          <ThemedText 
            numberOfLines={1}
            style={[styles.bankItemText, { color: buttonTextColor }]}
          >
            {t("detailsScreen.loadMore")}
          </ThemedText>
        </Pressable>
      );
    }
    return null;
  }, [isLoadingMoreBanks, vietQRBanks.length, allBanks.length, iconColor, buttonColor, buttonTextColor, handleLoadMoreBanks]);

  // --- Main Render ---
  if (!item) {
    return (
      <ThemedView style={styles.loadingWrapper}>
        <ThemedText>{t("detailsScreen.noItemFound")}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      style={[{ backgroundColor: backgroundColor, flex: 1 }]}
      contentContainerStyle={styles.container}
      enableOnAndroid={Platform.OS === "android"}
      enableAutomaticScroll={Platform.OS === "ios"}
      extraScrollHeight={Platform.OS === "ios" ? 0 : -getResponsiveHeight(5)}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerWrapper}>
        <ThemedButton onPress={router.back} iconName="chevron-left" />
        <ThemedButton onPress={handleExpandPress} iconName="dots-vertical" />
      </View>

      {/* Pinned Card */}
      <ThemedPinnedCard
        style={styles.pinnedCardWrapper}
        metadata_type={item.metadata_type}
        code={item.code}
        type={item.type}
        metadata={item.metadata}
        accountName={item.account_name}
        accountNumber={item.account_number}
        onAccountNumberPress={onCopyAccountNumber}
      />

      {/* Info Section (Map, Transfer, Bank List) */}
      {(item.type === "bank" || item.type === "store") && (
        <View style={[styles.infoWrapper, { backgroundColor: cardColor }]}>
          {/* Map Action */}
          <Pressable onPress={handleOpenMap} style={styles.actionButton}>
            <View style={styles.actionHeader}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={getResponsiveFontSize(16)}
                color={iconColor}
              />
              <ThemedText style={styles.labelText}>
                {t("detailsScreen.nearbyLocation")}
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={getResponsiveFontSize(16)}
              color={iconColor}
            />
          </Pressable>

          {/* Transfer Section (Bank Only) */}
          {item.type === "bank" && (
            <View style={styles.transferContainer}>
              <View style={styles.transferHeader}>
                <MaterialCommunityIcons
                  name="qrcode"
                  size={getResponsiveFontSize(16)}
                  color={iconColor}
                />
                <ThemedText style={styles.labelText}>
                  {t("detailsScreen.createQrCode")}
                </ThemedText>
              </View>
              <View style={styles.transferSection}>
                {/* Input */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.inputField, { color: textColor }]}
                    placeholder={t("detailsScreen.receivePlaceholder")}
                    keyboardType="numeric"
                    value={amount}
                    placeholderTextColor={placeholderColor}
                    onChangeText={(text) => setAmount(formatAmount(text))}
                  />
                  {amount ? (
                    <Pressable
                      hitSlop={styles.hitSlop}
                      onPress={() => setAmount("")}
                      style={styles.clearButton}
                    >
                      <MaterialCommunityIcons
                        name={"close-circle"}
                        size={getResponsiveFontSize(16)}
                        color={iconColor}
                      />
                    </Pressable>
                  ) : null}
                  <View
                    style={[
                      styles.currencyContainer,
                      { borderColor: currencyBorderColor },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.currencyText,
                        { color: currencyTextColor },
                      ]}
                    >
                      đ
                    </ThemedText>
                  </View>
                  <Pressable
                    hitSlop={styles.hitSlop}
                    onPress={handleTransferAmount}
                    style={[
                      styles.transferButton,
                      { opacity: amount ? 1 : 0.3 },
                    ]}
                    disabled={!amount || isSyncing}
                  >
                    <MaterialCommunityIcons
                      name={"chevron-right"}
                      size={getResponsiveFontSize(16)}
                      color={iconColor}
                    />
                  </Pressable>
                </View>
                {/* Suggestions */}
                <FlatList
                  data={dynamicSuggestions}
                  horizontal
                  style={styles.suggestionList}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(suggItem, index) =>
                    `suggestion-${suggItem}-${index}`
                  }
                  contentContainerStyle={styles.suggestionListContent}
                  renderItem={renderSuggestionItem}
                  initialNumToRender={4}
                  maxToRenderPerBatch={4}
                  windowSize={5}
                />
              </View>
            </View>
          )}

          {/* Bank Transfer Section (Store Only) */}
          {item.type === "store" && (
            <View style={styles.bottomContainer}>
              <Pressable
                onPress={onNavigateToSelectScreen}
                style={styles.bottomTitle}
              >
                <View style={styles.bankTransferHeader}>
                  <MaterialCommunityIcons
                    name="bank-outline"
                    size={getResponsiveFontSize(18)}
                    color={iconColor}
                  />
                  <ThemedText>{t("detailsScreen.bankTransfer")}</ThemedText>
                  <Image
                    source={require("@/assets/images/vietqr.png")}
                    style={styles.vietQRLogo}
                    resizeMode="contain"
                  />
                </View>
                <MaterialCommunityIcons
                  name="magnify"
                  size={getResponsiveFontSize(18)}
                  color={iconColor}
                />
              </Pressable>
              <FlatList
                data={vietQRBanks}
                horizontal
                style={styles.bankList}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(bankItem) => bankItem.code}
                contentContainerStyle={styles.bankListContent}
                renderItem={renderPaymentMethodItem}
                ListEmptyComponent={isBanksInitiallyLoading ? renderEmptyComponent : null}
                ListFooterComponent={renderBankListFooter}
                onEndReached={handleLoadMoreBanks}
                onEndReachedThreshold={0.3}
                initialNumToRender={INITIAL_BANK_COUNT}
                maxToRenderPerBatch={BANK_BATCH_SIZE}
                windowSize={3}
              />
            </View>
          )}
        </View>
      )}

      {/* Bottom Sheet */}
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={t("homeScreen.manage")}
        snapPoints={["25%"]}
        customContent={
          <SettingSheetContent onEdit={onEditPress} onDelete={onDeletePress} />
        }
      />

      {/* Modals and Toasts */}
      <ThemedModal
        primaryActionText={t("homeScreen.move")}
        onPrimaryAction={onDeleteItem}
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t("homeScreen.cancel")}
        title={t("homeScreen.confirmDeleteTitle")}
        message={t("homeScreen.confirmDeleteMessage")}
        isVisible={isModalVisible}
        iconName="delete-outline"
      />
      <ThemedTopToast
        key={toastKey}
        isVisible={isTopToastVisible}
        message={topToastMessage}
        onVisibilityToggle={onVisibilityToggle}
      />
      {/* Status Toast should be rendered last to appear on top */}
      <ThemedStatusToast
        isSyncing={isSyncing}
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
      />
    </KeyboardAwareScrollView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    paddingBottom: getResponsiveHeight(5),
    paddingHorizontal: getResponsiveWidth(3.6),
    flexGrow: 1
  },
  headerWrapper: {
    paddingTop: getResponsiveHeight(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: getResponsiveHeight(3.6),
  },
  pinnedCardWrapper: {
    marginBottom: getResponsiveHeight(3.6),
  },
  infoWrapper: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    marginBottom: getResponsiveHeight(3.6),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  labelText: {
    fontSize: getResponsiveFontSize(16),
  },
  transferContainer: {
    // Container for header, input, and suggestions
  },
  transferHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingTop: getResponsiveHeight(1.8),
    paddingBottom: getResponsiveHeight(0.6),
    gap: getResponsiveWidth(2.4),
  },
  transferSection: {
    gap: getResponsiveHeight(1.2),
    paddingBottom: getResponsiveHeight(1.8),
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  inputField: {
    paddingVertical: getResponsiveHeight(1.2),
    fontSize: getResponsiveFontSize(16),
    flexGrow: 1,
    flexShrink: 1,
  },
  clearButton: {
    padding: getResponsiveWidth(1.2),
    marginLeft: getResponsiveWidth(1.2),
  },
  transferButton: {
    padding: getResponsiveWidth(1.2),
    marginLeft: getResponsiveWidth(1.2),
  },
  hitSlop: {
    bottom: getResponsiveHeight(1.2),
    left: getResponsiveWidth(2.4),
    right: getResponsiveWidth(2.4),
    top: getResponsiveHeight(1.2),
  },
  loadingSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: getResponsiveHeight(9.6),
    width: '100%',
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  bankListFooter: {
    paddingHorizontal: getResponsiveWidth(2),
    justifyContent: 'center',
    alignItems: 'center',
    height: getResponsiveHeight(9.6),
    width: getResponsiveWidth(16.8),
  },
  bankListContent: {
    gap: getResponsiveWidth(2.4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingBottom: getResponsiveHeight(1.8),
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100%',
  },
  bankItemPressable: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    height: getResponsiveHeight(9.6),
    width: getResponsiveWidth(16.8),
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    gap: getResponsiveHeight(0.36),
    padding: getResponsiveWidth(1),
  },
  bankIcon: {
    width: "55%",
    height: "55%",
  },
  bankIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: getResponsiveWidth(8.4),
    height: getResponsiveWidth(8.4),
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(4.2),
    overflow: "hidden",
  },
  bankItemText: {
    fontSize: getResponsiveFontSize(12),
    maxWidth: "90%",
    textAlign: "center",
  },
  vietQRLogo: {
    height: getResponsiveHeight(3.6),
    width: getResponsiveWidth(16.8),
  },
  currencyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    borderRadius: getResponsiveWidth(3),
    overflow: "hidden",
    marginHorizontal: getResponsiveWidth(2.4),
    borderWidth: 1,
  },
  currencyText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "500",
    textAlign: "center",
  },
  suggestionList: {
    // Flex grow isn't needed for horizontal list
  },
  suggestionListContent: {
    gap: getResponsiveWidth(2.4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(0.6),
  },
  suggestionItem: {
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingVertical: getResponsiveHeight(0.9),
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionText: {
    fontSize: getResponsiveFontSize(14),
  },
  bankList: {
    flexGrow: 1
  },
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(2),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    zIndex: 10,
  },
  bottomContainer: {
    flexDirection: "column",
  },
  bankTransferHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
  },
  bottomTitle: {
    flexDirection: "row",
    gap: getResponsiveWidth(2.4),
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingTop: getResponsiveHeight(1.8),
    paddingBottom: getResponsiveHeight(1.2),
  },
});

export default DetailScreen;
