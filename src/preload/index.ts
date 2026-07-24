import { electronAPI } from '@electron-toolkit/preload';
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getDesktopSources: (opts: any) => ipcRenderer.invoke('get-desktop-sources', opts),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  permissions: {
    getStatus: () => ipcRenderer.invoke('permissions:get-status'),
    requestMicrophone: () => ipcRenderer.invoke('permissions:request-microphone'),
    openScreenSettings: () => ipcRenderer.invoke('permissions:open-screen-settings'),
  },
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
  meetings: {
    list: () => ipcRenderer.invoke('meetings:list'),
    get: (id: string) => ipcRenderer.invoke('meetings:get', id),
    create: (args: { id?: string; title?: string; folder?: string }) =>
      ipcRenderer.invoke('meetings:create', args),
    update: (id: string, patch: Record<string, unknown>) =>
      ipcRenderer.invoke('meetings:update', id, patch),
    setCover: (id: string, dataUrl: string) =>
      ipcRenderer.invoke('meetings:set-cover', id, dataUrl),
    delete: (id: string) => ipcRenderer.invoke('meetings:delete', id),
  },
  segments: {
    list: (meetingId: string) => ipcRenderer.invoke('segments:list', meetingId),
    append: (meetingId: string, segments: unknown[]) =>
      ipcRenderer.invoke('segments:append', meetingId, segments),
    insert: (meetingId: string, segment: unknown) =>
      ipcRenderer.invoke('segments:insert', meetingId, segment),
    update: (id: number, patch: Record<string, unknown>) =>
      ipcRenderer.invoke('segments:update', id, patch),
    delete: (id: number) => ipcRenderer.invoke('segments:delete', id),
    renameSpeaker: (meetingId: string, from: string, to: string) =>
      ipcRenderer.invoke('segments:rename-speaker', meetingId, from, to),
    knownSpeakers: (meetingId: string) => ipcRenderer.invoke('segments:known-speakers', meetingId),
  },
  folders: {
    list: () => ipcRenderer.invoke('folders:list'),
    create: (name: string) => ipcRenderer.invoke('folders:create', name),
    rename: (oldName: string, newName: string) =>
      ipcRenderer.invoke('folders:rename', oldName, newName),
    delete: (name: string) => ipcRenderer.invoke('folders:delete', name),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    setMany: (entries: Record<string, string>) => ipcRenderer.invoke('settings:set-many', entries),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    replaceAll: (templates: unknown[]) => ipcRenderer.invoke('templates:replace-all', templates),
  },
  search: {
    all: (query: string, limit?: number) => ipcRenderer.invoke('search:all', query, limit),
  },
  migration: {
    status: () => ipcRenderer.invoke('migration:status'),
    importLocalStorage: (payload: unknown) =>
      ipcRenderer.invoke('migration:import-localstorage', payload),
  },
  audio: {
    save: (args: { meetingId: string; mimeType?: string; data: ArrayBuffer }) =>
      ipcRenderer.invoke('audio:save', args),
    load: (filePath: string) => ipcRenderer.invoke('audio:load', filePath),
    delete: (meetingId: string) => ipcRenderer.invoke('audio:delete', meetingId),
  },
  logs: {
    list: () => ipcRenderer.invoke('logs:list'),
    clear: () => ipcRenderer.invoke('logs:clear'),
    push: (entry: {
      level: 'error' | 'warn' | 'info';
      source: string;
      message: string;
      detail?: string;
    }) => ipcRenderer.invoke('logs:push', entry),
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
