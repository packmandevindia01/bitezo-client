import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitezo.admin',
  appName: 'bitezo-admin',
  webDir: 'dist',

  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
