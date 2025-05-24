import { StyleSheet, View } from 'react-native';

import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedEmptyCard } from '@/components/cards/ThemedEmptyCard';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { t } from '@/i18n';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

export default function EmptyScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const dropdownOptions = [
    { label: ('homeScreen.fab.add'), onPress: () => onNavigateToAddScreen(), icon: 'plus-circle' },
    { label: ('homeScreen.fab.scan'), onPress: () => onNavigateToScanScreen(), icon: 'camera' },

  ];
  const onNavigateToScanScreen = () => {
    router.push('/(scan)/scan-main');
  };
const onNavigateToAddScreen = () => {
  router.push(`/(auth)/(add)/add-new`);
}
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor:
            colorScheme === 'light' ? Colors.light.background : Colors.dark.background,
        },
      ]}
    >
      <ThemedView style={styles.container}>
        <ThemedEmptyCard
          headerLabel={('homeScreen.emptyCard.header')}
          footerLabel={('homeScreen.emptyCard.footer')}
          footButtonLabel={('homeScreen.emptyCard.footerButton')}
          cardOnPress={() => { }}
          buttonOnPress={onNavigateToScanScreen}
          style={{ paddingTop: getResponsiveHeight(8.3) }}
          footerStyle={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          paddingTop={getResponsiveHeight(3)}
          dropdownOptions={dropdownOptions}
          menuElevation={0}
        />
        <ThemedText style={styles.content} type="default">
          {t('homeScreen.emptyCard.content')}
        </ThemedText>
      </ThemedView>
      <View style={styles.headerContainer}>
        <ThemedButton onPress={router.back} iconName="chevron-left" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    gap: getResponsiveWidth(2),
  },
  content: {
    paddingHorizontal: getResponsiveWidth(3.6),
    fontSize: getResponsiveFontSize(16),
    marginTop: getResponsiveHeight(2),
    lineHeight: getResponsiveFontSize(25),
  },
  headerContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + getResponsiveHeight(4.5),
    left: getResponsiveWidth(3.6),
    zIndex: 10,
  },
});