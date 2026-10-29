import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xleonttv.cloudkibridge',
  appName: 'CloudKI Bridge',
  webDir: 'dist',
  backgroundColor: '#141414',
  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: 'desktop',
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    cleartext: true,
  },
};

export default config;
