/// <reference types="@capawesome/capacitor-live-update" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.xleonttv.cloudkibridge",
  appName: "CloudKI Bridge",
  webDir: "dist",
  backgroundColor: "#141414",
  ios: {
    contentInset: "never",
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: "desktop",
  },
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
    cleartext: false,
  },
  plugins: {
    LiveUpdate: {
      // Updates werden bewusst nur über den Button in den Einstellungen
      // installiert. So bleibt der Start deterministisch und nachvollziehbar.
      autoUpdateStrategy: "none",
      autoDeleteBundles: true,
      autoBlockRolledBackBundles: true,
      readyTimeout: 20000,
      httpTimeout: 90000,
    },
  },
};

export default config;
