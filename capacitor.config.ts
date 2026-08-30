import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mpa.piaui',
  appName: 'MPA Piauí',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Permite requisições para o Supabase
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
    minWebViewVersion: 60,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#3b82f6',
    },
  },
};

export default config;
