const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 3D model assets
config.resolver.assetExts.push('glb', 'gltf', 'hdr');

// Pin EVERY `import ... from 'three'` (ours AND three/examples') to one
// single build file. Without this, Metro can resolve the CJS build for app
// code and the ESM build for the examples loaders — two parallel Three.js
// instances ("THREE.WARNING: Multiple instances"), broken instanceof checks,
// and models that silently fail to appear.
const THREE_ENTRY = path.resolve(__dirname, 'node_modules/three/build/three.cjs');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: THREE_ENTRY };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
