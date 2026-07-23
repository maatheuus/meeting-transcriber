import { getDb } from '../db/connection';
import * as audioService from './audioService';
import * as foldersService from './foldersService';

export type MeetingStatus = 'idle' | 'recording' | 'transcribing' | 'complete';

/** Shape handed to the renderer. Folders and tags are flattened to names. */
export type MeetingDTO = {
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

export type MeetingPatch = Partial<
  Pick<
    MeetingDTO,
    | 'title'
    | 'folder'
    | 'tags'
    | 'audioPath'
    | 'durationSeconds'
    | 'summary'
    | 'notes'
    | 'language'
    | 'status'
    | 'instruction'
  >
>;

type MeetingRow = {
  id: string;
  title: string;
  folder_name: string | null;
  audio_path: string | null;
  duration_ms: number;
  cover_image_path: string | null;
  summary_md: string | null;
  notes_md: string | null;
  language: string | null;
  status: string;
  instruction_id: string | null;
  segment_count: number;
  created_at: number;
  updated_at: number;
};

const SELECT_MEETING = `
  SELECT m.id, m.title, f.name AS folder_name, m.audio_path, m.duration_ms,
         m.cover_image_path, m.summary_md, m.notes_md, m.language, m.status,
         m.instruction_id, m.created_at, m.updated_at,
         (SELECT count(*) FROM segments s WHERE s.meeting_id = m.id) AS segment_count
  FROM meetings m
  LEFT JOIN folders f ON f.id = m.folder_id
`;

function tagsFor(meetingId: string): string[] {
  return (
    getDb()
      .prepare(
        'SELECT t.name FROM meeting_tags mt JOIN tags t ON t.id = mt.tag_id ' +
          'WHERE mt.meeting_id = ? ORDER BY t.name',
      )
      .all(meetingId) as { name: string }[]
  ).map((r) => r.name);
}

function toDTO(row: MeetingRow): MeetingDTO {
  const tags = tagsFor(row.id);
  return {
    id: row.id,
    title: row.title,
    ...(row.folder_name ? { folder: row.folder_name } : {}),
    ...(tags.length ? { tags } : {}),
    ...(row.audio_path ? { audioPath: row.audio_path } : {}),
    ...(row.cover_image_path
      ? { coverImage: audioService.coverUrl(row.cover_image_path, row.updated_at) ?? undefined }
      : {}),
    durationSeconds: Math.round(row.duration_ms / 1000),
    ...(row.summary_md ? { summary: row.summary_md } : {}),
    ...(row.notes_md ? { notes: row.notes_md } : {}),
    ...(row.language ? { language: row.language } : {}),
    status: row.status as MeetingStatus,
    ...(row.instruction_id ? { instruction: row.instruction_id } : {}),
    segmentCount: row.segment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function list(): MeetingDTO[] {
  const rows = getDb()
    .prepare(`${SELECT_MEETING} ORDER BY m.created_at DESC`)
    .all() as MeetingRow[];
  return rows.map(toDTO);
}

export function get(id: string): MeetingDTO | null {
  const row = getDb().prepare(`${SELECT_MEETING} WHERE m.id = ?`).get(id) as MeetingRow | undefined;
  return row ? toDTO(row) : null;
}

export function create(args: { id: string; title: string; folder?: string }): MeetingDTO {
  const now = Date.now();
  // Ids are epoch-millisecond strings, so they double as the creation time.
  const createdAt = /^\d+$/.test(args.id) ? Number(args.id) : now;
  const folderId = args.folder ? foldersService.ensureByName(args.folder) : null;

  getDb()
    .prepare(
      'INSERT INTO meetings (id, title, folder_id, status, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(args.id, args.title, folderId, 'idle', createdAt, now);

  return get(args.id)!;
}

/** Replaces a meeting's tag set, dropping tag rows nothing points at any more. */
function setTags(meetingId: string, tags: string[]): void {
  const db = getDb();
  db.prepare('DELETE FROM meeting_tags WHERE meeting_id = ?').run(meetingId);

  for (const name of tags) {
    db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
    const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
    db.prepare('INSERT OR IGNORE INTO meeting_tags (meeting_id, tag_id) VALUES (?, ?)').run(
      meetingId,
      tag.id,
    );
  }

  db.exec('DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM meeting_tags)');
}

const COLUMN_FOR: Record<string, string> = {
  title: 'title',
  audioPath: 'audio_path',
  summary: 'summary_md',
  notes: 'notes_md',
  language: 'language',
  status: 'status',
  instruction: 'instruction_id',
};

export function update(id: string, patch: MeetingPatch): MeetingDTO | null {
  const db = getDb();

  const write = db.transaction(() => {
    const assignments: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, column] of Object.entries(COLUMN_FOR)) {
      if (!(key in patch)) continue;
      assignments.push(`${column} = ?`);
      values.push(((patch as Record<string, unknown>)[key] as string | null | undefined) ?? null);
    }

    if ('durationSeconds' in patch) {
      assignments.push('duration_ms = ?');
      values.push(Math.round((patch.durationSeconds || 0) * 1000));
    }

    if ('folder' in patch) {
      assignments.push('folder_id = ?');
      values.push(patch.folder ? foldersService.ensureByName(patch.folder) : null);
    }

    assignments.push('updated_at = ?');
    values.push(Date.now());

    db.prepare(`UPDATE meetings SET ${assignments.join(', ')} WHERE id = ?`).run(...values, id);

    if ('tags' in patch) setTags(id, patch.tags || []);
  });

  write();
  return get(id);
}

/** Stores a `data:` cover on disk and returns the refreshed meeting. */
export function setCover(id: string, dataUrl: string): MeetingDTO | null {
  const path = audioService.saveCover(id, dataUrl);
  getDb()
    .prepare('UPDATE meetings SET cover_image_path = ?, updated_at = ? WHERE id = ?')
    .run(path, Date.now(), id);
  return get(id);
}

/** Removes the meeting row (segments cascade) plus its files on disk. */
export function remove(id: string): void {
  getDb().prepare('DELETE FROM meetings WHERE id = ?').run(id);
  audioService.deleteRecording(id);
  audioService.deleteCover(id);
}
