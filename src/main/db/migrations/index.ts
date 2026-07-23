import type { Database } from 'better-sqlite3';
import init from './001_init.sql?raw';

/**
 * Ordered list of migrations. Each entry is applied once, in a transaction, and
 * the highest applied version is recorded in PRAGMA user_version. An applied
 * migration is never edited — a change always gets a new numbered file here.
 */
const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  { version: 1, name: '001_init', sql: init },
];

export function runMigrations(db: Database): void {
  const current = db.pragma('user_version', { simple: true }) as number;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;

    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.version}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${migration.name} failed: ${(error as Error).message}`);
    }
  }
}
