import { ipcMain } from 'electron';
import { chatFast, chatThink, listModels, transcribe } from '../services/geminiService';

export function registerGeminiIpc(): void {
  ipcMain.handle('gemini:list-models', (_e, apiKey?: string) => listModels(apiKey));
  ipcMain.handle('gemini:transcribe', (_e, args) => transcribe(args));
  ipcMain.handle('gemini:chat-fast', (_e, args) => chatFast(args));
  ipcMain.handle('gemini:chat-think', (_e, args) => chatThink(args));
}
