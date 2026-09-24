const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

/*
 * The workspace hoists one React for Quiver Dashboard, while React Native
 * needs the exact version it was built with, installed next to this app.
 * Every import of react resolves here, so the app never loads two copies.
 */
const reactRoot = path.dirname(require.resolve("react/package.json"));
const SINGLE_COPY = /^react(?:\/.*)?$/u;
const { resolveRequest } = config.resolver;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (SINGLE_COPY.test(moduleName)) {
    const target = moduleName.replace(/^react/u, reactRoot);
    return context.resolveRequest(context, target, platform);
  }
  return (resolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform
  );
};

// withUniwindConfig must stay the outermost wrapper.
module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});
