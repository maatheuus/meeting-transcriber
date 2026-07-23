import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  screen,
  shell,
  systemPreferences,
} from 'electron';
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import icon from '../../resources/icon.png?asset';
import { listModels, transcribe, chatFast, chatThink } from './gemini';

// electron-vite does not inject .env into the runtime process, so load it here
// for local dev. In a packaged build there is no .env and the API key entered
// in Settings is used instead.
function loadDotenv(): void {
  try {
    const content = readFileSync(join(process.cwd(), '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // No .env present — rely on the key configured in Settings.
  }
}

loadDotenv();

// --- Persisted recordings ------------------------------------------------
// Audio blobs are too large for localStorage, so the final recording of each
// meeting is written to userData/recordings/<meetingId>.<ext> and reloaded from
// there on demand. Meeting metadata still lives in localStorage.
function recordingsDir(): string {
  return join(app.getPath('userData'), 'recordings');
}

function safeId(id: string): string {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '');
}

function extForMime(mime?: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('mpeg')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  return 'webm';
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case 'ogg':
      return 'audio/ogg';
    case 'mp4':
      return 'audio/mp4';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    default:
      return 'audio/webm';
  }
}

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 900,
    height: 670,
    minHeight: 400,
    minWidth: 600,
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });
  mainWindow = win;

  win.on('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Small frameless, transparent, always-on-top window that shows the recording
// pill (waveform + pause/resume/stop) floating outside the main window.
function createOverlayWindow(): void {
  overlayWindow = new BrowserWindow({
    width: 240,
    height: 80,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  // Sit above full-screen apps too, like a system HUD.
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`);
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay.html'));
  }
}

function positionOverlay(): void {
  if (!overlayWindow) return;
  const { workArea } = screen.getPrimaryDisplay();
  const { width, height } = overlayWindow.getBounds();
  overlayWindow.setPosition(
    Math.round(workArea.x + (workArea.width - width) / 2),
    Math.round(workArea.y + workArea.height - height - 48),
  );
}

function showOverlay(): void {
  if (!overlayWindow) createOverlayWindow();
  const reveal = (): void => {
    positionOverlay();
    // showInactive keeps focus on whatever the user was doing.
    overlayWindow?.showInactive();
  };
  if (overlayWindow?.webContents.isLoading()) {
    overlayWindow.once('ready-to-show', reveal);
  } else {
    reveal();
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on('ping', () => console.log('pong'));

  ipcMain.handle('get-desktop-sources', async (_, opts) => {
    return await desktopCapturer.getSources(opts);
  });

  ipcMain.handle('request-microphone-permission', async () => {
    if (process.platform === 'darwin') {
      return await systemPreferences.askForMediaAccess('microphone');
    }
    return true;
  });

  ipcMain.handle('gemini:list-models', (_e, apiKey?: string) => listModels(apiKey));
  ipcMain.handle('gemini:transcribe', (_e, args) => transcribe(args));
  ipcMain.handle('gemini:chat-fast', (_e, args) => chatFast(args));
  ipcMain.handle('gemini:chat-think', (_e, args) => chatThink(args));

  ipcMain.handle(
    'audio:save',
    (_e, args: { meetingId: string; mimeType?: string; data: ArrayBuffer | Uint8Array }) => {
      const dir = recordingsDir();
      mkdirSync(dir, { recursive: true });
      const filePath = join(dir, `${safeId(args.meetingId)}.${extForMime(args.mimeType)}`);
      writeFileSync(filePath, Buffer.from(args.data as ArrayBuffer));
      return filePath;
    },
  );

  ipcMain.handle('audio:load', (_e, filePath: string) => {
    try {
      const data = readFileSync(filePath);
      const ext = (filePath.split('.').pop() || 'webm').toLowerCase();
      return { data, mimeType: mimeForExt(ext) };
    } catch {
      return null;
    }
  });

  ipcMain.handle('audio:delete', (_e, meetingId: string) => {
    try {
      const dir = recordingsDir();
      const prefix = `${safeId(meetingId)}.`;
      for (const file of readdirSync(dir)) {
        if (file.startsWith(prefix)) unlinkSync(join(dir, file));
      }
    } catch {
      // Nothing to delete, or the folder does not exist yet.
    }
  });

  ipcMain.on('overlay:show', () => showOverlay());
  ipcMain.on('overlay:hide', () => overlayWindow?.hide());
  ipcMain.on('overlay:command', (_e, cmd) =>
    mainWindow?.webContents.send('recording:command', cmd),
  );
  ipcMain.on('recording:update', (_e, payload) =>
    overlayWindow?.webContents.send('recording:state', payload),
  );

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
