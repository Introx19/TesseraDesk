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

### B. Auto-Updater & GitHub Releases (СТРОГОЕ ПРАВИЛО - НИКАКИХ ПРОБЕЛОВ И ТОЧЕК)
- **Constraint**: Для `electron-updater` **категорически нельзя** использовать файлы с пробелами в названии при загрузке релизов на GitHub.
- **Rule**: GitHub заменяет пробелы на точки (`TesseraDesk.Setup.1.8.0.exe`), а `electron-builder` в файле `latest.yml` прописывает дефисы (`TesseraDesk-Setup-1.8.0.exe`). Из-за этого несовпадения ломается система автообновления (404 ошибка).
- **Workaround**: ВСЕГДА проверяй, что загружаемый `.exe` файл и его `.blockmap` имеют название с дефисами (например, `TesseraDesk-Setup-1.8.0.exe`, `TesseraDesk-Setup-1.8.0.exe.blockmap`) во время загрузки на GitHub (параметр `?name=...` в API). Имя файла должно ТОЧНО соответствовать полю `path`/`url` в манифесте `latest.yml`.

### C. Windows Taskbar Icon & electron-builder
- **Constraint**: Если мы меняем иконку приложения (`icon.png`), нужно убедиться, что `electron-builder` перегенерировал `.ico` файл.
- **Rule**: Свежий `.ico` файл всегда автоматически генерируется и ложится в скрытую папку `release/.icon-ico/`.
- **Workaround**: Его нужно вручную скопировать в папку `build/icon.ico` перед финальной сборкой, чтобы у собранного `.exe` файла и в таскбаре Windows была правильная новая иконка. (И `"icon": "build/icon.ico"` в `package.json`).

### D. Списки во Flexbox (UI/CSS)
- **Constraint**: Когда создаешь списки внутри flex-контейнера с прокруткой (`overflow-y: auto`), они могут сплющиваться.
- **Rule**: Обязательно задавай родительскому контейнеру `flex: 1` и `min-height: 0`, а самим дочерним элементам списка — `flex-shrink: 0`. Иначе при добавлении новых элементов они будут ломаться по высоте вместо появления скролла.

### D. Global Shortcuts
- **Constraint**: Global shortcuts block those keys across the entire OS.
- **Rule**: Only register shortcuts that the user explicitly activated in Settings. Re-register them when `SettingsContext` updates via `window.electronAPI.updateShortcuts()`. Always unregister them when disabling shortcuts.

### E. Бэкенд и main.ts (Распределение логики)
- **Constraint**: Файл `main.ts` не должен превращаться в свалку кода.
- **Rule**: НИКОГДА не напихивай все новые фичи и IPC обработчики напрямую в `main.ts`! Вся логика должна быть вынесена в отдельные сервисы в `electron/modules/` (например, `windowManager.ts`, `pluginManager.ts`, `screenshotManager.ts`). `main.ts` должен оставаться тонким слоем оркестрации (app.whenReady и импорт модулей).

## 4. How to add new DLC / Features
1. Create a `.tsx` file in `src/components/dlc/`.
2. Add the toggle state to `SettingsState` in `SettingsContext.tsx`.
3. Add translations in `src/i18n/texts.ts`.
4. Register the UI in `App.tsx` conditionally rendering based on `settings[featureName]`.

- Обязательно для каждой новой функции надо сразу делать английскую локализацию и совместимость со всеми темами.
