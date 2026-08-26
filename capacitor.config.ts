import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wankun824.flightyeverything",
  appName: "flighty Everything",
  webDir: "native-shell",
  ios: {
    scheme: "FlightyEverything",
    contentInset: "automatic",
    backgroundColor: "#00000000",
  },
  android: {
    backgroundColor: "#F9F9FF",
    allowMixedContent: false,
  },
};

export default config;
