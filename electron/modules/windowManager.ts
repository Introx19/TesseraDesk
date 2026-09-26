import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getToolConfig } from '../../src/config/toolsRegistry';
import { appState } from './state';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createMainWindow() {
  const mainWindow = new BrowserWindow({
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
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(process.env.DIST as string, 'index.html'));
  }
  
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window-maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-maximized', false));

  mainWindow.on('close', (event) => {
    if (!(app as any).isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  appState.mainWindow = mainWindow;
}

export function openToolWin(tool: string) {
  if (appState.toolWindows[tool] && !appState.toolWindows[tool]?.isDestroyed()) {
    if (tool === 'image-editor') {
      appState.toolWindows[tool]?.show();
      appState.toolWindows[tool]?.focus();
      return;
    }
    appState.toolWindows[tool]?.close();
    return;
  }
  
  const config = getToolConfig(tool);
  let wWidth = config ? config.defaultSize.width : 380;
  let wHeight = config ? config.defaultSize.height : 450;
  let minW = config ? config.minSize.width : 300;
  let minH = config ? config.minSize.height : 400;

  if (!config && tool.startsWith('plugin-')) {
    wWidth = 500;
    wHeight = 600;
    minW = 400;
    minH = 500;
  }

  const w = new BrowserWindow({
    width: wWidth,
    height: wHeight,
    minWidth: minW,
    minHeight: minH,
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

  appState.toolWindows[tool] = w;

  w.on('closed', () => {
    appState.toolWindows[tool] = null;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    w.loadURL(process.env.VITE_DEV_SERVER_URL + `#/${tool}`);
  } else {
    w.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: `/${tool}` });
  }
}

export function initWindowManager() {
  ipcMain.on('set-always-on-top', (event, flag) => {
    if (appState.mainWindow) {
      appState.mainWindow.setAlwaysOnTop(flag, flag ? 'screen-saver' : 'normal');
    }
  });

  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && win !== appState.mainWindow && !appState.previewWindows.includes(win)) {
      win.close(); 
    } else {
      appState.mainWindow?.hide();
    }
  });

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
  });

  ipcMain.on('window-show', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.show();
  });

  ipcMain.on('expand-for-picker', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      // @ts-ignore
      win.oldPickerBounds = win.getBounds();
      const currentDisplay = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      win.setBounds(currentDisplay.bounds);
    }
    event.returnValue = true;
  });

  ipcMain.on('restore-from-picker', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      // @ts-ignore
      if (win.oldPickerBounds) win.setBounds(win.oldPickerBounds);
    }
    event.returnValue = true;
  });

  ipcMain.on('resize-window', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      const currentSize = win.getSize();
      if (currentSize[0] < width || currentSize[1] < height) {
        win.setSize(Math.max(currentSize[0], width), Math.max(currentSize[1], height));
      }
    }
  });

  ipcMain.on('set-compact-mode', (event, isCompact, height) => {
    appState.isAppCompact = isCompact;
    if (appState.mainWindow) {
      if (isCompact) {
        appState.savedWindowSize = appState.mainWindow.getSize() as [number, number];
        const targetHeight = height || 380;
        appState.compactHeight = targetHeight;
        appState.mainWindow.setMinimumSize(54, targetHeight);
        appState.mainWindow.setMaximumSize(120, targetHeight);
        appState.mainWindow.setSize(54, targetHeight);
        appState.mainWindow.setAspectRatio(54/targetHeight);
        appState.mainWindow.setAlwaysOnTop(true, 'screen-saver');
      } else {
        appState.mainWindow.setAspectRatio(0);
        appState.mainWindow.setMaximumSize(9999, 9999);
        appState.mainWindow.setMinimumSize(320, 300);
        const [w, h] = appState.savedWindowSize;
        appState.mainWindow.setSize(Math.max(320, w), Math.max(300, h));
      }
    }
  });

  ipcMain.on('set-mini-mode', (event, isMini) => {
    if (appState.mainWindow) {
      if (isMini) {
        appState.mainWindow.setMinimumSize(54, 54);
        appState.mainWindow.setMaximumSize(54, 54);
        appState.mainWindow.setSize(54, 54);
        appState.mainWindow.setAspectRatio(1);
      } else {
        appState.mainWindow.setAspectRatio(0);
        appState.mainWindow.setMinimumSize(54, appState.compactHeight);
        appState.mainWindow.setMaximumSize(120, appState.compactHeight);
        appState.mainWindow.setSize(54, appState.compactHeight);
        appState.mainWindow.setAspectRatio(54 / appState.compactHeight);
      }
    }
  });

  ipcMain.on('open-tool-window', (event, tool) => {
    openToolWin(tool);
  });
  
  ipcMain.on('open-paint', (event, filePath) => {
    openToolWin('image-editor');
  });

  ipcMain.on('open-paint-with-image', (event, dataUrl) => {
    appState.pendingEditorImage = dataUrl;
    const existingWin = appState.toolWindows['image-editor'];
    if (existingWin && !existingWin.isDestroyed()) {
      existingWin.show();
      existingWin.focus();
      existingWin.webContents.send('load-screenshot-data', dataUrl);
    } else {
      openToolWin('image-editor');
    }
  });

  ipcMain.on('request-screenshot-data', (event) => {
    if (appState.pendingEditorImage) {
      event.sender.send('load-screenshot-data', appState.pendingEditorImage);
      appState.pendingEditorImage = null;
    }
  });
}
