import { hydrateTemplates } from './instructions';
import { hydrateSettings } from './settings';

// The keys the app used before everything moved into SQLite. They are read once
// on the first launch after the migration and then deliberately left in place —
// nothing deletes them, so the old data stays recoverable.
const LEGACY_MEETINGS_KEY = 'meetings';
const LEGACY_FOLDERS_KEY = 'folders';
const LEGACY_SETTINGS_KEY = 'app_settings';
const LEGACY_TEMPLATES_KEY = 'summary_instructions';
const LEGACY_THEME_KEY = 'vite-ui-theme';

const DEFAULT_FOLDERS = ['Work', 'Personal'];

function readLegacy<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Imports any pre-SQLite localStorage data, then fills the synchronous settings
 * and template caches. Nothing renders until this resolves, so the app never
 * shows an empty database or flashes the wrong theme.
 */
export async function bootstrap(): Promise<void> {
  const { migrated } = await window.api.migration.status();

  if (!migrated) {
    await window.api.migration.importLocalStorage({
      meetings: readLegacy<unknown[]>(LEGACY_MEETINGS_KEY),
      folders: readLegacy<string[]>(LEGACY_FOLDERS_KEY) ?? DEFAULT_FOLDERS,
      settings: readLegacy<Record<string, string>>(LEGACY_SETTINGS_KEY),
      templates: readLegacy(LEGACY_TEMPLATES_KEY),
      theme: localStorage.getItem(LEGACY_THEME_KEY),
    });
  }

  await Promise.all([hydrateSettings(), hydrateTemplates()]);
}
