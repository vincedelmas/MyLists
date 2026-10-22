import type {ExpoConfig} from "expo/config";

const isDevelopmentBuild = (process.env.EAS_BUILD_PROFILE ?? "development") === "development";

const config: ExpoConfig = {
    name: "MyLists",
    slug: "mylists",
    version: "0.1.0",
    scheme: "mylists",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    backgroundColor: "#0B0B0B",
    platforms: ["android", "ios"],
    experiments: {typedRoutes: true},
    android: {
        package: "app.mylists.mobile",
    },
    ios: {
        bundleIdentifier: "app.mylists.mobile",
        supportsTablet: true,
        ...(isDevelopmentBuild
            ? {
                  infoPlist: {NSAppTransportSecurity: {NSAllowsLocalNetworking: true}},
              }
            : {}),
    },
    plugins: [
        "expo-router",
        "expo-image",
        "expo-status-bar",
        "expo-secure-store",
        ["expo-build-properties", {android: {usesCleartextTraffic: isDevelopmentBuild}}],
    ],
};

export default config;
