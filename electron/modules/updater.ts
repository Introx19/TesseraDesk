import { app, ipcMain } from 'electron';
import updaterPkg from 'electron-updater';
import { appState } from './state';
import { showCustomNotification } from './systemHandlers';

const { autoUpdater } = updaterPkg;

export function initUpdater() {
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
    autoUpdater.quitAndInstall(true, true);
  });
}

export function startAutoUpdaterConfig() {
  if (app.isPackaged) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info) => {
      appState.mainWindow?.webContents.send('update-available', info);
      showCustomNotification('TesseraDesk Update', `Доступна версия ${info.version}. Проверьте настройки!`);
    });
    autoUpdater.on('download-progress', (progress) => {
      appState.mainWindow?.webContents.send('download-progress', progress);
    });
    autoUpdater.on('update-downloaded', (info) => {
      appState.mainWindow?.webContents.send('update-downloaded', info);
    });
    autoUpdater.on('error', (err) => {
      appState.mainWindow?.webContents.send('update-error', err?.message || 'Update error');
    });
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3500);
  }
}
