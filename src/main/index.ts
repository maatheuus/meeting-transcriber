import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { execFile } from 'child_process';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  screen,
  session,
  shell,
  systemPreferences,
} from 'electron';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import icon from '../../resources/icon.png?asset';
import { closeDb, initDb } from './db/connection';
import { registerIpc } from './ipc';
import { registerFileProtocol } from './protocol';
import { seedIfEmpty } from './services/templatesService';

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

app.setName('Transcriber');

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

function applyOverlayWindowFlags(win: BrowserWindow): void {
  win.setContentProtection(true);
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

// Small frameless, transparent, always-on-top window that shows the recording
// pill (waveform + pause/resume/stop) floating outside the main window.
function createOverlayWindow(): void {
  overlayWindow = new BrowserWindow({
    width: 280,
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
    ...(process.platform === 'darwin'
      ? { type: 'panel' as const, hiddenInMissionControl: true }
      : {}),
    ...(process.platform === 'win32' ? { thickFrame: false } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  applyOverlayWindowFlags(overlayWindow);
  overlayWindow.on('show', () => applyOverlayWindowFlags(overlayWindow!));
  overlayWindow.on('focus', () => applyOverlayWindowFlags(overlayWindow!));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay.html`);
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay.html'));
  }
}

function withoutOverlay<T extends { id: string }>(sources: T[]): T[] {
  if (!overlayWindow || overlayWindow.isDestroyed()) return sources;
  const overlayId = overlayWindow.getMediaSourceId();
  return sources.filter((source) => source.id !== overlayId);
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
  electronApp.setAppUserModelId('com.transcriber.app');

  if (is.dev) app.dock?.setIcon(icon);

  initDb();
  seedIfEmpty();
  registerFileProtocol();
  registerIpc();

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen', 'window'] })
        .then((sources) => {
          const [first] = withoutOverlay(sources);
          callback(first ? { video: first } : {});
        })
        .catch(() => callback({}));
    },
    { useSystemPicker: true },
  );

  ipcMain.on('ping', () => console.log('pong'));

  ipcMain.handle('get-desktop-sources', async (_, opts) => {
    return withoutOverlay(await desktopCapturer.getSources(opts));
  });

  ipcMain.handle('request-microphone-permission', async () => {
    if (process.platform === 'darwin') {
      return await systemPreferences.askForMediaAccess('microphone');
    }
    return true;
  });

  ipcMain.handle('screenshot:region', async () => {
    if (process.platform !== 'darwin') return { supported: false as const };
    const tmp = join(app.getPath('temp'), `mt-shot-${Date.now()}.png`);
    return await new Promise<{ supported: true; dataUrl: string | null }>((resolve) => {
      execFile('screencapture', ['-i', '-x', '-t', 'png', tmp], () => {
        try {
          const buf = readFileSync(tmp);
          unlinkSync(tmp);
          resolve({ supported: true, dataUrl: `data:image/png;base64,${buf.toString('base64')}` });
        } catch {
          // No file written — the selection was cancelled.
          resolve({ supported: true, dataUrl: null });
        }
      });
    });
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

app.on('will-quit', () => closeDb());
