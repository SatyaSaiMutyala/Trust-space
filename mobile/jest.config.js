module.exports = {
  preset: '@react-native/jest-preset',
  // Libraries shipped as untranspiled ES modules must go through Babel too.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-redux|@reduxjs|immer|reselect|react-native-size-matters|react-native-screens|react-native-safe-area-context)/)',
  ],
};
