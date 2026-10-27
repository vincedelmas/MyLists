const path = require("node:path");
const {getDefaultConfig} = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The @ alias imports shared code outside this workspace's default watch folders.
config.watchFolders.push(path.resolve(__dirname, "../../src"));

module.exports = config;
