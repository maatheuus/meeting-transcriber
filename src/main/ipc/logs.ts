import { ipcMain } from 'electron';
import { clearLogs, listLogs, pushLog, type LogLevel } from '../services/logsService';

export function registerLogsIpc(): void {
  ipcMain.handle('logs:list', () => listLogs());
  ipcMain.handle('logs:clear', () => clearLogs());
  ipcMain.handle(
    'logs:push',
    (_e, entry: { level: LogLevel; source: string; message: string; detail?: string }) => {
      pushLog(entry.level, entry.source, entry.message, entry.detail);
    },
  );
}
