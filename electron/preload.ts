import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.send('set-always-on-top', flag),
  windowClose: () => ipcRenderer.send('window-close'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  openPaint: (filePath?: string) => ipcRenderer.send('open-paint', filePath),
  takeScreenshot: (multiMode: boolean) => ipcRenderer.send('take-screenshot', multiMode),
  setCompactMode: (isCompact: boolean, height?: number) => ipcRenderer.send('set-compact-mode', isCompact, height),
  openToolWindow: (tool: string) => ipcRenderer.send('open-tool-window', tool),
  showScreenshotMenu: (dataUrl: string, strings?: Record<string, string>) => ipcRenderer.send('show-screenshot-menu', dataUrl, strings),
  onScreenshotData: (callback: (dataUrl: string) => void) => {
    ipcRenderer.on('load-screenshot-data', (_event, data) => callback(data))
  },
  closePreviewWindow: () => ipcRenderer.send('close-preview-window'),
  selectFile: (filters: any[]) => ipcRenderer.invoke('select-file', filters),
  updateShortcuts: (shortcuts: any) => ipcRenderer.send('update-shortcuts', shortcuts),
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', title, body),
  setStartupMode: (runOnStartup: boolean) => ipcRenderer.send('set-startup-mode', runOnStartup),
  setMiniMode: (isMini: boolean) => ipcRenderer.send('set-mini-mode', isMini),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
})
