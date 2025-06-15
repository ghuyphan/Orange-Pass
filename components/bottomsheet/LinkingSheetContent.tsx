import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Linking,
  Alert,
  StyleProp,
  ViewStyle,
  Pressable,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/buttons";
import { ThemedModal } from "../modals/ThemedIconModal";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import { getResponsiveHeight, getResponsiveWidth } from "@/utils/responsive";
import { t } from "@/i18n";
import { useGlassStyle } from "@/hooks/useGlassStyle";

interface LinkingSheetContentProps {
  url: string | null;
  style?: StyleProp<ViewStyle>;
  onCopySuccess?: () => void;
}

const LinkingSheetContent: React.FC<LinkingSheetContentProps> = ({
  url,
  style,
  onCopySuccess,
}) => {
  const { currentTheme } = useTheme();
    const cardBackgroundColor = currentTheme === "dark" ? Colors.dark.cardBackground : Colors.light.cardBackground;
  const { overlayColor, borderColor } = useGlassStyle();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalIcon, setModalIcon] =
    useState<keyof typeof MaterialIcons.glyphMap>();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDescription, setModalDescription] = useState<string | null>(null);

  const colors = {
    error: currentTheme === "light" ? Colors.light.error : Colors.dark.error,
    icon: currentTheme === "light" ? Colors.light.icon : Colors.dark.icon,
    inputBg:
      currentTheme === "light"
        ? Colors.light.inputBackground
        : Colors.dark.inputBackground,
  };

  const handleCopyLink = async () => {
    if (!url) return;
    onCopySuccess?.();
    try {
      await Clipboard.setStringAsync(url);
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  const handleShare = async () => {
    if (!url) return;
    try {
      await Share.share({
        message: url,
        url: url, // iOS only
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share link");
    }
  };

  const handleOpenLink = async () => {
    if (!url) return;

    if (url.startsWith("http://")) {
      setIsModalVisible(true);
      setModalIcon("warning");
      setModalTitle(t("homeScreen.linkingSheet.securityWarningTitle"));
      setModalDescription(t("homeScreen.linkingSheet.securityWarningMessage"));
    } else {
      try {
        await Linking.openURL(url);
      } catch {
        Alert.alert("Error", "Unable to open this link");
      }
    }
  };

  if (!url) return null;

  const isInsecure = url.startsWith("http://");
  const displayUrl = url.length > 45 ? url.substring(0, 45) + "..." : url;
  const onOpenUrl = () => {
    Linking.openURL(url);
    setTimeout(() => {
      setIsModalVisible(false);
    }, 200);
  };

  return (
    <View style={[styles.container, { borderColor }, style]}>
      <View
        style={[styles.defaultOverlay, { backgroundColor: cardBackgroundColor }]}
      />
      <View style={styles.contentWrapper}>
        <ThemedModal
          onPrimaryAction={onOpenUrl}
          primaryActionText={t("homeScreen.linkingSheet.openAnyway")}
          onSecondaryAction={() => setIsModalVisible(false)}
          iconName={modalIcon}
          title={modalTitle || ""}
          message={modalDescription || ""}
          isVisible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
        />

        <Pressable
          onPress={handleCopyLink}
          style={[
            styles.urlCard,
            {
              borderColor,
              backgroundColor: colors.inputBg,
            },
          ]}
        >
          <View style={styles.urlRow}>
            <MaterialCommunityIcons
              name={isInsecure ? "lock-open" : "lock"}
              size={16}
              color={isInsecure ? colors.error : colors.icon}
            />
            <ThemedText style={styles.urlText} numberOfLines={1}>
              {displayUrl}
            </ThemedText>
          </View>
          <MaterialCommunityIcons
            name="content-copy"
            size={16}
            color={colors.icon}
          />
        </Pressable>

        {isInsecure && (
          <View style={styles.warningContainer}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={14}
              color={colors.error}
            />
            <ThemedText style={[styles.warningText, { color: colors.error }]}>
              {t("homeScreen.linkingSheet.warning")}
            </ThemedText>
          </View>
        )}

        <View style={styles.actionButtons}>
          <ThemedButton
            iconName="share-variant"
            onPress={handleShare}
            label={t("homeScreen.linkingSheet.share")}
            style={styles.actionButton}
          />
          <ThemedButton
            iconName="open-in-new"
            onPress={handleOpenLink}
            label={t("homeScreen.linkingSheet.open")}
            style={styles.actionButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    marginHorizontal: getResponsiveWidth(3.6),
    borderWidth: 1,
    overflow: "hidden",
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  contentWrapper: {
    zIndex: 1,
    gap: 15,
  },
  urlCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  urlText: {
    fontSize: 15,
    flex: 1,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 8,
    paddingVertical: getResponsiveHeight(1),
    paddingHorizontal: getResponsiveWidth(2.4),
  },
  warningText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    height: 44,
  },
});

export default LinkingSheetContent;