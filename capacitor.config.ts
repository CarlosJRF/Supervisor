import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.supervisor.app',
  appName: 'Supervisor',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: { androidIsEncryption: false },
    LocalNotifications: { smallIcon: 'ic_stat_supervisor' },
  },
};

export default config;
