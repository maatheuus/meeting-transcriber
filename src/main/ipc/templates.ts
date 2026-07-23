import { ipcMain } from 'electron';
import type { TemplateDTO } from '../services/templatesService';
import * as templatesService from '../services/templatesService';

export function registerTemplatesIpc(): void {
  ipcMain.handle('templates:list', () => templatesService.list());

  ipcMain.handle('templates:replace-all', (_e, templates: unknown) => {
    if (!Array.isArray(templates)) throw new Error('templates:replace-all needs an array');
    return templatesService.replaceAll(templates as TemplateDTO[]);
  });
}
