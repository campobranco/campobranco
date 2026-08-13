import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || 'com.campobranco.app.canary',
  appName: process.env.CAPACITOR_APP_NAME || 'Campo Branco',
  webDir: 'out'
};

export default config;
