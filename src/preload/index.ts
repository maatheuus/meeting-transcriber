import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge } from 'electron';

import { ipcRenderer } from 'electron';

const api = {
  getDesktopSources: (opts: any) => ipcRenderer.invoke('get-desktop-sources', opts),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
