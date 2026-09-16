import { app, BrowserWindow, ipcMain, globalShortcut, clipboard, Menu, dialog, nativeImage, protocol, Notification, Tray, screen, desktopCapturer, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import updaterPkg from 'electron-updater'
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const robot = require('robotjs');
const { GoogleGenAI } = require('@google/genai');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');
const { autoUpdater } = updaterPkg

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA184t2UezSrMDAYiwk2Hw
Ebp5PmNpRSLxoYVp5zCweMgbOAMGGpLUM4wZhnLAYaBPsEKetfI4b2ymdV03VJfZ
aIKtSLrDUr06H2AEJaCvI9MTB9+G32a4cCYF2+aEwiGFYs2CIneWpSdyGnd41FNw
9mdaAkGBmLnib0+LRPzx2PWWzk1nWoXHBboZY8qgp7uOlXztlao5bNRFLfOo7d21
0XqE3vVTW16bKnaz0C5w/tgbb9+R9bLE8L97VjmLvOAtz6n3TuP6cVjDivAunYQx
pffA0CcJ9ruy7OTfK/tFuIhlvUrazCOl3q433KfiCvRKJgyRu1JV+Dm86yht1EJe
dQIDAQAB
-----END PUBLIC KEY-----
`;

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'plugin', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: false } }
]);

app.setAppUserModelId('com.tesseradesk.app');

let mainWindow: BrowserWindow | null
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 650,
    frame: false,
    transparent: true,
    resizable: true,
    icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
    minWidth: 320,
    minHeight: 200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  // mainWindow.setAspectRatio(480/650); // Убрано для отвязки пропорций в нормальном режиме

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(process.env.DIST as string, 'index.html'))
  }
  
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window-maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-maximized', false));
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true, corsEnabled: true, stream: true } },
  { scheme: 'plugin', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true, corsEnabled: true, stream: true, standard: true } }
])

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.registerFileProtocol('media', (request, callback) => {
      let pathname = decodeURI(request.url.replace(/^media:\/\/\/?/, ''));
      if (process.platform === 'win32') {
         pathname = pathname.replace(/\//g, '\\');
      }
      callback({ path: pathname });
    });
    protocol.handle('plugin', (request) => {
      try {
        // Extract path after hostname: plugin://localhost/C:/path/to/file
        const url = new URL(request.url);
        let pathname = decodeURIComponent(url.pathname);
        if (process.platform === 'win32') {
          // pathname is like /C:/path/to/file — strip leading slash, convert slashes
          pathname = pathname.replace(/^\//, '').replace(/\//g, '\\');
        }
        const content = fs.readFileSync(pathname);
        // Detect content type by extension
        const isCSS = pathname.endsWith('.css');
        return new Response(content, {
          headers: { 'Content-Type': isCSS ? 'text/css' : 'application/javascript' }
        });
      } catch (e: any) {
        console.error('plugin:// protocol error:', e.message);
        return new Response(`// Error loading plugin: ${e.message}`, { status: 404, headers: { 'Content-Type': 'application/javascript' } });
      }
    });
    createWindow();

    const iconPath = path.join(process.env.VITE_PUBLIC || '', 'icon.png');
    // Make icon smaller for Windows tray
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Открыть TesseraDesk', click: () => {
          mainWindow?.show();
      }},
      { type: 'separator' },
      { label: 'Выход', click: () => {
          app.exit();
      }}
    ]);
    
    tray.setToolTip('TesseraDesk');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      mainWindow?.show();
    });

    // Auto-update: only check when packaged (not in dev)
    if (app.isPackaged) {
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.on('update-available', (info) => {
        mainWindow?.webContents.send('update-available', info);
        showCustomNotification('TesseraDesk Update', `Доступна версия ${info.version}. Проверьте настройки!`);
      });
      autoUpdater.on('download-progress', (progress) => {
        mainWindow?.webContents.send('download-progress', progress);
      });
      autoUpdater.on('update-downloaded', (info) => {
        mainWindow?.webContents.send('update-downloaded', info);
      });
      autoUpdater.on('error', (err) => {
        mainWindow?.webContents.send('update-error', err?.message || 'Update error');
      });
      autoUpdater.checkForUpdates();
    }
  });
}

ipcMain.handle('check-updates', async () => {
  if (!app.isPackaged) return { status: 'dev' };
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo.version !== app.getVersion()) {
      return { status: 'available', version: result.updateInfo.version };
    }
    return { status: 'latest' };
  } catch (e) {
    return { status: 'error' };
  }
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  // Silent background update into the existing directory, then relaunch
  autoUpdater.quitAndInstall(true, true);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

ipcMain.on('set-always-on-top', (event, flag) => {
  if (mainWindow) {
    // 'screen-saver' level works above fullscreen apps on Windows
    mainWindow.setAlwaysOnTop(flag, flag ? 'screen-saver' : 'normal');
  }
})

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win !== mainWindow && !previewWindows.includes(win)) {
    win.close(); 
  } else {
    mainWindow?.hide();
  }
})

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) {
      win.restore();
    } else {
      win.minimize();
    }
  }
});

ipcMain.on('window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.maximize();
  }
});

ipcMain.on('ensure-minimum-size', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const bounds = win.getBounds();
    const newWidth = Math.max(bounds.width, width);
    const newHeight = Math.max(bounds.height, height);
    win.setMinimumSize(width, height);
    if (newWidth !== bounds.width || newHeight !== bounds.height) {
      win.setSize(newWidth, newHeight);
    }
  }
});

ipcMain.on('window-hide', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.hide();
})

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.minimize();
})

ipcMain.on('window-show', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.show();
})

ipcMain.on('expand-for-picker', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    // @ts-ignore
    win.oldPickerBounds = win.getBounds();
    const currentDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    win.setBounds(currentDisplay.bounds);
  }
  event.returnValue = true;
})

