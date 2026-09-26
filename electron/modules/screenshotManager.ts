import { app, BrowserWindow, ipcMain, clipboard, nativeImage, screen, desktopCapturer, dialog, Menu } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appState } from './state';
import { openToolWin } from './windowManager';
import { showCustomNotification } from './systemHandlers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function takeScreenshot(multiMode: boolean = false) {
  clipboard.clear();
  if (appState.isAppCompact) appState.mainWindow?.hide();
  
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
    
    const currentSource = sources.find(s => s.display_id === currentDisplay.id.toString()) || sources[0];
    const dataUrl = currentSource.thumbnail.toDataURL();
    
    if (appState.currentFastMode) {
      const image = nativeImage.createFromDataURL(dataUrl);
      clipboard.writeImage(image);
      
      if (appState.currentSaveToDisk) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `Screenshot-${timestamp}.png`;
          const savePath = appState.currentCustomFolder ? path.join(appState.currentCustomFolder, fileName) : path.join(app.getPath('pictures'), fileName);
          fs.writeFileSync(savePath, image.toPNG());
        } catch (e) {
          console.error("Failed to save fast screenshot:", e);
        }
      }
      
      appState.mainWindow?.webContents.send('fast-screenshot-done', dataUrl);
      
      if (appState.isAppCompact && appState.previewWindows.length === 0) appState.mainWindow?.show();
      return;
    }
    
    if (!appState.selectWindow || appState.selectWindow.isDestroyed()) {
      appState.selectWindow = new BrowserWindow({
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
      appState.selectWindow.setAlwaysOnTop(true, 'screen-saver');
      if (process.env.VITE_DEV_SERVER_URL) {
        appState.selectWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/screenshot-select');
      } else {
        appState.selectWindow.loadFile(path.join(process.env.DIST as string, 'index.html'), { hash: '/screenshot-select' });
      }
      
      appState.selectWindow.webContents.on('did-finish-load', () => {
        appState.selectWindow?.webContents.send('load-screenshot-data', dataUrl);
        appState.selectWindow?.show();
      });
      
      appState.selectWindow.on('close', (e) => {
        if (!(app as any).isQuiting) {
          e.preventDefault();
          appState.selectWindow?.hide();
          if (appState.isAppCompact && appState.previewWindows.length === 0) appState.mainWindow?.show();
        }
      });
    } else {
      appState.selectWindow.setBounds(currentDisplay.bounds);
      appState.selectWindow.webContents.send('load-screenshot-data', dataUrl);
      appState.selectWindow.show();
    }
  } catch (err) {
    console.error('Screenshot failed:', err);
    if (appState.isAppCompact) appState.mainWindow?.show();
  }
}

export function initScreenshotManager() {
  ipcMain.on('close-preview-window', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.close();
      }
  });

  ipcMain.on('cropped-screenshot', (event, croppedDataUrl, multiMode) => {
    if (appState.selectWindow) appState.selectWindow.hide();
    
    if (appState.currentFastMode) {
      const image = nativeImage.createFromDataURL(croppedDataUrl);
      clipboard.writeImage(image);
      if (!multiMode) {
        appState.previewWindows.forEach(win => {
          if (!win.isDestroyed()) win.close();
        });
        appState.previewWindows = [];
      }
      if (appState.isAppCompact && appState.previewWindows.length === 0) appState.mainWindow?.show();
      
      showCustomNotification('Скриншот', 'Область сохранена в буфер обмена', croppedDataUrl);
      return;
    }

    if (!multiMode) {
      appState.previewWindows.forEach(win => {
        if (!win.isDestroyed()) win.close();
      });
      appState.previewWindows = [];
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
      appState.previewWindows = appState.previewWindows.filter(w => w !== newPreviewWindow);
      if (appState.isAppCompact && !appState.selectWindow && appState.previewWindows.length === 0) appState.mainWindow?.show();
    });

    appState.previewWindows.push(newPreviewWindow);
  });

  ipcMain.on('take-screenshot', (event, multiMode, fastMode = false, delay = 0, saveToDisk = true, customFolder: string | null = null) => {
    appState.currentFastMode = fastMode;
    appState.currentSaveToDisk = saveToDisk;
    appState.currentCustomFolder = customFolder;
    if (delay > 0) {
      if (appState.isAppCompact) appState.mainWindow?.hide();
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
        label: strings?.openPaint || 'Открыть в редакторе',
        click: () => {
          appState.pendingEditorImage = dataUrl;
          const existingWin = appState.toolWindows['image-editor'];
          if (existingWin && !existingWin.isDestroyed()) {
            existingWin.show();
            existingWin.focus();
            existingWin.webContents.send('load-screenshot-data', dataUrl);
          } else {
            openToolWin('image-editor');
          }
          const win = appState.previewWindows.length > 0 ? appState.previewWindows[appState.previewWindows.length - 1] : appState.mainWindow;
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
}
