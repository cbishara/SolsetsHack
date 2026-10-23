import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const screenTime = process.env.SOL_SCREEN_TIME === "1";
  const bundleIdentifier = process.env.SOL_BUNDLE_ID || "com.solsets.sol.demo";
  const team = process.env.SOL_APPLE_TEAM_ID;
  return {
    ...config,
    name: "SOL",
    slug: "sol-mobile-demo",
    scheme: "sol-demo",
    version: "0.1.0",
    userInterfaceStyle: "light",
    ios: {
      ...config.ios,
      supportsTablet: false,
      bundleIdentifier,
      ...(team ? { appleTeamId: team } : {}),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocalNetworkUsageDescription:
          "Conectar con la demo de SOL en tu Mac durante el desarrollo.",
      },
    },
    android: { ...config.android, package: bundleIdentifier },
    plugins: [
      "expo-secure-store",
      "expo-status-bar",
      ...(screenTime
        ? [
            [
              "react-native-device-activity",
              {
                appGroup: "group." + bundleIdentifier,
                ...(team ? { appleTeamId: team } : {}),
              },
            ] as [string, Record<string, unknown>],
          ]
        : []),
    ],
    extra: { ...config.extra, screenTimeEnabled: screenTime },
  };
};