ipcMain.on('restore-from-picker', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    // @ts-ignore
    if (win.oldPickerBounds) win.setBounds(win.oldPickerBounds);
  }
  event.returnValue = true;
})

ipcMain.on('resize-window', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    const currentSize = win.getSize();
    if (currentSize[0] < width || currentSize[1] < height) {
      win.setSize(Math.max(currentSize[0], width), Math.max(currentSize[1], height));
    }
  }
})

let pendingEditorImage: string | null = null;

ipcMain.on('open-paint', (event, filePath) => {
  openToolWin('image-editor');
});

ipcMain.on('open-paint-with-image', (event, dataUrl) => {
  pendingEditorImage = dataUrl;
  const existingWin = toolWindows['image-editor'];
  if (existingWin && !existingWin.isDestroyed()) {
    existingWin.show();
    existingWin.focus();
    existingWin.webContents.send('load-screenshot-data', dataUrl);
  } else {
    openToolWin('image-editor');
  }
});

ipcMain.on('request-screenshot-data', (event) => {
  if (pendingEditorImage) {
    event.sender.send('load-screenshot-data', pendingEditorImage);
    pendingEditorImage = null;
  }
});

let previewWindows: BrowserWindow[] = [];
let selectWindow: BrowserWindow | null = null;

ipcMain.on('close-preview-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
});

async function takeScreenshot(multiMode: boolean = false) {
  clipboard.clear();
  if (isAppCompact) mainWindow?.hide(); // Скрываем только скрытое (компактное) меню при начале скриншота
  
  try {
    const currentDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const scaleFactor = currentDisplay.scaleFactor;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { 
        width: currentDisplay.size.width * scaleFactor, 
        height: currentDisplay.size.height * scaleFactor 
      }
    });
    
    if (sources.length === 0) throw new Error('No screen sources found');
    
    // Find source matching the current display
    const currentSource = sources.find(s => s.display_id === currentDisplay.id.toString()) || sources[0];
    const dataUrl = currentSource.thumbnail.toDataURL();
    
    if (currentFastMode) {
      const image = nativeImage.createFromDataURL(dataUrl);
      clipboard.writeImage(image);
      
      if (currentSaveToDisk) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `Screenshot-${timestamp}.png`;
          const savePath = currentCustomFolder ? path.join(currentCustomFolder, fileName) : path.join(app.getPath('pictures'), fileName);
          fs.writeFileSync(savePath, image.toPNG());
        } catch (e) {
          console.error("Failed to save fast screenshot:", e);
        }
      }
      
      mainWindow?.webContents.send('fast-screenshot-done', dataUrl);
      
      if (isAppCompact && previewWindows.length === 0) mainWindow?.show();
      return;
    }
    
    if (!selectWindow || selectWindow.isDestroyed()) {
      selectWindow = new BrowserWindow({
        x: currentDisplay.bounds.x,
        y: currentDisplay.bounds.y,
        width: currentDisplay.bounds.width,
        height: currentDisplay.bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        enableLargerThanScreen: true,
        resizable: false,
        show: false,
        webPreferences: {
          preload: path.join(__dirname, 'preload.mjs'),
          contextIsolation: true,
        }
      });
      selectWindow.setAlwaysOnTop(true, 'screen-saver');
      if (process.env.VITE_DEV_SERVER_URL) {
        selectWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/screenshot-select');
      } else {
        selectWindow.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: '/screenshot-select' });
      }
      
      selectWindow.webContents.on('did-finish-load', () => {
        selectWindow?.webContents.send('load-screenshot-data', dataUrl);
        selectWindow?.show();
      });
      
      selectWindow.on('close', (e) => {
        // Prevent default close, just hide
        if (!(app as any).isQuiting) {
          e.preventDefault();
          selectWindow?.hide();
          if (isAppCompact && previewWindows.length === 0) mainWindow?.show();
        }
      });
    } else {
      selectWindow.setBounds(currentDisplay.bounds);
      selectWindow.webContents.send('load-screenshot-data', dataUrl);
      selectWindow.show();
    }
  } catch (err) {
    console.error('Screenshot failed:', err);
    if (isAppCompact) mainWindow?.show();
  }
}

// Ensure windows actually close when app quits
app.on('before-quit', () => {
  // @ts-ignore
  app.isQuiting = true;
});

ipcMain.on('cropped-screenshot', (event, croppedDataUrl, multiMode) => {
  if (selectWindow) selectWindow.hide();
  
  if (currentFastMode) {
    const image = nativeImage.createFromDataURL(croppedDataUrl);
    clipboard.writeImage(image);
    // Let's close preview windows if not multiMode just in case
    if (!multiMode) {
      previewWindows.forEach(win => {
        if (!win.isDestroyed()) win.close();
      });
      previewWindows = [];
    }
    if (isAppCompact && previewWindows.length === 0) mainWindow?.show();
    
    showCustomNotification('Скриншот', 'Область сохранена в буфер обмена', croppedDataUrl);
    return;
  }

  if (!multiMode) {
    previewWindows.forEach(win => {
      if (!win.isDestroyed()) win.close();
    });
    previewWindows = [];
  }
  
  const newPreviewWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    }
  });
    
  if (process.env.VITE_DEV_SERVER_URL) {
    newPreviewWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/preview');
  } else {
    newPreviewWindow.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: '/screenshot-preview' });
  }
  
  newPreviewWindow.webContents.on('did-finish-load', () => {
    newPreviewWindow?.webContents.send('load-screenshot-data', croppedDataUrl);
    newPreviewWindow?.show();
  });
  
  newPreviewWindow.on('closed', () => {
    previewWindows = previewWindows.filter(w => w !== newPreviewWindow);
    if (isAppCompact && !selectWindow && previewWindows.length === 0) mainWindow?.show();
  });

  previewWindows.push(newPreviewWindow);
});

