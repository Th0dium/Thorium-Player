const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    // Optimize with RAM bundle for faster startup (opt-in via command line)
    // bundler: { enableBabelRCLookup: false },

    // Optimize serialization performance
    serializer: {
        // Use RAM bundle for faster app startup from secondary calls
        isDevMode: true,
    },

    // Reduce watcher overhead (for development only)
    watchman: {
        healthCheck: {
            enabled: false,
        },
    },

    // Increase max workers for parallelization
    maxWorkers: require('os').cpus().length,

    // Optimize transformation
    transformer: {
        minifierPath: 'metro-minify-terser',
        minifierConfig: {
            compress: {
                pure_funcs: ['console.log', 'console.debug'],
            },
        },
        publicPath: '/assets/',
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
