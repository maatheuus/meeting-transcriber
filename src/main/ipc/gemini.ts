import { ipcMain } from 'electron';
import { chatFast, chatThink, listModels, transcribe } from '../services/geminiService';
import { loggedHandler } from '../services/logsService';

export function registerGeminiIpc(): void {
  ipcMain.handle(
    'gemini:list-models',
    loggedHandler('gemini:list-models', async (_e, apiKey?: string) => listModels(apiKey)),
  );
  ipcMain.handle(
    'gemini:transcribe',
    loggedHandler('gemini:transcribe', async (_e, args) => transcribe(args)),
  );
  ipcMain.handle(
    'gemini:chat-fast',
    loggedHandler('gemini:chat-fast', async (_e, args) => chatFast(args)),
  );
  ipcMain.handle(
    'gemini:chat-think',
    loggedHandler('gemini:chat-think', async (_e, args) => chatThink(args)),
  );
}
