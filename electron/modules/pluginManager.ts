import { app, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');

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

export function initPluginManager() {
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
                      
                      const sortedKeys = Object.keys(manifestCopy).sort();
                      const sortedManifest: any = {};
                      for (const k of sortedKeys) sortedManifest[k] = manifestCopy[k];
                      const manifestStr = JSON.stringify(sortedManifest);
                      const mainContent = fs.readFileSync(mainFilePath, 'utf-8');
                      
                      const payload = manifestStr + mainContent;
                      
                      const verify = crypto.createVerify('SHA256');
                      verify.update(payload, 'utf8');
                      verify.end();
                      
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
}
