const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * The phone app shares the calculation module with the web app and the API (../shared/calc): Metro must watch that
 * folder so `import … from '../../../shared/calc/inspection.js'` resolves.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '../shared')],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
