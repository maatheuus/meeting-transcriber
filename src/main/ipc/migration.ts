import { ipcMain } from 'electron';
import type { LegacyPayload } from '../services/migrationService';
import * as migrationService from '../services/migrationService';

export function registerMigrationIpc(): void {
  ipcMain.handle('migration:status', () => ({ migrated: migrationService.isMigrated() }));

  ipcMain.handle('migration:import-localstorage', (_e, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('migration:import-localstorage needs a payload');
    }
    migrationService.importFromLocalStorage(payload as LegacyPayload);
  });
}
