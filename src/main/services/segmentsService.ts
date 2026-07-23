import { getDb } from '../db/connection';

export type SegmentDTO = {
  id: number;
  meetingId: string;
  speaker: string;
  startMs: number;
  endMs: number | null;
  text: string;
  position: number;
};

export type SegmentInput = {
  speaker?: string;
  startMs?: number;
  endMs?: number | null;
  text?: string;
};

type SegmentRow = {
  id: number;
  meeting_id: string;
  speaker: string;
  start_ms: number;
  end_ms: number | null;
  text: string;
  position: number;
};

const SELECT_SEGMENT =
  'SELECT id, meeting_id, speaker, start_ms, end_ms, text, position FROM segments';

function toDTO(row: SegmentRow): SegmentDTO {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    speaker: row.speaker,
    startMs: row.start_ms,
    endMs: row.end_ms,
    text: row.text,
    position: row.position,
  };
}

export function list(meetingId: string): SegmentDTO[] {
  const rows = getDb()
    .prepare(`${SELECT_SEGMENT} WHERE meeting_id = ? ORDER BY position, id`)
    .all(meetingId) as SegmentRow[];
  return rows.map(toDTO);
}

function getOne(id: number): SegmentDTO | null {
  const row = getDb().prepare(`${SELECT_SEGMENT} WHERE id = ?`).get(id) as SegmentRow | undefined;
  return row ? toDTO(row) : null;
}

function nextPosition(meetingId: string): number {
  return (
    (
      getDb()
        .prepare('SELECT ifnull(max(position), -1) AS max FROM segments WHERE meeting_id = ?')
        .get(meetingId) as { max: number }
    ).max + 1
  );
}

/** Records a speaker label so later chunks of the same meeting reuse it. */
function rememberSpeaker(meetingId: string, label: string): void {
  if (!label.trim()) return;
  getDb()
    .prepare('INSERT OR IGNORE INTO known_speakers (meeting_id, label) VALUES (?, ?)')
    .run(meetingId, label);
}

export function knownSpeakers(meetingId: string): string[] {
  return (
    getDb()
      .prepare(
        'SELECT label FROM known_speakers WHERE meeting_id = ? OR meeting_id IS NULL ORDER BY id',
      )
      .all(meetingId) as { label: string }[]
  ).map((r) => r.label);
}

/** Appends segments at the end of the meeting's timeline, in one transaction. */
export function append(meetingId: string, segments: SegmentInput[]): SegmentDTO[] {
  const db = getDb();

  const write = db.transaction(() => {
    let position = nextPosition(meetingId);
    const ids: number[] = [];

    for (const segment of segments) {
      const speaker = segment.speaker || 'Speaker 1';
      const info = db
        .prepare(
          'INSERT INTO segments (meeting_id, speaker, start_ms, end_ms, text, position) ' +
            'VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          meetingId,
          speaker,
          Math.max(0, Math.round(segment.startMs || 0)),
          segment.endMs ?? null,
          segment.text || '',
          position++,
        );
      ids.push(Number(info.lastInsertRowid));
      rememberSpeaker(meetingId, speaker);
    }

    return ids;
  });

  return write()
    .map((id) => getOne(id))
    .filter((s): s is SegmentDTO => s !== null);
}

export function insert(meetingId: string, segment: SegmentInput): SegmentDTO {
  return append(meetingId, [segment])[0];
}

export function update(id: number, patch: SegmentInput): SegmentDTO | null {
  const db = getDb();
  const existing = getOne(id);
  if (!existing) return null;

  const assignments: string[] = [];
  const values: (string | number | null)[] = [];

  if ('speaker' in patch) {
    assignments.push('speaker = ?');
    values.push(patch.speaker || '');
  }
  if ('startMs' in patch) {
    assignments.push('start_ms = ?');
    values.push(Math.max(0, Math.round(patch.startMs || 0)));
  }
  if ('endMs' in patch) {
    assignments.push('end_ms = ?');
    values.push(patch.endMs ?? null);
  }
  if ('text' in patch) {
    assignments.push('text = ?');
    values.push(patch.text || '');
  }
  if (!assignments.length) return existing;

  db.prepare(`UPDATE segments SET ${assignments.join(', ')} WHERE id = ?`).run(...values, id);
  if (patch.speaker) rememberSpeaker(existing.meetingId, patch.speaker);

  return getOne(id);
}

export function remove(id: number): void {
  getDb().prepare('DELETE FROM segments WHERE id = ?').run(id);
}

/** Renames a speaker across every turn of the meeting, as the UI has always done. */
export function renameSpeaker(meetingId: string, from: string, to: string): void {
  const db = getDb();

  const write = db.transaction(() => {
    db.prepare('UPDATE segments SET speaker = ? WHERE meeting_id = ? AND speaker = ?').run(
      to,
      meetingId,
      from,
    );
    db.prepare('DELETE FROM known_speakers WHERE meeting_id = ? AND label = ?').run(
      meetingId,
      from,
    );
    rememberSpeaker(meetingId, to);
  });

  write();
}
