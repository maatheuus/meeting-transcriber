import { ElectronAPI } from '@electron-toolkit/preload';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      getDesktopSources: (opts: any) => Promise<any[]>;
      requestMicrophonePermission: () => Promise<boolean>;
      gemini: {
        listModels: (
          apiKey?: string,
        ) => Promise<{ id: string; displayName: string; description?: string }[]>;
        transcribe: (args: {
          audioBase64: string;
          mimeType?: string;
          model?: string;
          language?: string;
          apiKey?: string;
          knownSpeakers?: string[];
        }) => Promise<string>;
        chatFast: (args: { prompt: string; model?: string; apiKey?: string }) => Promise<string>;
        chatThink: (args: { prompt: string; model?: string; apiKey?: string }) => Promise<string>;
      };
      overlay: {
        show: () => void;
        hide: () => void;
      };
      recording: {
        setState: (payload: { state: string; level: number }) => void;
        onState: (
          cb: (payload: { state: 'idle' | 'recording' | 'paused'; level: number }) => void,
        ) => () => void;
        sendCommand: (cmd: 'pause' | 'resume' | 'stop') => void;
        onCommand: (cb: (cmd: 'pause' | 'resume' | 'stop') => void) => () => void;
      };
    };
  }
}