let currentSaveToDisk = true;
let currentCustomFolder: string | null = null;
let currentFastMode = false;

ipcMain.on('take-screenshot', (event, multiMode, fastMode = false, delay = 0, saveToDisk = true, customFolder: string | null = null) => {
  currentFastMode = fastMode;
  currentSaveToDisk = saveToDisk;
  currentCustomFolder = customFolder;
  if (delay > 0) {
    if (isAppCompact) mainWindow?.hide(); // Hide immediately
    setTimeout(() => {
      takeScreenshot(multiMode);
    }, delay * 1000);
  } else {
    takeScreenshot(multiMode);
  }
});

ipcMain.on('show-screenshot-menu', (event, dataUrl, strings) => {
  const template = [
    {
      label: strings?.saveAs || 'Сохранить как...',
      click: async () => {
        const { filePath } = await dialog.showSaveDialog({
          title: strings?.saveAs || 'Сохранить скриншот',
          defaultPath: 'Скриншот.png',
          filters: [{ name: 'Images', extensions: ['png'] }]
        });
        if (filePath) {
          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);
        }
      }
    },
    {
      label: strings?.copy || 'Копировать',
      click: () => {
        const image = nativeImage.createFromDataURL(dataUrl);
        clipboard.writeImage(image);
      }
    },
    {
      label: strings?.openPaint || 'Перейти в Paint',
      click: () => {
        const tempPath = path.join(app.getPath('temp'), `screenshot_${Date.now()}.png`);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(tempPath, buffer);
        exec(`mspaint "${tempPath}"`);
        const win = previewWindows.length > 0 ? previewWindows[previewWindows.length - 1] : mainWindow;
        if (win && win instanceof BrowserWindow) {
            win.close();
        }
      }
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  // @ts-ignore
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

let isAppCompact = false;
let savedWindowSize: [number, number] = [480, 650]; // default size
let compactHeight = 380; // stores the calculated compact height

ipcMain.on('set-compact-mode', (event, isCompact, height) => {
  isAppCompact = isCompact;
  if (mainWindow) {
    if (isCompact) {
      // Save current size before going compact
      savedWindowSize = mainWindow.getSize() as [number, number];
      
      const targetHeight = height || 380;
      compactHeight = targetHeight; // save for mini mode restore
      mainWindow.setMinimumSize(54, targetHeight);
      mainWindow.setMaximumSize(120, targetHeight);
      mainWindow.setSize(54, targetHeight);
      mainWindow.setAspectRatio(54/targetHeight);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
      mainWindow.setAspectRatio(0);
      mainWindow.setMaximumSize(9999, 9999);
      mainWindow.setMinimumSize(320, 300);
      // Restore saved size (at least minimum)
      const [w, h] = savedWindowSize;
      mainWindow.setSize(max(320, w), max(300, h));
    }
  }
});

function max(a: number, b: number) { return a > b ? a : b; }

let toolWindows: Record<string, BrowserWindow | null> = {};

function openToolWin(tool: string) {
  if (toolWindows[tool] && !toolWindows[tool]?.isDestroyed()) {
    if (tool === 'image-editor') {
      toolWindows[tool]?.show();
      toolWindows[tool]?.focus();
      return;
    }
    toolWindows[tool]?.close();
    return;
  }
  
  let wWidth = 380;
  let wHeight = (tool === 'tasks' || tool === 'reminders' || tool === 'notes') ? 550 : 450;
  if (tool === 'periodicTable' || tool === 'desmos') {
    wWidth = 900;
    wHeight = 650;
  } else if (tool === 'formulas') {
    wWidth = 450;
    wHeight = 600;
  } else if (tool === 'image-editor') {
    wWidth = 1200;
    wHeight = 800;
  } else if (tool === 'superHumanizer') {
    wWidth = 1300;
    wHeight = 850;
  }

  const w = new BrowserWindow({
    width: wWidth,
    height: wHeight,
    minWidth: 100,
    minHeight: 100,
    frame: false,
    transparent: tool !== 'image-editor',
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    }
  });

  if (tool === 'image-editor') {
    w.maximize();
  }

  toolWindows[tool] = w;

  w.on('closed', () => {
    toolWindows[tool] = null;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    w.loadURL(process.env.VITE_DEV_SERVER_URL + `#/${tool}`);
  } else {
    w.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: `/${tool}` });
  }
}

ipcMain.on('open-tool-window', (event, tool) => {
  openToolWin(tool);
});

ipcMain.handle('kill-port', async (event, port) => {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
      if (error || !stdout) {
        return resolve({ success: false, message: `Порт ${port} свободен или не найден.` });
      }
      
      const lines = stdout.trim().split('\n');
      // Find a line that actually ends with the port to avoid partial matches (e.g. 300 vs 3000)
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

// --- NEW SETTINGS APIs ---
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

let currentShortcuts: any = {};
let currentScreenshotDelay = 0;
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
        if (mainWindow) mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
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
        currentFastMode = fastScreenshot || false;
        if (currentScreenshotDelay > 0) {
          if (isAppCompact) mainWindow?.hide();
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

let notificationWins: BrowserWindow[] = [];
const notifDataMap = new Map<number, { title: string, body: string, image?: string }>();

function showCustomNotification(title: string, body: string, image?: string) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.workArea;

  const winWidth = 320;
  const winHeight = image ? 220 : 110;
  
  const padding = 20;
  // Offset vertically for multiple notifications
  const verticalOffset = notificationWins.length * (winHeight + 10);
  
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

  notificationWins.push(notifWin);
  notifDataMap.set(notifWin.id, { title, body, image });

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
    notifDataMap.delete(notifWin.id);
    notificationWins = notificationWins.filter(w => w !== notifWin);
  });

  // Automatically close notification after 6 seconds
  setTimeout(() => {
    if (!notifWin.isDestroyed()) {
      notifWin.close();
    }
  }, 6000);
}

ipcMain.on('request-notification-data', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && notifDataMap.has(win.id)) {
    const data = notifDataMap.get(win.id);
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

ipcMain.on('set-mini-mode', (event, isMini) => {
  if (mainWindow) {
    if (isMini) {
      mainWindow.setMinimumSize(54, 54);
      mainWindow.setMaximumSize(54, 54);
      mainWindow.setSize(54, 54);
      mainWindow.setAspectRatio(1);
    } else {
      // Restore to compact height (not hardcoded 380)
      mainWindow.setAspectRatio(0);
      mainWindow.setMinimumSize(54, compactHeight);
      mainWindow.setMaximumSize(120, compactHeight);
      mainWindow.setSize(54, compactHeight);
      mainWindow.setAspectRatio(54 / compactHeight);
    }
  }
});

// ================== HUMAN TYPER ==================
let typerState = { running: false, paused: false };
let currentTyperHotkey = '';
let currentTyperStopHotkey = '';
let currentTyperPauseHotkey = '';
let appHumanTyperText = '';
let currentTyperConfig: any = null;

ipcMain.on('update-human-typer-text', (event, text) => {
    if (appHumanTyperText !== text) {
        if (typerState.running || typerState.paused) {
            typerState.running = false;
            typerState.paused = false;
            mainWindow?.webContents.send('human-typer-state', false);
            mainWindow?.webContents.send('human-typer-paused', false);
        }
        appHumanTyperText = text;
    }
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getTypoChar = (ch: string) => {
    const lower = ch.toLowerCase();
    const neighbors: Record<string, string> = {
        "q":"wa",     "w":"qase",   "e":"wsdr",   "r":"edft",   "t":"rfgy",   "y":"tghu",   "u":"yhji",   "i":"ujko",   "o":"iklp",   "p":"ol",
        "a":"qwsz",   "s":"awedxz", "d":"serfcx", "f":"drtgvc", "g":"ftyhbv", "h":"gyujnb", "j":"huikmn", "k":"jiolm",  "l":"kop",
        "z":"asx",    "x":"zsdc",   "c":"xdfv",   "v":"cfgb",   "b":"vghn",   "n":"bhjm",   "m":"njk",
        "й":"цф",     "ц":"уйвы",   "у":"кацв",   "к":"еуап",   "е":"нкпр",   "н":"геро",   "г":"шнл",    "ш":"щгд",    "щ":"зшж",    "з":"хщэ",
        "ф":"яцв",    "ы":"цвчф",   "в":"уасыч",  "а":"кпмв",   "п":"ериак",  "р":"нтоп",   "о":"гьтр",   "л":"шбдо",   "д":"щюл",    "ж":"зэ",
        "я":"чф",     "ч":"ясы",    "с":"чмив",   "м":"спак",   "и":"мптр",   "т":"иьро",   "ь":"тбло",   "б":"ьюд",    "ю":"бж"
    };
    if (!neighbors[lower]) return 'e';
    const opts = neighbors[lower];
    let t = opts.charAt(Math.floor(Math.random() * opts.length));
    if (ch !== lower) t = t.toUpperCase();
    return t;
};

async function runHumanTyper(text: string, config: any) {
  typerState.running = true;
  typerState.paused = false;
  
  const baseDelay = config.speed || 95;
  const typoPct = config.errors || 28;
  const thinkPct = config.thinkPct || 35;
  const thinkMin = config.thinkMin || 350;
  const thinkMax = config.thinkMax || 1400;

  await sleep(500);

  let wordTyposRemaining = 0;
  
  for (let i = 0; i < text.length; i++) {
    if (!typerState.running) break;
    while (typerState.paused) {
      if (!typerState.running) return;
      await sleep(100);
    }
    
    const ch = text[i];
    
    if (ch === '.' && text.substring(i, i+3) === '...') {
      try { robot.typeString('...'); } catch (e) {}
      i += 2;
      await sleep(baseDelay + 2000);
      continue;
    }

    const prev = i > 0 ? text[i-1] : " ";
    const isWordChar = (c: string) => /[\p{L}\p{N}_]/u.test(c);
    
    if (!isWordChar(prev) && isWordChar(ch)) {
      if (Math.random() * 100 <= typoPct) {
        wordTyposRemaining = Math.floor(Math.random() * 3) + 1;
      }
    }

    let actualDelay = baseDelay;
    const r = Math.random() * 100;
    if (r <= 14) actualDelay = Math.max(25, baseDelay - 35) + Math.random() * 10;
    else if (r <= 38) actualDelay = baseDelay + 25 + Math.random() * 60;
    else actualDelay = Math.max(20, baseDelay - 10) + Math.random() * 20;

    if (wordTyposRemaining > 0 && isWordChar(ch) && Math.random() * 100 <= 60) {
      const wrong = getTypoChar(ch);
      try { robot.typeString(wrong); } catch(e) {}
      await sleep(actualDelay);
      
      await sleep(140 + Math.random() * 280);
      robot.keyTap('backspace');
      await sleep(actualDelay);
      wordTyposRemaining--;
    }
    
    if (ch === '\n') {
        robot.keyTap('enter');
    } else {
        try {
            robot.typeString(ch);
        } catch (e) {
            const oldClip = clipboard.readText();
            clipboard.writeText(ch);
            robot.keyTap('v', 'control');
            clipboard.writeText(oldClip);
        }
    }
    
    if (ch === ' ') {
      actualDelay += 15 + Math.random() * 40;
      if (Math.random() * 100 <= thinkPct) {
        actualDelay += thinkMin + Math.random() * (thinkMax - thinkMin);
      }
    } else if (ch === '\n') {
      actualDelay += 220 + Math.random() * 300;
    } else if (ch === ',') {
      actualDelay += 1000;
    } else if (ch === '.' || ch === '!' || ch === '?' || ch === '…') {
      actualDelay += 2000;
    }
    
    await sleep(actualDelay);
  }
  typerState.running = false;
  mainWindow?.webContents.send('human-typer-state', false);
}

ipcMain.on('set-human-typer-config', (event, startHotkey, pauseHotkey, stopHotkey, config) => {
  if (currentTyperHotkey && globalShortcut.isRegistered(currentTyperHotkey)) {
    globalShortcut.unregister(currentTyperHotkey);
  }
  if (currentTyperPauseHotkey && globalShortcut.isRegistered(currentTyperPauseHotkey)) {
    globalShortcut.unregister(currentTyperPauseHotkey);
  }
  if (currentTyperStopHotkey && globalShortcut.isRegistered(currentTyperStopHotkey)) {
    globalShortcut.unregister(currentTyperStopHotkey);
  }
  
  currentTyperHotkey = startHotkey;
  currentTyperPauseHotkey = pauseHotkey;
  currentTyperStopHotkey = stopHotkey;
  currentTyperConfig = config;
  
  if (startHotkey) {
    try {
      globalShortcut.register(startHotkey, () => {
        if (!typerState.running) {
          const text = appHumanTyperText || clipboard.readText();
          if (text) {
             runHumanTyper(text, config);
             mainWindow?.webContents.send('human-typer-state', true);
             mainWindow?.webContents.send('human-typer-paused', false);
          }
        } else {
          // Toggle Stop if it's running
          typerState.running = false;
          typerState.paused = false;
          mainWindow?.webContents.send('human-typer-state', false);
          mainWindow?.webContents.send('human-typer-paused', false);
        }
      });
    } catch(e) {}
  }

  if (pauseHotkey) {
    try {
      globalShortcut.register(pauseHotkey, () => {
        if (typerState.running) {
          typerState.paused = !typerState.paused;
          mainWindow?.webContents.send('human-typer-paused', typerState.paused);
        }
      });
    } catch(e) {}
  }
  
  if (stopHotkey) {
    try {
      globalShortcut.register(stopHotkey, () => {
         typerState.running = false;
         typerState.paused = false;
         mainWindow?.webContents.send('human-typer-state', false);
         mainWindow?.webContents.send('human-typer-paused', false);
      });
    } catch(e) {}
  }
});

ipcMain.on('start-human-typing', (event, text, config) => {
    if (typerState.running && typerState.paused) {
        typerState.paused = false;
        mainWindow?.webContents.send('human-typer-paused', false);
    } else if (!typerState.running && text) {
        runHumanTyper(text, config);
        mainWindow?.webContents.send('human-typer-state', true);
        mainWindow?.webContents.send('human-typer-paused', false);
    }
});

ipcMain.on('pause-human-typing', () => {
    if (typerState.running) {
        typerState.paused = true;
        mainWindow?.webContents.send('human-typer-paused', true);
    }
});

ipcMain.on('stop-human-typing', () => {
    typerState.running = false;
    typerState.paused = false;
    mainWindow?.webContents.send('human-typer-state', false);
    mainWindow?.webContents.send('human-typer-paused', false);
});

// ================== SUPER HUMANIZER (AI) ==================
let ai: any = null;
let currentAiKey = '';

ipcMain.on('update-ai-key', (event, key) => {
    currentAiKey = key;
    if (key) {
        try {
            ai = new GoogleGenAI({ apiKey: key });
        } catch (e) {
            console.error('Failed to init AI', e);
            ai = null;
        }
    } else {
        ai = null;
    }
});

async function callModelWithFallback(prompt: string, preferredModel: string, useWebSearch: boolean = false, isHumanizing: boolean = false) {
  if (!ai) throw new Error('API Key not set');

  const modelsToTry = [
    preferredModel || 'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.1-pro'
  ];
  
  const uniqueModels = [...new Set(modelsToTry)];
  let lastError = null;
  const searchModes = useWebSearch ? [true, false] : [false];

  for (const withSearch of searchModes) {
    for (const model of uniqueModels) {
      try {
        const options: any = {
          model,
          contents: prompt,
          config: {
            temperature: isHumanizing ? 1.05 : 0.4,
            topP: 0.95,
          }
        };

        if (withSearch) {
          options.config.tools = [{ googleSearch: {} }];
        }

        const generatePromise = ai.models.generateContent(options);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Model ${model} timed out after 12s`)), 12000)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          return response.text;
        }
      } catch (error: any) {
        lastError = error;
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
  throw lastError || new Error('All models failed to respond.');
}

ipcMain.handle('analyze-text', async (event, { text, context, useWebSearch }) => {
  if (!ai) return { error: 'API Key not set' };
  
  try {
    const prompt = `You are an expert AI detector, literary editor, and academic writing critic.
Analyze the following text with extreme depth and accuracy.

CRITICAL REQUIREMENT: Write the entire analysis, headings, and explanations in Russian language!

Text Context / Target Schema (Provided by author):
${context ? `"${context}"` : 'None specified (General analysis)'}

Analyze and provide:
1. 📊 **Оценка / AI Score**: Probability of AI generation vs Human authorship, with nuanced breakdown.
2. ⚠️ **Признаки ИИ / AI Patterns**: Specific clichés, robotic structural artifacts, or natural human quirks.
3. 📝 **Анализ структуры и фактов / Content & Structure Review**: Check if the text fulfills the author's stated context/schema (e.g. SEE schema, IELTS requirements, logical consistency, fact strength).
4. 💡 **Практические рекомендации / Actionable Advice**: Exactly what to refine or add to make it sound authentically human and persuasive.

Text to analyze:
${text}`;
    
    const result = await callModelWithFallback(prompt, 'gemini-3.6-flash', useWebSearch, false);
    return { success: true, result };
  } catch (error: any) {
    return { error: error.message || 'Failed to analyze text' };
  }
});

function sanitizeHumanizedText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/^(Here is|Sure|Here's|Below is)[^\n]*\n+/i, '');
  cleaned = cleaned.replace(/(^|\n+)(First off,?\s*|To begin with,?\s*|On top of that,?\s*|To wrap it up,?\s*|In conclusion,?\s*|Moreover,?\s*|Furthermore,?\s*|Additionally,?\s*|All in all,?\s*|At the same time,?\s*)/gim, '$1');
  cleaned = cleaned.replace(/(^|\n+)(Let['’]s be honest:?\s*|Let['’]s face it:?\s*|The best part\??\s*|At its core,?\s*|Here['’]s the thing:?\s*|Here['’]s the kicker:?\s*|It['’]s important to remember that\s*|It is worth noting that\s*|At the end of the day,?\s*)/gim, '$1');
  cleaned = cleaned.replace(/\s*—\s*/g, ', ');
  cleaned = cleaned.replace(/\s*–\s*/g, '-');
  let aBitCount = 0;
  cleaned = cleaned.replace(/\ba bit\b/gi, (match) => {
    aBitCount++;
    return aBitCount <= 2 ? match : 'somewhat';
  });
  let usuallyCount = 0;
  cleaned = cleaned.replace(/\b(usually|tends to|kind of|sort of)\b/gi, (match) => {
    usuallyCount++;
    return usuallyCount <= 3 ? match : '';
  });
  cleaned = cleaned.replace(/\b(Think about [\w\s]+ for a second[,.]?)/gi, '');
  cleaned = cleaned.replace(/\b(Then the (?:nineties|eighties|seventies|sixties|forties|thirties|twenty[- ]twenties|early \d{4}s?) hit[,.]?)/gi, 'By the $1,');
  cleaned = cleaned.replace(/\b([A-Z][\w\s]+ completely changed because of this( too)?[,.]?)/gi, '');
  cleaned = cleaned.replace(/\b(All that utility comes with [\w\s]+[,.]?)/gi, '');
  cleaned = cleaned.replace(/\b(What started as [\w\s]+ (roadblock|puzzle|problem) (grew|turned|evolved) into)/gi, 'That');
  cleaned = cleaned.replace(/  +/g, ' ');
  cleaned = cleaned.replace(/^\s+/gm, '');
  return cleaned.trim();
}

ipcMain.handle('humanize-text', async (event, { text, style, additionalInstructions, context, useWebSearch, strictLength }) => {
  if (!ai) return { error: 'API Key not set' };

  try {
    const prompt = `You are a master ghostwriter. Your ONLY job is to rewrite the given text so it passes Sapling, Copyleaks, ZeroGPT, QuillBot, and Scribbr at 0% AI — without sounding like AI trying to fake being human.

TARGET STYLE: ${style}
AUTHOR CONTEXT: ${context ? `"${context}"` : 'None specified'}
USER DIRECTIVES: ${additionalInstructions || 'None'}
SOURCE WORD COUNT: ${text.trim().split(/\s+/).length} words.
${strictLength 
  ? "CRITICAL RULE: Your output MUST be EXACTLY the same length or longer. Do NOT summarize or cut details. Expand on ideas slightly if necessary to match the word count exactly." 
  : `Your output MUST be between ${Math.round(text.trim().split(/\s+/).length * 0.88)} and ${Math.round(text.trim().split(/\s+/).length * 1.15)} words. Count as you write.`
}

=== THE TWO THINGS DETECTORS ACTUALLY MEASURE ===
1. PERPLEXITY (word predictability): AI always picks the most statistically "safe" word.
2. BURSTINESS (sentence length variance): AI produces sentences of nearly identical length.

=== CRITICAL WARNING: "HUMAN-LIKE PADDING" IS ALSO DETECTED ===
RULE: Use natural hedges SPARINGLY — maximum 2 per entire text, only where they fit organically.
RULE: Match the register to the style. Academic style = no "I think" or "kinda". Formal essay = no slang.

=== CONVERSATIONAL ENGAGEMENT HOOKS — BANNED IN ALL STYLES ===
- "Think about [X] for a second" — banned
- "Then the nineties hit" / "Then the eighties hit" — banned (use a specific year instead)

=== GEN Z THINKING MODE (UNIVERSAL BASELINE) ===
- Start mid-thought, not at the beginning of the topic. Real people don't open with a thesis.
- Thoughts connect by feeling/association, not by logical argument chain. One thing reminds you of another.
- Circle back. Mention something from paragraph 1 again in paragraph 3, slightly differently.
- Include one moment where the thought seems to correct itself or change direction mid-sentence.
- The most important point doesn't go first or last — it's buried somewhere in the middle, almost casually.

=== STYLE-SPECIFIC RULES ===
IF style is CASUAL / CONVERSATIONAL: First person is fine, short fragments allowed.
IF style is ACADEMIC / FORMAL / SCHOOL ESSAY: NO first-person casual hedges, use academic natural variation, BURSTINESS IS MANDATORY. BANNED BUREAUCRATIC VOCABULARY.

=== UNIVERSAL RULES (ALL STYLES) ===
1. PERPLEXITY: Choose the unexpected but clear word.
2. BURSTINESS: Include at least 2 sentences between 2 and 6 words AND at least 1 sentence over 28 words.
3. NO EM DASHES (—) OR EN DASHES (–).
4. NO PARALLEL PARAGRAPH OPENERS.
5. NO SUMMARY ENDINGS.
6. BREAK THE PREDICTABLE ESSAY ORDER.
7. IDIOM DENSITY LIMIT: Maximum 2.
8. NEUTRAL HEDGE LIMIT: Maximum 2-3 total.
9. PRESERVE 100% OF ORIGINAL CONTENT AND APPROXIMATE LENGTH.
10. BAN "THESIS → SCIENCE → EXAMPLE" TEMPLATE.
11. BAN RHYTHMIC RULE-OF-THREE LISTS.
12. NO CLINICAL VOCABULARY WITHOUT PERSONAL TRANSLATION.
13. FIRST SENTENCE AND LAST PARAGRAPH ARE THE HIGHEST-RISK ZONES.

Return ONLY the humanized text. No intro, no quotes, no commentary.

Original Text:
${text}
`;

    const rawResult = await callModelWithFallback(prompt, 'gemini-3.6-flash', useWebSearch, true);
    const afterSanitize = sanitizeHumanizedText(rawResult);

    const critiquePrompt = `You are an expert AI text detector and editor. You will review a humanized text for any remaining AI detection signatures, then produce a corrected version.

TEXT TO REVIEW:
"""
\${afterSanitize}
"""

WHAT TO CHECK FOR (be strict):
1. Em dashes (—) or en dashes (–) anywhere in the text
2. Any "thesis → science → example" 3-step paragraph pattern
3. Any "Rule of Three" rhythmic triplet
4. First sentence starting with a universal claim or "Subject is/are..." construction
5. Last paragraph ending with a motivational summary or call to action
6. Clinical vocabulary used without sensory grounding
7. "A bit", "usually", "tends to", "kind of" appearing more than 3 times total
8. Consecutive paragraphs starting with the same grammatical pattern
9. Any sentence from this banned list appearing verbatim: "furthermore", "moreover", "in conclusion", "this demonstrates"
10. Output that is significantly shorter than the original
11. SERVICE-BRIDGE TRANSITIONS (listicle glue)
12. CINEMATIC HYPERBOLE

OUTPUT FORMAT — follow exactly:
ISSUES: [list each problem you found, one per line, or write "None" if clean]
REVISED:
[the complete corrected text — if no issues, copy the original unchanged]`;

    let finalText = afterSanitize;
    try {
      const critiqueRaw = await callModelWithFallback(critiquePrompt, 'gemini-3.6-flash', false, false);
      const revisedMatch = critiqueRaw.match(/REVISED:\s*([\s\S]+)$/i);
      if (revisedMatch && revisedMatch[1].trim().length > 50) {
        finalText = revisedMatch[1].trim();
      }
    } catch (critiqueError: any) {
      console.warn('Pass 2 self-critique failed, using Pass 1 result');
    }

    const result = sanitizeHumanizedText(finalText);
    return { success: true, result };

  } catch (error: any) {
    return { error: error.message || 'Failed to humanize text' };
  }
});



ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// ==========================================
// ⚡ AUTOCLICKER
// ==========================================
let autoclickerIntervalId: any = null;
let autoclickerActive = false;
let currentAutoclickerHotkey = '';
let currentAutoclickerConfig = {
  interval: 100,
  intervalUnit: 'ms' as 'ms' | 's' | 'm',
  button: 'left' as 'left' | 'right' | 'middle',
  randomizeMs: 0,
  clickDelay: 10
};

function broadcastAutoclickerState(isActive: boolean) {
  try {
    mainWindow?.webContents.send('autoclicker-state-changed', isActive);
    if (toolWindows['autoclicker'] && !toolWindows['autoclicker'].isDestroyed()) {
      toolWindows['autoclicker'].webContents.send('autoclicker-state-changed', isActive);
    }
  } catch (e) {}
}

function getAutoclickerDelay(): number {
  let base = currentAutoclickerConfig.interval || 100;
  if (currentAutoclickerConfig.intervalUnit === 's') base *= 1000;
  if (currentAutoclickerConfig.intervalUnit === 'm') base *= 60000;
  if (currentAutoclickerConfig.randomizeMs > 0) {
    const delta = (Math.random() * 2 - 1) * currentAutoclickerConfig.randomizeMs;
    base = Math.max(1, base + delta);
  }
  return Math.max(1, Math.round(base));
}

async function executeAutoclick() {
  if (!autoclickerActive) return;
  try {
    const btn = currentAutoclickerConfig.button || 'left';
    const clickDelay = currentAutoclickerConfig.clickDelay || 10;
    robot.mouseToggle("down", btn);
    await sleep(clickDelay);
    robot.mouseToggle("up", btn);
  } catch (err) {
    console.error('Autoclicker error:', err);
  }
  if (autoclickerActive) {
    autoclickerIntervalId = setTimeout(executeAutoclick, getAutoclickerDelay());
  }
}

function startAutoclicker() {
  if (autoclickerActive) return;
  autoclickerActive = true;
  broadcastAutoclickerState(true);
  executeAutoclick();
}

function stopAutoclicker() {
  if (!autoclickerActive) return;
  autoclickerActive = false;
  if (autoclickerIntervalId) {
    clearTimeout(autoclickerIntervalId);
    autoclickerIntervalId = null;
  }
  broadcastAutoclickerState(false);
}

function toggleAutoclicker() {
  if (autoclickerActive) {
    stopAutoclicker();
  } else {
    startAutoclicker();
  }
}

ipcMain.on('set-autoclicker-config', (event, hotkey, interval, intervalUnit, button, randomizeMs, clickDelay) => {
  currentAutoclickerConfig = { interval, intervalUnit, button, randomizeMs, clickDelay };
  if (hotkey !== currentAutoclickerHotkey) {
    if (currentAutoclickerHotkey) {
      try { globalShortcut.unregister(currentAutoclickerHotkey); } catch (e) {}
    }
    currentAutoclickerHotkey = hotkey;
    if (hotkey) {
      try {
        globalShortcut.register(hotkey, () => {
          toggleAutoclicker();
        });
      } catch (err) {
        console.error('Failed to register autoclicker shortcut:', err);
      }
    }
  }
});

// --- PLUGIN SYSTEM ---
const PLUGINS_DIR = path.join(app.getPath('userData'), 'plugins');

if (!fs.existsSync(PLUGINS_DIR)) {
  try { fs.mkdirSync(PLUGINS_DIR, { recursive: true }); } catch (e) {}
}

ipcMain.handle('get-plugins', async () => {
  const plugins = [];
  try {
    if (!fs.existsSync(PLUGINS_DIR)) return [];
    const folders = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
    
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const pluginPath = path.join(PLUGINS_DIR, folder.name);
        const manifestPath = path.join(pluginPath, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifestData = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestData);
            
            const mainFile = manifest.main || 'index.js';
            const mainFilePath = path.join(pluginPath, mainFile);
            
            let isVerified = false;
            
            if (fs.existsSync(mainFilePath)) {
              if (manifest.signature) {
                 try {
                    const sigBase64 = manifest.signature;
                    const manifestCopy = { ...manifest };
                    delete manifestCopy.signature;
                    
                    // Sort keys alphabetically and serialize compact (no spaces) to match Python:
                    // json.dumps(manifest, separators=(',',':'), sort_keys=True)
                    const sortedKeys = Object.keys(manifestCopy).sort();
                    const sortedManifest: any = {};
                    for (const k of sortedKeys) sortedManifest[k] = manifestCopy[k];
                    const manifestStr = JSON.stringify(sortedManifest);
                    const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
                    
                    // Simple concatenation to match Python: manifest_str + index_js_content
                    const payload = manifestStr + mainContent;
                    
                    const verify = crypto.createVerify('SHA256');
                    verify.update(payload, 'utf8');
                    verify.end();
                    
                    // Use PKCS1v15 (default RSA_PKCS1_PADDING)
                    isVerified = verify.verify(PUBLIC_KEY, Buffer.from(sigBase64, 'base64'));
                 } catch (e) {
                    console.error('Failed to verify plugin:', e);
                 }
              }


              plugins.push({
                ...manifest,
                folderName: folder.name,
                absolutePath: pluginPath,
                mainPath: mainFilePath,
                hasCss: fs.existsSync(path.join(pluginPath, 'style.css')),
                isVerified
              });
            }
          } catch (err) {
            console.error(`Failed to parse manifest for plugin ${folder.name}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to get plugins:', err);
  }
  return plugins;
});

ipcMain.handle('install-plugin', async (event, zipPath) => {
  try {
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    let rootFolder = '';
    const manifestEntry = zipEntries.find((entry: any) => entry.entryName.endsWith('manifest.json'));
    if (!manifestEntry) {
      throw new Error('manifest.json не найден в архиве (manifest.json not found in the ZIP archive)');
    }
    
    if (manifestEntry.entryName !== 'manifest.json') {
      rootFolder = manifestEntry.entryName.replace('manifest.json', '');
    }
    
    const pluginFolderName = 'plugin_' + Date.now();
    const extractPath = path.join(PLUGINS_DIR, pluginFolderName);
    
    zip.extractAllTo(extractPath, true);
    
    if (rootFolder) {
      const nestedPath = path.join(extractPath, rootFolder);
      if (fs.existsSync(nestedPath)) {
        const files = fs.readdirSync(nestedPath);
        for (const file of files) {
          fs.renameSync(path.join(nestedPath, file), path.join(extractPath, file));
        }
        fs.rmdirSync(nestedPath);
      }
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Install plugin error:', err);
    return { success: false, error: err.message || 'Unknown error during installation' };
  }
});

ipcMain.handle('uninstall-plugin', async (event, folderName) => {
  try {
    const pluginPath = path.join(PLUGINS_DIR, folderName);
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(pluginPath, { recursive: true, force: true });
      return { success: true };
    }
    return { success: false, error: 'Plugin folder not found' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-plugin-file', async (event, pluginId, filePath) => {
  try {
    if (!fs.existsSync(PLUGINS_DIR)) return null;
    const folders = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const pluginPath = path.join(PLUGINS_DIR, folder.name);
        const manifestPath = path.join(pluginPath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          if (manifest.id === pluginId) {
            const targetPath = path.join(pluginPath, filePath);
            if (fs.existsSync(targetPath)) {
              return fs.readFileSync(targetPath, 'utf-8');
            }
          }
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
});


ipcMain.handle('verify-plugin-zip', async (event, zipPath) => {
  try {
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    const manifestEntry = zipEntries.find((entry: any) => entry.entryName.endsWith('manifest.json'));
    if (!manifestEntry) {
      return { valid: false, error: 'В выбранном ZIP-архиве отсутствует файл manifest.json. Это не плагин TesseraDesk!' };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: 'Ошибка при чтении ZIP-архива: ' + err.message };
  }
});

ipcMain.handle('send-webhook', async (event, url, filePath, message) => {
  try {
    const fileData = fs.readFileSync(filePath);
    const blob = new Blob([fileData], { type: 'application/zip' });
    const formData = new FormData();
    formData.append('file', blob, path.basename(filePath));
    formData.append('content', message ? `Контакт/Сообщение: ${message}` : 'Новый плагин на проверку!');
    
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    return { success: res.ok, status: res.status, text: await res.text() };
  } catch (err: any) {
    console.error('Webhook error:', err);
    return { success: false, error: err.message };
  }
});
