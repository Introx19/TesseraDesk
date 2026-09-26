import { ipcMain, globalShortcut } from 'electron';
import { createRequire } from 'node:module';
import { appState } from './state';

const require = createRequire(import.meta.url);
const robot = require('robotjs');

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function broadcastAutoclickerState(isActive: boolean) {
  try {
    appState.mainWindow?.webContents.send('autoclicker-state-changed', isActive);
    if (appState.toolWindows['autoclicker'] && !appState.toolWindows['autoclicker'].isDestroyed()) {
      appState.toolWindows['autoclicker'].webContents.send('autoclicker-state-changed', isActive);
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

export function initAutoclicker() {
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
}
