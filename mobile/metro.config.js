const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add webp to supported asset extensions
if (!config.resolver.assetExts.includes('webp')) {
  config.resolver.assetExts.push('webp');
}

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const absolutePath = path.resolve(__dirname, moduleName.slice(2));
    return context.resolveRequest(context, absolutePath, platform);
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
