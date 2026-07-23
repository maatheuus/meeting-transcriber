import { ipcMain } from 'electron';
import * as settingsService from '../services/settingsService';

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get-all', () => settingsService.getAll());

  ipcMain.handle('settings:set-many', (_e, entries: unknown) => {
    if (!entries || typeof entries !== 'object') {
      throw new Error('settings:set-many needs a key/value object');
    }
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
      clean[key] = value == null ? '' : String(value);
    }
    settingsService.setMany(clean);
  });
}
