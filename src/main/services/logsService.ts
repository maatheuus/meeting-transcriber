import { app } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type LogLevel = 'error' | 'warn' | 'info';

export type LogEntry = {
  id: number;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  detail?: string;
};

const MAX_ENTRIES = 200;
let entries: LogEntry[] = [];
let nextId = 1;
let loaded = false;

function filePath(): string {
  return join(app.getPath('userData'), 'app-logs.json');
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = readFileSync(filePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      entries = parsed.slice(-MAX_ENTRIES);
      nextId = entries.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    }
  } catch {
    entries = [];
  }
}

function persist(): void {
  try {
    writeFileSync(filePath(), JSON.stringify(entries), 'utf-8');
  } catch {
    // Best-effort — logging must never crash the caller.
  }
}

export function pushLog(level: LogLevel, source: string, message: string, detail?: string): void {
  ensureLoaded();
  entries.push({ id: nextId++, timestamp: Date.now(), level, source, message, detail });
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
  persist();
}

export function listLogs(): LogEntry[] {
  ensureLoaded();
  return [...entries].reverse();
}

export function clearLogs(): void {
  entries = [];
  nextId = 1;
  loaded = true;
  persist();
}

function stringifyError(err: unknown): { message: string; detail?: string } {
  if (err instanceof Error) {
    return { message: err.message, detail: err.stack };
  }
  if (typeof err === 'string') return { message: err };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

/** Wrap an async IPC handler so any thrown error is logged then re-thrown. */
export function loggedHandler<A extends unknown[], R>(
  source: string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      const { message, detail } = stringifyError(err);
      pushLog('error', source, message, detail);
      throw err;
    }
  };
}
