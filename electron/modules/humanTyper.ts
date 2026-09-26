import { ipcMain, globalShortcut, clipboard } from 'electron';
import { createRequire } from 'node:module';
import { appState } from './state';

const require = createRequire(import.meta.url);
const robot = require('robotjs');

let currentTyperHotkey = '';
let currentTyperStopHotkey = '';
let currentTyperPauseHotkey = '';
let currentTyperConfig: any = null;

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
  appState.typerState.running = true;
  appState.typerState.paused = false;
  
  const baseDelay = config.speed || 95;
  const typoPct = config.errors || 28;
  const thinkPct = config.thinkPct || 35;
  const thinkMin = config.thinkMin || 350;
  const thinkMax = config.thinkMax || 1400;

  await sleep(500);

  let wordTyposRemaining = 0;
  
  for (let i = 0; i < text.length; i++) {
    if (!appState.typerState.running) break;
    while (appState.typerState.paused) {
      if (!appState.typerState.running) return;
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
  appState.typerState.running = false;
  appState.mainWindow?.webContents.send('human-typer-state', false);
}

export function initHumanTyper() {
  ipcMain.on('update-human-typer-text', (event, text) => {
      if (appState.appHumanTyperText !== text) {
          if (appState.typerState.running || appState.typerState.paused) {
              appState.typerState.running = false;
              appState.typerState.paused = false;
              appState.mainWindow?.webContents.send('human-typer-state', false);
              appState.mainWindow?.webContents.send('human-typer-paused', false);
          }
          appState.appHumanTyperText = text;
      }
  });

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
          if (!appState.typerState.running) {
            const text = appState.appHumanTyperText || clipboard.readText();
            if (text) {
               runHumanTyper(text, config);
               appState.mainWindow?.webContents.send('human-typer-state', true);
               appState.mainWindow?.webContents.send('human-typer-paused', false);
            }
          } else {
            appState.typerState.running = false;
            appState.typerState.paused = false;
            appState.mainWindow?.webContents.send('human-typer-state', false);
            appState.mainWindow?.webContents.send('human-typer-paused', false);
          }
        });
      } catch(e) {}
    }

    if (pauseHotkey) {
      try {
        globalShortcut.register(pauseHotkey, () => {
          if (appState.typerState.running) {
            appState.typerState.paused = !appState.typerState.paused;
            appState.mainWindow?.webContents.send('human-typer-paused', appState.typerState.paused);
          }
        });
      } catch(e) {}
    }
    
    if (stopHotkey) {
      try {
        globalShortcut.register(stopHotkey, () => {
           appState.typerState.running = false;
           appState.typerState.paused = false;
           appState.mainWindow?.webContents.send('human-typer-state', false);
           appState.mainWindow?.webContents.send('human-typer-paused', false);
        });
      } catch(e) {}
    }
  });

  ipcMain.on('start-human-typing', (event, text, config) => {
      if (appState.typerState.running && appState.typerState.paused) {
          appState.typerState.paused = false;
          appState.mainWindow?.webContents.send('human-typer-paused', false);
      } else if (!appState.typerState.running && text) {
          runHumanTyper(text, config);
          appState.mainWindow?.webContents.send('human-typer-state', true);
          appState.mainWindow?.webContents.send('human-typer-paused', false);
      }
  });

  ipcMain.on('pause-human-typing', () => {
      if (appState.typerState.running) {
          appState.typerState.paused = true;
          appState.mainWindow?.webContents.send('human-typer-paused', true);
      }
  });

  ipcMain.on('stop-human-typing', () => {
      appState.typerState.running = false;
      appState.typerState.paused = false;
      appState.mainWindow?.webContents.send('human-typer-state', false);
      appState.mainWindow?.webContents.send('human-typer-paused', false);
  });
}
