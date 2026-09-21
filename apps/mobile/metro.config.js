const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm workspaces: shared packages live outside apps/mobile, so Metro needs
// to watch the monorepo root and resolve dependencies hoisted there.
// Hierarchical lookup stays enabled (the default) so a package-local
// node_modules override (e.g. packages/shared/node_modules/zod, pinned to a
// different version than whatever's hoisted to the workspace root) still
// wins, as plain Node resolution would.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
