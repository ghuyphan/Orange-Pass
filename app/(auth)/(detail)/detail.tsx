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
  Platform, // Import Platform
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
const SUGGESTION_MULTIPLIERS = [1000, 10000, 100000, 1000000]; // Define multipliers
const LAST_USED_BANK_KEY = "lastUsedBank";
const BANK_LOAD_DELAY = 300;
const EDIT_NAVIGATION_DELAY = 10;
const THROTTLE_WAIT = 500;

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
    return result.toLocaleString("en-US"); // Use localeString for large numbers
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
  // Consider if brightness needs to be max on this screen vs. the QR screen
  // useUnmountBrightness(1, true);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const editNavigationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for edit navigation timeout

  const [toastKey, setToastKey] = useState(0);
  const [amount, setAmount] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [vietQRBanks, setVietQRBanks] = useState<BankItem[]>([]);

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

  // *** Dynamic suggestion list based on user input and multipliers ***
  const dynamicSuggestions = useMemo(() => {
    const numericString = amount.replace(/,/g, ""); // Get raw digits

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
      return DEFAULT_AMOUNT_SUGGESTIONS; // Fallback
    }
  }, [amount]);

  // Load banks effect
  useEffect(() => {
    const loadBanks = async () => {
      if (item?.type !== "store") return;
      const lastUsedBankCode = storage.getString(LAST_USED_BANK_KEY);
      let banks = returnItemsByType("vietqr"); // Assuming this might be slow
      if (lastUsedBankCode) {
        const lastUsedBankIndex = banks.findIndex(
          (bank) => bank.code === lastUsedBankCode,
        );
        if (lastUsedBankIndex > -1) {
          // Check if found
          const lastUsedBank = banks.splice(lastUsedBankIndex, 1)[0];
          banks.unshift(lastUsedBank);
        }
      }
      setVietQRBanks(banks);
    };

    // Delay bank loading slightly to prevent transition lag
    const timerId = setTimeout(() => {
      loadBanks();
    }, BANK_LOAD_DELAY);

    return () => clearTimeout(timerId); // Cleanup timeout
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
      router.replace("/home"); // Navigate back after successful deletion
    } catch (error) {
      console.error("Error deleting QR code:", error);
      setToastMessage(t("homeScreen.deleteError"));
      setIsToastVisible(true); // Keep toast visible on error
      setIsModalVisible(false); // Close modal even on error
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
      setIsToastVisible(true); // Use the status toast for this error
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
                // Only move if not already first
                const [selectedBank] = updatedBanks.splice(bankIndex, 1);
                updatedBanks.unshift(selectedBank);
                return updatedBanks;
              }
              return currentBanks; // Return unchanged if already first or not found
            });
          }
        } else {
          console.warn(`Cannot open URL: ${url}`);
          setIsToastVisible(true); // Use status toast
          setToastMessage(t("detailsScreen.cannotOpenBankApp"));
          await Linking.openURL("https://vietqr.io");
        }
      } catch (err) {
        console.error("Failed to open bank app:", err);
        setIsToastVisible(true); // Use status toast
        setToastMessage(t("detailsScreen.failedToOpenBankApp"));
      }
    },
    [item?.type], // Dependencies: only item type affects the logic here
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
    router.push("/(auth)/(detail)/bank-select");
  }, [router]);

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
            amount: amount, // Pass the formatted amount string
            originalItem: encodeURIComponent(JSON.stringify(item)),
          },
        });
        // Success: Don't hide toast immediately, let navigation happen
      } catch (error) {
        console.error("Error generating QR code:", error);
        setToastMessage(t("detailsScreen.generateError"));
        setIsToastVisible(true); // Keep toast visible on error
        setIsSyncing(false); // Stop syncing indicator on error
      } finally {
        // Only set syncing false here if it wasn't already set in catch
        // setIsSyncing(false); // Moved to catch block for error case
        // Let the QR screen handle hiding the toast or further actions
      }
    }, THROTTLE_WAIT),
    [item, amount, router, showTopToast, isOffline], // Added isOffline
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
        onPress={() => setAmount(suggestionItem)} // Set input to the full suggestion
        style={[styles.suggestionItem, { backgroundColor: buttonColor }]}
      >
        <ThemedText style={styles.suggestionText}>{suggestionItem}</ThemedText>
      </Pressable>
    ),
    [buttonColor], // Depends only on buttonColor (derived from theme)
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
      enableOnAndroid={Platform.OS === "android"} // Enable specifically for Android
      enableAutomaticScroll={Platform.OS === "ios"} // Default behavior for iOS
      extraScrollHeight={Platform.OS === "ios" ? 0 : -getResponsiveHeight(5)} // Adjust extra scroll height, potentially platform-specific
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
                    value={amount} // Value is the user's potentially partial input
                    placeholderTextColor={placeholderColor}
                    // Update amount state, formatting happens here
                    onChangeText={(text) => setAmount(formatAmount(text))}
                  />
                  {amount ? ( // Show clear button only if there's text
                    <Pressable
                      hitSlop={styles.hitSlop}
                      onPress={() => setAmount("")} // Clear input
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
                    onPress={handleTransferAmount} // Uses the current 'amount' state
                    style={[
                      styles.transferButton,
                      { opacity: amount ? 1 : 0.3 },
                    ]}
                    disabled={!amount || isSyncing} // Disable if no amount or syncing
                  >
                    <MaterialCommunityIcons
                      name={"chevron-right"} // Always show right arrow
                      size={getResponsiveFontSize(16)}
                      color={iconColor}
                    />
                  </Pressable>
                </View>
                {/* Suggestions */}
                <FlatList
                  data={dynamicSuggestions} // Use the NEW dynamic list
                  horizontal
                  style={styles.suggestionList}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(suggItem, index) =>
                    `suggestion-${suggItem}-${index}`
                  } // Add index for safety
                  contentContainerStyle={styles.suggestionListContent}
                  renderItem={renderSuggestionItem} // renderSuggestionItem now sets the full suggestion
                  initialNumToRender={4} // Render a bit more initially
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
                ListEmptyComponent={renderEmptyComponent}
              />
            </View>
          )}
        </View>
      )}

      {/* Bottom Sheet */}
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={t("homeScreen.manage")}
        snapPoints={["25%"]} // Adjust if content height changes
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
        key={toastKey} // Use key to re-trigger animation
        isVisible={isTopToastVisible}
        message={topToastMessage}
        onVisibilityToggle={onVisibilityToggle}
      />
      {/* Status Toast should be rendered last to appear on top */}
      <ThemedStatusToast
        isSyncing={isSyncing}
        isVisible={isToastVisible}
        message={toastMessage}
        // iconName="wifi-off" // Consider if icon is always needed
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer} // Ensure zIndex is high
      />
    </KeyboardAwareScrollView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    paddingBottom: getResponsiveHeight(5), // Add padding at the bottom
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
    // Removed marginTop as headerWrapper provides top space
    marginBottom: getResponsiveHeight(3.6),
  },
  infoWrapper: {
    // paddingBottom: getResponsiveHeight(1.8), // Removed paddingBottom, rely on inner content spacing
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden", // Keep overflow hidden
    marginBottom: getResponsiveHeight(3.6), // Add margin below info section
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    // Removed gap, rely on justify-content
    // Removed borderRadius and overflow, handled by infoWrapper
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
    paddingTop: getResponsiveHeight(1.8), // Add top padding
    paddingBottom: getResponsiveHeight(0.6), // Reduce bottom padding
    gap: getResponsiveWidth(2.4),
  },
  transferSection: {
    gap: getResponsiveHeight(1.2),
    paddingBottom: getResponsiveHeight(1.8), // Add padding below suggestions
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(4.8),
    // No vertical padding needed here
  },
  inputField: {
    // marginVertical: getResponsiveHeight(1.8), // Remove vertical margin
    paddingVertical: getResponsiveHeight(1.2), // Use padding instead
    fontSize: getResponsiveFontSize(16),
    flexGrow: 1,
    flexShrink: 1, // Allow shrinking
  },
  clearButton: {
    padding: getResponsiveWidth(1.2), // Add padding for easier tap
    marginLeft: getResponsiveWidth(1.2),
  },
  transferButton: {
    padding: getResponsiveWidth(1.2), // Add padding for easier tap
    marginLeft: getResponsiveWidth(1.2),
  },
  hitSlop: {
    // Define hitSlop for easier tapping
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
    height: getResponsiveHeight(9.6), // Match bank item height
    paddingHorizontal: getResponsiveWidth(4.8), // Match bank list padding
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
    padding: getResponsiveWidth(1), // Add small padding
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
    backgroundColor: "white", // Keep white background for visibility
    borderRadius: getResponsiveWidth(4.2), // Make it circular
    overflow: "hidden",
  },
  bankItemText: {
    fontSize: getResponsiveFontSize(12),
    maxWidth: "90%", // Allow slightly more width
    textAlign: "center",
  },
  vietQRLogo: {
    height: getResponsiveHeight(3.6),
    width: getResponsiveWidth(16.8),
    // Removed negative margin
  },
  currencyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: getResponsiveWidth(6), // Slightly wider
    height: getResponsiveWidth(6), // Slightly wider
    borderRadius: getResponsiveWidth(3), // Circular
    overflow: "hidden",
    marginHorizontal: getResponsiveWidth(2.4), // Adjust spacing
    borderWidth: 1,
  },
  currencyText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "500", // Slightly bolder
    textAlign: "center", // Center text
    // Removed marginRight
  },
  suggestionList: {
    // Flex grow isn't needed for horizontal list
  },
  suggestionListContent: {
    gap: getResponsiveWidth(2.4),
    paddingHorizontal: getResponsiveWidth(4.8), // Match input wrapper padding
    paddingVertical: getResponsiveHeight(0.6), // Add slight vertical padding
  },
  suggestionItem: {
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingVertical: getResponsiveHeight(0.9), // Slightly taller
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    justifyContent: "center", // Center text vertically
    alignItems: "center", // Center text horizontally
  },
  suggestionText: {
    fontSize: getResponsiveFontSize(14), // Slightly smaller for consistency
  },
  bankList: {
    // Flex grow isn't needed
  },
  bankListContent: {
    gap: getResponsiveWidth(2.4), // Reduce gap slightly
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingBottom: getResponsiveHeight(1.8), // Add padding below bank list
    // flexGrow: 1, // Remove flexGrow
  },
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(2), // Adjust position slightly
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    zIndex: 10, // Ensure it's above other elements
  },
  bottomContainer: {
    flexDirection: "column",
    // Removed borderRadius, handled by infoWrapper
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
    paddingTop: getResponsiveHeight(1.8), // Add top padding
    paddingBottom: getResponsiveHeight(1.2), // Add bottom padding before list
  },
});

export default DetailScreen;
