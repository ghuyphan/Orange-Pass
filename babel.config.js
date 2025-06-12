module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Worklets must come before Reanimated
      ["react-native-worklets-core/plugin"],
      // Reanimated MUST be the last plugin
      'react-native-reanimated/plugin',
    ],
  };
};