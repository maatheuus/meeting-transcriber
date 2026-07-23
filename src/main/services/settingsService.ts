import { getDb } from '../db/connection';

export function get(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    { value: string | null } | undefined;
  return row?.value ?? null;
}

export function getAll(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string | null;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
}

export function set(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    )
    .run(key, value);
}

export function setMany(entries: Record<string, string>): void {
  const db = getDb();
  const write = db.transaction((pairs: [string, string][]) => {
    for (const [key, value] of pairs) set(key, value);
  });
  write(Object.entries(entries));
}
