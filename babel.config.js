module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NOTE: worklets plugin (Reanimated 4) MUST stay last (see CLAUDE.md gotchas)
    plugins: ['react-native-worklets/plugin'],
  };
};
