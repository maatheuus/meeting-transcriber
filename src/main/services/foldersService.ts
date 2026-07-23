import { getDb } from '../db/connection';

export type Folder = { id: number; name: string; position: number };

export function list(): Folder[] {
  return getDb()
    .prepare('SELECT id, name, position FROM folders ORDER BY position, id')
    .all() as Folder[];
}

export function listNames(): string[] {
  return list().map((f) => f.name);
}

export function findByName(name: string): Folder | null {
  return (
    (getDb()
      .prepare('SELECT id, name, position FROM folders WHERE name = ?')
      .get(name) as Folder) ?? null
  );
}

/** Resolves a folder name to its id, creating the folder when it is new. */
export function ensureByName(name: string): number {
  const existing = findByName(name);
  if (existing) return existing.id;
  return create(name).id;
}

export function create(name: string): Folder {
  const db = getDb();
  const nextPosition =
    (db.prepare('SELECT ifnull(max(position), -1) AS max FROM folders').get() as { max: number })
      .max + 1;
  const info = db
    .prepare('INSERT INTO folders (name, position, created_at) VALUES (?, ?, ?)')
    .run(name, nextPosition, Date.now());
  return { id: Number(info.lastInsertRowid), name, position: nextPosition };
}

/** Meetings point at the folder by id, so a rename moves them automatically. */
export function rename(oldName: string, newName: string): void {
  getDb().prepare('UPDATE folders SET name = ? WHERE name = ?').run(newName, oldName);
}

/** Meetings in the folder fall back to "Uncategorized" via ON DELETE SET NULL. */
export function remove(name: string): void {
  getDb().prepare('DELETE FROM folders WHERE name = ?').run(name);
}
