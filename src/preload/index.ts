import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge } from 'electron';

import { ipcRenderer } from 'electron';

const api = {
  getDesktopSources: (opts: any) => ipcRenderer.invoke('get-desktop-sources', opts),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  gemini: {
    listModels: (apiKey?: string) => ipcRenderer.invoke('gemini:list-models', apiKey),
    transcribe: (args: {
      audioBase64: string;
      mimeType?: string;
      model?: string;
      language?: string;
      apiKey?: string;
      knownSpeakers?: string[];
    }) => ipcRenderer.invoke('gemini:transcribe', args),
    chatFast: (args: { prompt: string; model?: string; apiKey?: string }) =>
      ipcRenderer.invoke('gemini:chat-fast', args),
    chatThink: (args: { prompt: string; model?: string; apiKey?: string }) =>
      ipcRenderer.invoke('gemini:chat-think', args),
  },
  audio: {
    save: (args: { meetingId: string; mimeType?: string; data: ArrayBuffer }) =>
      ipcRenderer.invoke('audio:save', args),
    load: (filePath: string) => ipcRenderer.invoke('audio:load', filePath),
    delete: (meetingId: string) => ipcRenderer.invoke('audio:delete', meetingId),
  },
  screenshot: {
    region: () => ipcRenderer.invoke('screenshot:region'),
  },
  overlay: {
    show: () => ipcRenderer.send('overlay:show'),
    hide: () => ipcRenderer.send('overlay:hide'),
  },
  recording: {
    setState: (payload: { state: string; level: number }) =>
      ipcRenderer.send('recording:update', payload),
    onState: (cb: (payload: { state: 'idle' | 'recording' | 'paused'; level: number }) => void) => {
      const listener = (_e: unknown, payload: any) => cb(payload);
      ipcRenderer.on('recording:state', listener);
      return () => ipcRenderer.removeListener('recording:state', listener);
    },
    sendCommand: (cmd: 'pause' | 'resume' | 'stop' | 'capture') =>
      ipcRenderer.send('overlay:command', cmd),
    onCommand: (cb: (cmd: 'pause' | 'resume' | 'stop' | 'capture') => void) => {
      const listener = (_e: unknown, cmd: any) => cb(cmd);
      ipcRenderer.on('recording:command', listener);
      return () => ipcRenderer.removeListener('recording:command', listener);
    },
  },
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
