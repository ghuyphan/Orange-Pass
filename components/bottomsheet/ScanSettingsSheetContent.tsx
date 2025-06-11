// components/bottomsheet/ScanSettingsSheetContent.tsx
import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { t } from '@/i18n';
import { getResponsiveWidth } from '@/utils/responsive';

interface ScanSettingsSheetContentProps {
  showIndicator: boolean; // This is the primary setting now
  onToggleShowIndicator: () => void;
  onNavigateToSettings: () => void;
}

export default function ScanSettingsSheetContent({
  showIndicator,
  onToggleShowIndicator,
  onNavigateToSettings,
}: ScanSettingsSheetContentProps) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.settingRow}>
        <ThemedText style={styles.settingText}>
          {t('scanScreen.showIndicator')}
        </ThemedText>
        <Switch value={showIndicator} onValueChange={onToggleShowIndicator} />
      </View>

      {/* Removed Auto Brightness and Quick Scan settings */}

      <ThemedButton
        label={t('scanScreen.appSettings')}
        onPress={onNavigateToSettings}
        style={styles.settingsButton}
        textStyle={styles.settingsButtonText}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: getResponsiveWidth(4),
    paddingVertical: getResponsiveWidth(2),
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsiveWidth(3.5),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  settingText: {
    fontSize: 16,
    flex: 1,
  },
  settingsButton: {
    marginTop: getResponsiveWidth(5),
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});