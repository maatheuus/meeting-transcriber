import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      getDesktopSources: (opts: any) => Promise<any[]>;
      requestMicrophonePermission: () => Promise<boolean>;
    };
  }
}
