import { unlinkSync } from 'fs';
import { getDb } from '../db/connection';
import * as audioService from './audioService';
import * as settingsService from './settingsService';
import * as templatesService from './templatesService';
import type { TemplateDTO } from './templatesService';

export const MIGRATED_FLAG = 'localstorage_migrated';

export type LegacySegment = {
  id?: string;
  speaker?: string;
  time?: string;
  text?: string;
  offsetMs?: number;
};

export type LegacyMeeting = {
  id: string;
  title?: string;
  status?: string;
  folder?: string;
  tags?: string[];
  coverImage?: string;
  language?: string;
  instruction?: string;
  durationSeconds?: number;
  audioPath?: string;
  transcript?: LegacySegment[];
  notes?: string;
  summary?: string;
};

export type LegacyPayload = {
  meetings?: LegacyMeeting[] | null;
  folders?: string[] | null;
  settings?: Record<string, string> | null;
  templates?: TemplateDTO[] | null;
  theme?: string | null;
};

export function isMigrated(): boolean {
  return settingsService.get(MIGRATED_FLAG) === '1';
}

/** "MM:SS" (or "HH:MM:SS") -> milliseconds. */
function timeToMs(time: string | undefined): number {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
}

/**
 * Imports everything that used to live in localStorage in a single transaction.
 * The localStorage entries themselves are left untouched: the renderer stops
 * reading them, but the data stays recoverable if this import turns out wrong.
 */
export function importFromLocalStorage(payload: LegacyPayload): void {
  if (isMigrated()) return;

  const db = getDb();
  // Cover images have to be written outside SQLite; undo them if the
  // transaction rolls back so a retry does not see half-imported state.
  const writtenCovers: string[] = [];

  const run = db.transaction(() => {
    const now = Date.now();

    const insertFolder = db.prepare(
      'INSERT OR IGNORE INTO folders (name, position, created_at) VALUES (?, ?, ?)',
    );
    (payload.folders || []).forEach((name, index) => {
      if (name && name !== 'Uncategorized') insertFolder.run(name, index, now);
    });

    const folderIdFor = (name?: string): number | null => {
      if (!name || name === 'Uncategorized') return null;
      insertFolder.run(name, 9999, now);
      const row = db.prepare('SELECT id FROM folders WHERE name = ?').get(name) as
        { id: number } | undefined;
      return row?.id ?? null;
    };

    for (const meeting of payload.meetings || []) {
      if (!meeting?.id) continue;

      // Ids were generated with Date.now(), so they carry the creation time.
      const createdAt = /^\d+$/.test(meeting.id) ? Number(meeting.id) : now;
      let coverPath: string | null = null;
      if (meeting.coverImage?.startsWith('data:')) {
        coverPath = audioService.saveCover(meeting.id, meeting.coverImage);
        writtenCovers.push(coverPath);
      }

      db.prepare(
        `INSERT OR REPLACE INTO meetings
           (id, title, folder_id, audio_path, duration_ms, cover_image_path,
            summary_md, notes_md, language, status, instruction_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        meeting.id,
        meeting.title || 'Untitled Meeting',
        folderIdFor(meeting.folder),
        meeting.audioPath || null,
        Math.round((meeting.durationSeconds || 0) * 1000),
        coverPath,
        meeting.summary || null,
        meeting.notes || null,
        meeting.language || null,
        meeting.status || 'idle',
        meeting.instruction || null,
        createdAt,
        now,
      );

      const insertSegment = db.prepare(
        'INSERT INTO segments (meeting_id, speaker, start_ms, end_ms, text, position) ' +
          'VALUES (?, ?, ?, ?, ?, ?)',
      );
      const insertSpeaker = db.prepare(
        'INSERT OR IGNORE INTO known_speakers (meeting_id, label) VALUES (?, ?)',
      );

      (meeting.transcript || []).forEach((segment, index) => {
        const speaker = segment.speaker || 'Speaker 1';
        insertSegment.run(
          meeting.id,
          speaker,
          segment.offsetMs ?? timeToMs(segment.time),
          null,
          segment.text || '',
          index,
        );
        insertSpeaker.run(meeting.id, speaker);
      });

      for (const tag of meeting.tags || []) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tag);
        const row = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag) as { id: number };
        db.prepare('INSERT OR IGNORE INTO meeting_tags (meeting_id, tag_id) VALUES (?, ?)').run(
          meeting.id,
          row.id,
        );
      }
    }

    if (payload.templates?.length) templatesService.replaceAll(payload.templates);

    for (const [key, value] of Object.entries(payload.settings || {})) {
      settingsService.set(key, value ?? '');
    }
    if (payload.theme) settingsService.set('theme', payload.theme);

    settingsService.set(MIGRATED_FLAG, '1');
  });

  try {
    run();
  } catch (error) {
    for (const path of writtenCovers) {
      try {
        unlinkSync(path);
      } catch {
        // Best effort — the file may already be gone.
      }
    }
    throw new Error(`Importing your existing data failed: ${(error as Error).message}`);
  }
}
