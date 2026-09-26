import { app, BrowserWindow, ipcMain, globalShortcut, dialog, screen, Tray, Menu, nativeImage, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { appState } from './state';
import { openToolWin } from './windowManager';
import { takeScreenshot } from './screenshotManager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function showCustomNotification(title: string, body: string, image?: string) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.workArea;

  const winWidth = 320;
  const winHeight = image ? 220 : 110;
  
  const padding = 20;
  const verticalOffset = appState.notificationWins.length * (winHeight + 10);
  
  const notifWin = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: x + width - winWidth - padding,
    y: y + height - winHeight - padding - verticalOffset,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    }
  });

  appState.notificationWins.push(notifWin);
  appState.notifDataMap.set(notifWin.id, { title, body, image });

  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);

  if (process.env.VITE_DEV_SERVER_URL) {
    notifWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/notification?title=${encodedTitle}&body=${encodedBody}`);
  } else {
    notifWin.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: `/notification?title=${encodedTitle}&body=${encodedBody}` });
  }

  notifWin.webContents.on('did-finish-load', () => {
    if (image) {
      notifWin.webContents.send('notification-data', { title, body, image });
    }
  });

  notifWin.on('closed', () => {
    appState.notifDataMap.delete(notifWin.id);
    appState.notificationWins = appState.notificationWins.filter(w => w !== notifWin);
  });

  setTimeout(() => {
    if (!notifWin.isDestroyed()) {
      notifWin.close();
    }
  }, 6000);
}

let currentShortcuts: any = {};
let currentScreenshotDelay = 0;
let tray: Tray | null = null;

export function initSystemHandlers() {
  ipcMain.handle('kill-port', async (event, port) => {
    if (!/^\d+$/.test(String(port))) return { success: false, message: 'Invalid port number.' };
    return new Promise((resolve) => {
      exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
        if (error || !stdout) {
          return resolve({ success: false, message: `Порт ${port} свободен или не найден.` });
        }
        
        const lines = stdout.trim().split('\n');
        const targetLine = lines.find(line => {
          const parts = line.trim().split(/\s+/);
          return parts[1] && parts[1].endsWith(`:${port}`);
        }) || lines[0];

        const parts = targetLine.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (!pid || pid === '0') {
          return resolve({ success: false, message: `Не удалось определить PID для порта ${port}.` });
        }

        exec(`taskkill /F /PID ${pid}`, (killErr, killOut, killStderr) => {
          if (killErr) {
            return resolve({ success: false, message: `Ошибка при закрытии процесса (PID ${pid}): ${killStderr || killErr.message}` });
          }
          resolve({ success: true, message: `Процесс с PID ${pid} успешно закрыт.` });
        });
      });
    });
  });

  ipcMain.handle('select-file', async (event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-folder', async (event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.on('force-resize-window', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setMinimumSize(width, height);
      win.setSize(width, height);
    }
  });

  ipcMain.on('update-shortcuts', (event, shortcuts, multiScreenshot, fastScreenshot, screenshotDelay) => {
    try {
      currentScreenshotDelay = screenshotDelay || 0;
      if (currentShortcuts.toggleApp) globalShortcut.unregister(currentShortcuts.toggleApp);
      if (currentShortcuts.openCalc) globalShortcut.unregister(currentShortcuts.openCalc);
      if (currentShortcuts.openStopwatch) globalShortcut.unregister(currentShortcuts.openStopwatch);
      if (currentShortcuts.openMinitimer) globalShortcut.unregister(currentShortcuts.openMinitimer);
      if (currentShortcuts.openReminders) globalShortcut.unregister(currentShortcuts.openReminders);
      if (currentShortcuts.openScreenshot) globalShortcut.unregister(currentShortcuts.openScreenshot);
      
      if (shortcuts.toggleApp) {
        globalShortcut.register(shortcuts.toggleApp, () => {
          if (appState.mainWindow) appState.mainWindow.isVisible() ? appState.mainWindow.hide() : appState.mainWindow.show();
        });
      }
      if (shortcuts.openCalc) {
        globalShortcut.register(shortcuts.openCalc, () => openToolWin('calc'));
      }
      if (shortcuts.openStopwatch) {
        globalShortcut.register(shortcuts.openStopwatch, () => openToolWin('stopwatch'));
      }
      if (shortcuts.openMinitimer) {
        globalShortcut.register(shortcuts.openMinitimer, () => openToolWin('minitimer'));
      }
      if (shortcuts.openReminders) {
        globalShortcut.register(shortcuts.openReminders, () => openToolWin('reminders'));
      }
      if (shortcuts.openScreenshot) {
        globalShortcut.register(shortcuts.openScreenshot, () => {
          appState.currentFastMode = fastScreenshot || false;
          if (currentScreenshotDelay > 0) {
            if (appState.isAppCompact) appState.mainWindow?.hide();
            setTimeout(() => {
              takeScreenshot(multiScreenshot || false);
            }, currentScreenshotDelay * 1000);
          } else {
            takeScreenshot(multiScreenshot || false);
          }
        });
      }
      currentShortcuts = shortcuts;
    } catch (e) {
      console.error("Failed to register shortcuts", e);
    }
  });

  ipcMain.on('request-notification-data', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && appState.notifDataMap.has(win.id)) {
      const data = appState.notifDataMap.get(win.id);
      if (data) {
        event.sender.send('notification-data', data);
      }
    }
  });

  ipcMain.on('show-notification', (event, title, body, image) => {
    showCustomNotification(title, body, image);
  });

  ipcMain.on('set-startup-mode', (event, runAtStartup) => {
    app.setLoginItemSettings({
      openAtLogin: runAtStartup,
      path: process.execPath
    });
  });

  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

export function initTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC || '', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Открыть TesseraDesk', click: () => {
        appState.mainWindow?.show();
    }},
    { type: 'separator' },
    { label: 'Выход', click: () => {
        app.exit();
    }}
  ]);
  
  tray.setToolTip('TesseraDesk');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    appState.mainWindow?.show();
  });
}
