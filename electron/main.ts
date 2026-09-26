import { app, protocol, globalShortcut } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createMainWindow, initWindowManager } from './modules/windowManager';
import { initScreenshotManager } from './modules/screenshotManager';
import { initSystemHandlers, initTray } from './modules/systemHandlers';
import { initUpdater, startAutoUpdaterConfig } from './modules/updater';
import { initHumanTyper } from './modules/humanTyper';
import { initSuperHumanizer } from './modules/superHumanizer';
import { initAutoclicker } from './modules/autoclicker';
import { initPluginManager } from './modules/pluginManager';
import { appState } from './modules/state';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'plugin', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: false } },
  { scheme: 'media', privileges: { bypassCSP: true, supportFetchAPI: true, secure: true, corsEnabled: true, stream: true } }
]);

app.setAppUserModelId('com.tesseradesk.app');

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (appState.mainWindow) {
      if (appState.mainWindow.isMinimized()) appState.mainWindow.restore();
      appState.mainWindow.show();
      appState.mainWindow.focus();
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
        const url = new URL(request.url);
        let pathname = decodeURIComponent(url.pathname);
        if (process.platform === 'win32') {
          pathname = pathname.replace(/^\//, '').replace(/\//g, '\\');
        }
        const content = fs.readFileSync(pathname);
        const isCSS = pathname.endsWith('.css');
        return new Response(content, {
          headers: { 'Content-Type': isCSS ? 'text/css' : 'application/javascript' }
        });
      } catch (e: any) {
        console.error('plugin:// protocol error:', e.message);
        return new Response(`// Error loading plugin: ${e.message}`, { status: 404, headers: { 'Content-Type': 'application/javascript' } });
      }
    });

    createMainWindow();
    initTray();
    
    initWindowManager();
    initScreenshotManager();
    initSystemHandlers();
    initUpdater();
    initHumanTyper();
    initSuperHumanizer();
    initAutoclicker();
    initPluginManager();

    startAutoUpdaterConfig();
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  // @ts-ignore
  app.isQuiting = true;
});
