import { ElectronAPI } from '@electron-toolkit/preload';

/**
 * Shapes crossing the IPC boundary. They mirror the DTOs the main-process
 * services return; the renderer re-exports them from `@renderer/types`.
 */
type MeetingStatus = 'idle' | 'recording' | 'transcribing' | 'complete';

type MeetingDTO = {
  id: string;
  title: string;
  folder?: string;
  tags?: string[];
  audioPath?: string;
  coverImage?: string;
  durationSeconds: number;
  summary?: string;
  notes?: string;
  language?: string;
  status: MeetingStatus;
  instruction?: string;
  segmentCount: number;
  createdAt: number;
  updatedAt: number;
};

type MeetingPatch = Partial<
  Omit<MeetingDTO, 'id' | 'coverImage' | 'segmentCount' | 'createdAt' | 'updatedAt'>
>;

type SegmentDTO = {
  id: number;
  meetingId: string;
  speaker: string;
  startMs: number;
  endMs: number | null;
  text: string;
  position: number;
};

type SegmentInput = {
  speaker?: string;
  startMs?: number;
  endMs?: number | null;
  text?: string;
};

type TemplateSection = { id: number; title: string; instructions: string };

type TemplateDTO = {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
  isBuiltin?: boolean;
  context?: string;
  format?: TemplateSection[];
};

type SearchHit = {
  segmentId: number;
  meetingId: string;
  meetingTitle: string;
  startMs: number;
  speaker: string;
  text: string;
};

type SearchResult = { meetingIds: string[]; segments: SearchHit[] };

type LegacyPayload = {
  meetings?: unknown[] | null;
  folders?: string[] | null;
  settings?: Record<string, string> | null;
  templates?: TemplateDTO[] | null;
  theme?: string | null;
};

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
      meetings: {
        list: () => Promise<MeetingDTO[]>;
        get: (id: string) => Promise<MeetingDTO | null>;
        create: (args: { id?: string; title?: string; folder?: string }) => Promise<MeetingDTO>;
        update: (id: string, patch: MeetingPatch) => Promise<MeetingDTO | null>;
        setCover: (id: string, dataUrl: string) => Promise<MeetingDTO | null>;
        delete: (id: string) => Promise<void>;
      };
      segments: {
        list: (meetingId: string) => Promise<SegmentDTO[]>;
        append: (meetingId: string, segments: SegmentInput[]) => Promise<SegmentDTO[]>;
        insert: (meetingId: string, segment: SegmentInput) => Promise<SegmentDTO>;
        update: (id: number, patch: SegmentInput) => Promise<SegmentDTO | null>;
        delete: (id: number) => Promise<void>;
        renameSpeaker: (meetingId: string, from: string, to: string) => Promise<void>;
        knownSpeakers: (meetingId: string) => Promise<string[]>;
      };
      folders: {
        list: () => Promise<string[]>;
        create: (name: string) => Promise<{ id: number; name: string; position: number }>;
        rename: (oldName: string, newName: string) => Promise<void>;
        delete: (name: string) => Promise<void>;
      };
      settings: {
        getAll: () => Promise<Record<string, string>>;
        setMany: (entries: Record<string, string>) => Promise<void>;
      };
      templates: {
        list: () => Promise<TemplateDTO[]>;
        replaceAll: (templates: TemplateDTO[]) => Promise<TemplateDTO[]>;
      };
      search: {
        all: (query: string, limit?: number) => Promise<SearchResult>;
      };
      migration: {
        status: () => Promise<{ migrated: boolean }>;
        importLocalStorage: (payload: LegacyPayload) => Promise<void>;
      };
      audio: {
        save: (args: {
          meetingId: string;
          mimeType?: string;
          data: ArrayBuffer;
        }) => Promise<string>;
        load: (filePath: string) => Promise<{ data: Uint8Array; mimeType: string } | null>;
        delete: (meetingId: string) => Promise<void>;
      };
      screenshot: {
        region: () => Promise<{ supported: false } | { supported: true; dataUrl: string | null }>;
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
        sendCommand: (cmd: 'pause' | 'resume' | 'stop' | 'capture') => void;
        onCommand: (cb: (cmd: 'pause' | 'resume' | 'stop' | 'capture') => void) => () => void;
      };
    };
  }
}
