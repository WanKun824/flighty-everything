import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.wankun824.flightyeverything",
  appName: "fly everything",
  webDir: "native-shell",
  plugins: {
    // The shared viewport hook owns keyboard insets. Do not also shrink WKWebView.
    Keyboard: { resize: KeyboardResize.None },
  },
  ios: {
    scheme: "FlightyEverything",
    contentInset: "never",
    backgroundColor: "#00000000",
  },
  android: {
    backgroundColor: "#F9F9FF",
    allowMixedContent: false,
  },
};

export default config;
