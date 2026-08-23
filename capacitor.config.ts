import type { CapacitorConfig } from "@capacitor/cli";

const productionUrl = "https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site";

const config: CapacitorConfig = {
  appId: "com.wankun824.manyou",
  appName: "漫游",
  webDir: "native-shell",
  server: {
    url: productionUrl,
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    scheme: "Manyou",
    contentInset: "automatic",
    backgroundColor: "#F8F8FA",
  },
  android: {
    backgroundColor: "#F9F9FF",
    allowMixedContent: false,
  },
};

export default config;
