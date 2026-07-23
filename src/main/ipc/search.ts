import { ipcMain } from 'electron';
import * as searchService from '../services/searchService';

export function registerSearchIpc(): void {
  ipcMain.handle('search:all', (_e, query: unknown, limit: unknown) => {
    if (typeof query !== 'string') throw new Error('search:all needs a query string');
    return searchService.searchAll(query, typeof limit === 'number' ? limit : undefined);
  });
}
