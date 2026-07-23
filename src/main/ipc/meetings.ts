import { ipcMain } from 'electron';
import type { MeetingPatch } from '../services/meetingsService';
import * as meetingsService from '../services/meetingsService';

export function registerMeetingsIpc(): void {
  ipcMain.handle('meetings:list', () => meetingsService.list());

  ipcMain.handle('meetings:get', (_e, id: unknown) => {
    if (typeof id !== 'string' || !id) throw new Error('meetings:get needs a meeting id');
    return meetingsService.get(id);
  });

  ipcMain.handle(
    'meetings:create',
    (_e, args: { id?: string; title?: string; folder?: string }) => {
      const id = typeof args?.id === 'string' && args.id ? args.id : String(Date.now());
      return meetingsService.create({
        id,
        title: typeof args?.title === 'string' && args.title ? args.title : 'New Meeting',
        folder: typeof args?.folder === 'string' && args.folder ? args.folder : undefined,
      });
    },
  );

  ipcMain.handle('meetings:update', (_e, id: unknown, patch: unknown) => {
    if (typeof id !== 'string' || !id) throw new Error('meetings:update needs a meeting id');
    if (!patch || typeof patch !== 'object') throw new Error('meetings:update needs a patch');
    return meetingsService.update(id, patch as MeetingPatch);
  });

  ipcMain.handle('meetings:set-cover', (_e, id: unknown, dataUrl: unknown) => {
    if (typeof id !== 'string' || !id) throw new Error('meetings:set-cover needs a meeting id');
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      throw new Error('meetings:set-cover needs a data URL');
    }
    return meetingsService.setCover(id, dataUrl);
  });

  ipcMain.handle('meetings:delete', (_e, id: unknown) => {
    if (typeof id !== 'string' || !id) throw new Error('meetings:delete needs a meeting id');
    meetingsService.remove(id);
  });
}
