export type RecordingState = 'idle' | 'recording' | 'paused';

export type RecordingPayload = {
  state: RecordingState;
  level: number; // 0..100 RMS of the mic input
};

export type TranscriptSegment = {
  id: string;
  speaker: string;
  time: string;
  text: string;
  // Absolute offset in ms from the start of the meeting's recording. Kept
  // continuous across pause/resume and across chunks so seeking is accurate.
  offsetMs?: number;
};

export type Meeting = {
  id: string;
  title: string;
  date?: string;
  status?: 'idle' | 'recording' | 'transcribing' | 'complete';
  folder?: string;
  tags?: string[];
  coverImage?: string;
  language?: string;
  instruction?: string;
  durationSeconds?: number;
  // Absolute path to the persisted audio file on disk (set once flushed on stop).
  audioPath?: string;
  transcript?: TranscriptSegment[];
  notes?: string;
  summary?: string;
};
