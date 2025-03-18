import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
// import { updateAvatarConfig } from '@/store/reducers/authSlice';
import Avatar from '@zamplyy/react-native-nice-avatar';
import { t } from '@/i18n';
import { getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const EditAvatarScreen = () => {
  const dispatch = useDispatch();
  const currentAvatarConfig = useSelector((state: RootState) => state.auth.avatarConfig);
  const [avatarConfig, setAvatarConfig] = useState(currentAvatarConfig);

  // Example options for avatar properties
  const faceColors = ['#F9C9B6', '#FFD700', '#FFA07A', '#87CEEB'];
  const hairStyles = ['normal', 'curly', 'wavy', 'bald'];
  const hairColors = ['#D2EFF3', '#000000', '#8B4513', '#FFC0CB'];
  const shirtStyles = ['short', 'long', 'hoodie', 'tank'];
  const shirtColors = ['#F4D150', '#FF0000', '#00FF00', '#0000FF'];

  // Helper function to cycle through options
  const cycleOption = (options, currentValue, direction) => {
    const currentIndex = options.indexOf(currentValue);
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    return options[nextIndex];
  };

  const handleSave = () => {
    dispatch(updateAvatarConfig(avatarConfig));
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title} type="title">
        {t('editAvatarScreen.title')}
      </ThemedText>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.avatarContainer}>
          <Avatar size={getResponsiveWidth(20)} {...avatarConfig} />
        </View>

        {/* Face Color Selector */}
        <View style={styles.selectorContainer}>
          <ThemedText style={styles.label}>Face Color</ThemedText>
          <View style={styles.arrowContainer}>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  faceColor: cycleOption(faceColors, avatarConfig.faceColor, -1),
                })
              }
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText style={styles.optionText}>{avatarConfig.faceColor}</ThemedText>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  faceColor: cycleOption(faceColors, avatarConfig.faceColor, 1),
                })
              }
            >
              <MaterialIcons name="arrow-forward" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hair Style Selector */}
        <View style={styles.selectorContainer}>
          <ThemedText style={styles.label}>Hair Style</ThemedText>
          <View style={styles.arrowContainer}>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  hairStyle: cycleOption(hairStyles, avatarConfig.hairStyle, -1),
                })
              }
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText style={styles.optionText}>{avatarConfig.hairStyle}</ThemedText>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  hairStyle: cycleOption(hairStyles, avatarConfig.hairStyle, 1),
                })
              }
            >
              <MaterialIcons name="arrow-forward" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hair Color Selector */}
        <View style={styles.selectorContainer}>
          <ThemedText style={styles.label}>Hair Color</ThemedText>
          <View style={styles.arrowContainer}>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  hairColor: cycleOption(hairColors, avatarConfig.hairColor, -1),
                })
              }
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText style={styles.optionText}>{avatarConfig.hairColor}</ThemedText>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  hairColor: cycleOption(hairColors, avatarConfig.hairColor, 1),
                })
              }
            >
              <MaterialIcons name="arrow-forward" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Shirt Style Selector */}
        <View style={styles.selectorContainer}>
          <ThemedText style={styles.label}>Shirt Style</ThemedText>
          <View style={styles.arrowContainer}>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  shirtStyle: cycleOption(shirtStyles, avatarConfig.shirtStyle, -1),
                })
              }
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText style={styles.optionText}>{avatarConfig.shirtStyle}</ThemedText>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  shirtStyle: cycleOption(shirtStyles, avatarConfig.shirtStyle, 1),
                })
              }
            >
              <MaterialIcons name="arrow-forward" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Shirt Color Selector */}
        <View style={styles.selectorContainer}>
          <ThemedText style={styles.label}>Shirt Color</ThemedText>
          <View style={styles.arrowContainer}>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  shirtColor: cycleOption(shirtColors, avatarConfig.shirtColor, -1),
                })
              }
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText style={styles.optionText}>{avatarConfig.shirtColor}</ThemedText>
            <TouchableOpacity
              onPress={() =>
                setAvatarConfig({
                  ...avatarConfig,
                  shirtColor: cycleOption(shirtColors, avatarConfig.shirtColor, 1),
                })
              }
            >
              <MaterialIcons name="arrow-forward" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ThemedButton
        label={t('editAvatarScreen.save')}
        onPress={handleSave}
        style={styles.saveButton}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingTop: getResponsiveHeight(3.6),
  },
  title: {
    fontSize: getResponsiveWidth(6),
    marginBottom: getResponsiveHeight(2),
  },
  scrollContainer: {
    paddingBottom: getResponsiveHeight(10),
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveHeight(3.6),
  },
  selectorContainer: {
    marginBottom: getResponsiveHeight(2),
  },
  label: {
    fontSize: getResponsiveWidth(4),
    marginBottom: getResponsiveHeight(1),
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: getResponsiveWidth(4),
    marginHorizontal: getResponsiveWidth(2),
  },
  saveButton: {
    marginTop: getResponsiveHeight(2),
    position: 'absolute',
    bottom: getResponsiveHeight(2),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
  },
});

export default EditAvatarScreen;
