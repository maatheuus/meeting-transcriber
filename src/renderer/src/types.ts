export type RecordingState = 'idle' | 'recording' | 'paused';

export type RecordingPayload = {
  state: RecordingState;
  level: number; // 0..100 RMS of the mic input
};

/**
 * One transcript turn. `id` is the SQLite row id: stable for the lifetime of the
 * segment so the summary can cite it. `startMs` is the absolute offset from the
 * start of the meeting's recording, continuous across pause/resume and chunks.
 */
export type TranscriptSegment = {
  id: number;
  meetingId: string;
  speaker: string;
  startMs: number;
  endMs: number | null;
  text: string;
  position: number;
};

/** A segment being created, before the database assigns it an id. */
export type TranscriptSegmentInput = {
  speaker?: string;
  startMs?: number;
  endMs?: number | null;
  text?: string;
};

export type Meeting = {
  id: string;
  title: string;
  status: 'idle' | 'recording' | 'transcribing' | 'complete';
  folder?: string;
  tags?: string[];
  /** `mtfile://` URL of the cover image stored under userData/covers. */
  coverImage?: string;
  language?: string;
  instruction?: string;
  durationSeconds: number;
  /** Absolute path to the persisted audio file on disk. */
  audioPath?: string;
  notes?: string;
  summary?: string;
  segmentCount: number;
  createdAt: number;
  updatedAt: number;
};

export type MeetingPatch = Partial<
  Omit<Meeting, 'id' | 'coverImage' | 'segmentCount' | 'createdAt' | 'updatedAt'>
>;
