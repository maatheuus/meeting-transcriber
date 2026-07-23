import { ipcMain } from 'electron';
import * as audioService from '../services/audioService';

export function registerAudioIpc(): void {
  ipcMain.handle(
    'audio:save',
    (_e, args: { meetingId?: unknown; mimeType?: unknown; data?: unknown }) => {
      if (typeof args?.meetingId !== 'string' || !args.meetingId) {
        throw new Error('audio:save needs a meeting id');
      }
      if (!args.data) throw new Error('audio:save needs audio data');
      return audioService.saveRecording({
        meetingId: args.meetingId,
        mimeType: typeof args.mimeType === 'string' ? args.mimeType : undefined,
        data: args.data as ArrayBuffer,
      });
    },
  );

  ipcMain.handle('audio:load', (_e, filePath: unknown) => {
    if (typeof filePath !== 'string' || !filePath) throw new Error('audio:load needs a file path');
    return audioService.loadRecording(filePath);
  });

  ipcMain.handle('audio:delete', (_e, meetingId: unknown) => {
    if (typeof meetingId !== 'string' || !meetingId) {
      throw new Error('audio:delete needs a meeting id');
    }
    audioService.deleteRecording(meetingId);
  });
}
