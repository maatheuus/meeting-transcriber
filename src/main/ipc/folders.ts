import { ipcMain } from 'electron';
import * as foldersService from '../services/foldersService';

function requireName(value: unknown, channel: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${channel} needs a folder name`);
  return value.trim();
}

export function registerFoldersIpc(): void {
  ipcMain.handle('folders:list', () => foldersService.listNames());

  ipcMain.handle('folders:create', (_e, name: unknown) =>
    foldersService.create(requireName(name, 'folders:create')),
  );

  ipcMain.handle('folders:rename', (_e, oldName: unknown, newName: unknown) => {
    foldersService.rename(
      requireName(oldName, 'folders:rename'),
      requireName(newName, 'folders:rename'),
    );
  });

  ipcMain.handle('folders:delete', (_e, name: unknown) => {
    foldersService.remove(requireName(name, 'folders:delete'));
  });
}
