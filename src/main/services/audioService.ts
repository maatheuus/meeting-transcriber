import { app } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Owns every file the app writes outside the database: recordings and cover
 * images. Audio bytes are never stored in SQLite — meetings only keep the path.
 */

export const COVERS_HOST = 'covers';

export function recordingsDir(): string {
  return join(app.getPath('userData'), 'recordings');
}

export function coversDir(): string {
  return join(app.getPath('userData'), 'covers');
}

function safeId(id: string): string {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '');
}

function extForMime(mime?: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('mpeg')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  return 'webm';
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case 'ogg':
      return 'audio/ogg';
    case 'mp4':
      return 'audio/mp4';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    default:
      return 'audio/webm';
  }
}

export function saveRecording(args: {
  meetingId: string;
  mimeType?: string;
  data: ArrayBuffer | Uint8Array;
}): string {
  const dir = recordingsDir();
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${safeId(args.meetingId)}.${extForMime(args.mimeType)}`);
  writeFileSync(filePath, Buffer.from(args.data as ArrayBuffer));
  return filePath;
}

export function loadRecording(filePath: string): { data: Buffer; mimeType: string } | null {
  try {
    const data = readFileSync(filePath);
    const ext = (filePath.split('.').pop() || 'webm').toLowerCase();
    return { data, mimeType: mimeForExt(ext) };
  } catch {
    return null;
  }
}

export function deleteRecording(meetingId: string): void {
  try {
    const dir = recordingsDir();
    const prefix = `${safeId(meetingId)}.`;
    for (const file of readdirSync(dir)) {
      if (file.startsWith(prefix)) unlinkSync(join(dir, file));
    }
  } catch {
    // Nothing to delete, or the folder does not exist yet.
  }
}

/** Writes a `data:` cover image to disk and returns its absolute path. */
export function saveCover(meetingId: string, dataUrl: string): string {
  const match = /^data:(image\/[a-z+]+);base64,(.*)$/is.exec(dataUrl.trim());
  if (!match) throw new Error('Cover image must be a base64 data URL');

  const ext = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
  const dir = coversDir();
  mkdirSync(dir, { recursive: true });

  // Replacing a cover with a different format would otherwise leave the old file.
  deleteCover(meetingId);

  const filePath = join(dir, `${safeId(meetingId)}.${ext}`);
  writeFileSync(filePath, Buffer.from(match[2], 'base64'));
  return filePath;
}

export function deleteCover(meetingId: string): void {
  try {
    const dir = coversDir();
    const prefix = `${safeId(meetingId)}.`;
    for (const file of readdirSync(dir)) {
      if (file.startsWith(prefix)) unlinkSync(join(dir, file));
    }
  } catch {
    // Nothing to delete, or the folder does not exist yet.
  }
}

/**
 * Renderer-facing URL for a cover file, served by the `mtfile://` protocol.
 * `version` busts the cache when a meeting's cover is replaced in place.
 */
export function coverUrl(filePath: string | null, version: number): string | null {
  if (!filePath) return null;
  const name = filePath.split(/[\\/]/).pop();
  if (!name || !existsSync(filePath)) return null;
  return `mtfile://${COVERS_HOST}/${encodeURIComponent(name)}?v=${version}`;
}
