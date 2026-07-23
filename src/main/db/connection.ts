import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

/** Opens app.db, applies pragmas and migrations. Safe to call more than once. */
export function initDb(): Database.Database {
  if (db) return db;

  const connection = new Database(join(app.getPath('userData'), 'app.db'));
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');
  runMigrations(connection);

  db = connection;
  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database has not been initialised yet');
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
