# TesseraDesk / Flowdesk - Project Guidelines & Knowledge Base

This file contains the core architecture rules, known bugs, and constraints for the TesseraDesk project.
**EVERY AGENT MUST READ THIS BEFORE MODIFYING CODE TO AVOID BREAKING EXISTING FUNCTIONALITY.**

## 1. Tech Stack
- **Frontend**: React 19, TypeScript, Vite, CSS (No Tailwind, use custom CSS).
- **Backend**: Electron (main.ts, preload.mjs).
- **Packaging**: electron-builder (`npm run build:exe`).
- **Auto-Update**: `electron-updater` (using GitHub Releases).

## 2. Core Architecture Rules
- **IPC Communication**: NEVER call Node.js functions directly in React. Always use `window.electronAPI`. If you need a new method, you MUST add it to three places:
  1. `electron/preload.ts` (contextBridge)
  2. `electron/main.ts` (ipcMain.on/handle)
  3. `src/types/global.d.ts` (ElectronAPI interface)
- **Settings & State**: Global app state and shortcuts are managed in `src/contexts/SettingsContext.tsx`. Do not bypass it.
- **Styling**: Stick to the custom `data-style` and `data-theme` CSS variables in `index.css`. DO NOT introduce inline styles for colors unless dynamically calculated. Use `.icon-btn`, `.btn-primary`, `.btn-secondary`.

## 3. Critical Mechanical Gotchas (DO NOT BREAK THESE)

### A. The EyeDropper API (Color Picker)
- **Constraint**: `EyeDropper` API requires a user gesture and CANNOT work if the window is hidden, out of focus, or if it takes too long to resize the window asynchronously.
- **Rule**: If you need to "hide" the window to take a screenshot or use the color picker, DO NOT use `ipcMain` to call `win.hide()`. It breaks the EyeDropper context.
- **Workaround**: Instead, set `document.body.style.opacity = '0'` and `document.body.style.pointerEvents = 'none'` in React.
- **Resizing**: Before opening the EyeDropper, the window must be expanded to full screen so the picker can select anywhere on the screen. Use synchronous IPC: `window.electronAPI.expandForPicker()` (using `ipcRenderer.sendSync`) so the JavaScript execution thread blocks and preserves the user gesture context.

### B. Auto-Updater & GitHub Releases
- **Constraint**: `electron-updater` relies on `latest.yml` and `.blockmap` files.
- **Rule**: When creating a release via GitHub API, GitHub replaces `%20` (spaces) with dots (`.`) in filenames (e.g. `TesseraDesk.Setup.1.7.0.exe`). However, `latest.yml` uses hyphens (`TesseraDesk-Setup-1.7.0.exe`). This causes a 404 error during auto-update.
- **Workaround**: Always manually name the uploaded file with hyphens (`?name=TesseraDesk-Setup-1.7.1.exe`) during curl API uploads.

### C. Windows Taskbar Icon
- **Constraint**: If `win.icon` in `package.json` points to a `.png` file, `electron-builder` might fail to convert it to `.ico` on environments without ImageMagick, resulting in the default Electron icon appearing in the Windows Taskbar and Notifications.
- **Rule**: Always explicitly set `"icon": "build/icon.ico"` in `package.json` under the `"win"` section, and ensure `icon.ico` is committed to the repository.

### D. Global Shortcuts
- **Constraint**: Global shortcuts block those keys across the entire OS.
- **Rule**: Only register shortcuts that the user explicitly activated in Settings. Re-register them when `SettingsContext` updates via `window.electronAPI.updateShortcuts()`. Always unregister them when disabling shortcuts.

## 4. How to add new DLC / Features
1. Create a `.tsx` file in `src/components/dlc/`.
2. Add the toggle state to `SettingsState` in `SettingsContext.tsx`.
3. Add translations in `src/i18n/texts.ts`.
4. Register the UI in `App.tsx` conditionally rendering based on `settings[featureName]`.
