import type { CapacitorConfig } from "@capacitor/cli";

const productionUrl = "https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site";

const config: CapacitorConfig = {
  appId: "com.wankun824.flightyeverything",
  appName: "flighty Everything",
  webDir: "native-shell",
  server: {
    url: productionUrl,
    cleartext: false,
    androidScheme: "https",
  },
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
