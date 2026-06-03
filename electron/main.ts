import { app, BrowserWindow, ipcMain, globalShortcut, clipboard, Menu, dialog, nativeImage, protocol, Notification, Tray, screen, desktopCapturer } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import updaterPkg from 'electron-updater'
const { autoUpdater } = updaterPkg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

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
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true, corsEnabled: true, stream: true } }
])

app.whenReady().then(() => {
  protocol.registerFileProtocol('media', (request, callback) => {
    let pathname = decodeURI(request.url.replace(/^media:\/\/\/?/, ''));
    if (process.platform === 'win32') {
       pathname = pathname.replace(/\//g, '\\');
    }
    callback({ path: pathname });
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
    autoUpdater.checkForUpdatesAndNotify();
  }
})

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
})

ipcMain.on('open-paint', (event, filePath) => {
  if (filePath) {
    exec(`mspaint "${filePath}"`);
  } else {
    exec('mspaint');
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
    const primaryDisplay = screen.getPrimaryDisplay();
    const scaleFactor = primaryDisplay.scaleFactor;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { 
        width: primaryDisplay.size.width * scaleFactor, 
        height: primaryDisplay.size.height * scaleFactor 
      }
    });
    
    if (sources.length === 0) throw new Error('No screen sources found');
    
    // First source is usually the primary screen
    const primarySource = sources[0];
    const dataUrl = primarySource.thumbnail.toDataURL();
    
    if (!selectWindow || selectWindow.isDestroyed()) {
      selectWindow = new BrowserWindow({
        x: primaryDisplay.bounds.x,
        y: primaryDisplay.bounds.y,
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height,
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
        if (!app.isQuiting) {
          e.preventDefault();
          selectWindow?.hide();
          if (isAppCompact && previewWindows.length === 0) mainWindow?.show();
        }
      });
    } else {
      selectWindow.setBounds(primaryDisplay.bounds);
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
    newPreviewWindow?.webContents.send('screenshot-data', croppedDataUrl);
    newPreviewWindow?.show();
  });
  
  newPreviewWindow.on('closed', () => {
    previewWindows = previewWindows.filter(w => w !== newPreviewWindow);
    if (isAppCompact && !selectWindow && previewWindows.length === 0) mainWindow?.show();
  });

  previewWindows.push(newPreviewWindow);
});

ipcMain.on('take-screenshot', (event, multiMode) => {
  takeScreenshot(multiMode);
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

ipcMain.on('set-compact-mode', (event, isCompact, height) => {
  isAppCompact = isCompact;
  if (mainWindow) {
    if (isCompact) {
      // Save current size before going compact
      savedWindowSize = mainWindow.getSize() as [number, number];
      
      const targetHeight = height || 380;
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
  if (toolWindows[tool]) {
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
  }

  const w = new BrowserWindow({
    width: wWidth,
    height: wHeight,
    minWidth: 100,
    minHeight: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    }
  });

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
ipcMain.on('update-shortcuts', (event, shortcuts, multiScreenshot) => {
  try {
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
      globalShortcut.register(shortcuts.openScreenshot, () => takeScreenshot(multiScreenshot || false));
    }
    currentShortcuts = shortcuts;
  } catch (e) {
    console.error("Failed to register shortcuts", e);
  }
});

let notificationWins: BrowserWindow[] = [];

ipcMain.on('show-notification', (event, title, body) => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.workArea;

  const winWidth = 320;
  const winHeight = 110;
  
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

  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);

  if (process.env.VITE_DEV_SERVER_URL) {
    notifWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/notification?title=${encodedTitle}&body=${encodedBody}`);
  } else {
    notifWin.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: `/notification?title=${encodedTitle}&body=${encodedBody}` });
  }

  notifWin.on('closed', () => {
    notificationWins = notificationWins.filter(w => w !== notifWin);
  });

  // Automatically close notification after 6 seconds
  setTimeout(() => {
    if (!notifWin.isDestroyed()) {
      notifWin.close();
    }
  }, 6000);
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
      mainWindow.setAspectRatio(0);
      mainWindow.setMinimumSize(54, 380);
      mainWindow.setMaximumSize(120, 840);
      mainWindow.setSize(54, 380);
      mainWindow.setAspectRatio(54 / 380);
    }
  }
});
