import { getDb } from '../db/connection';

export type SearchHit = {
  segmentId: number;
  meetingId: string;
  meetingTitle: string;
  startMs: number;
  speaker: string;
  text: string;
};

export type SearchResult = {
  /** Meetings matching by title or by transcript content, best match first. */
  meetingIds: string[];
  segments: SearchHit[];
};

const EMPTY: SearchResult = { meetingIds: [], segments: [] };

/**
 * Turns free-form typing into an FTS5 MATCH expression: every token is quoted
 * (so punctuation cannot be read as operator syntax) and the last one gets a
 * prefix `*` so results appear while the user is still typing.
 */
function toMatchQuery(query: string): string | null {
  const tokens = query.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!tokens?.length) return null;
  return tokens.map((token, i) => `"${token}"${i === tokens.length - 1 ? '*' : ''}`).join(' ');
}

/** Searches every meeting at once: titles and transcript text. */
export function searchAll(query: string, limit = 200): SearchResult {
  const match = toMatchQuery(query);
  if (!match) return EMPTY;

  const db = getDb();

  const segments = db
    .prepare(
      `SELECT s.id AS segmentId, s.meeting_id AS meetingId, m.title AS meetingTitle,
              s.start_ms AS startMs, s.speaker, s.text
       FROM segments_fts f
       JOIN segments s ON s.id = f.rowid
       JOIN meetings m ON m.id = s.meeting_id
       WHERE segments_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    )
    .all(match, limit) as SearchHit[];

  const titleMatches = (
    db
      .prepare(
        `SELECT f.meeting_id AS id
         FROM meetings_fts f
         JOIN meetings m ON m.id = f.meeting_id
         WHERE meetings_fts MATCH ?
         ORDER BY rank`,
      )
      .all(match) as { id: string }[]
  ).map((r) => r.id);

  const meetingIds = [...new Set([...titleMatches, ...segments.map((s) => s.meetingId)])];
  return { meetingIds, segments };
}
