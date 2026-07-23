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
  transcript?: TranscriptSegment[];
  notes?: string;
  summary?: string;
};
