export interface ElectronAPI {
  setAlwaysOnTop: (flag: boolean) => void;
  windowClose: () => void;
  windowMinimize: () => void;
  ensureMinimumSize: (w: number, h: number) => void;
  windowMaximize: () => void;
  windowToggleMaximize?: () => void;
  openPaint: (filePath?: string) => void;
  openPaintWithImage: (dataUrl: string) => void;
  requestScreenshotData?: () => void;
  requestNotificationData?: () => void;
  takeScreenshot: (multiMode: boolean, fastMode?: boolean, delay?: number, saveToDisk?: boolean, customFolder?: string | null) => void;
  setCompactMode: (isCompact: boolean) => void;
  openToolWindow: (tool: string) => void;
  showScreenshotMenu: (dataUrl: string, strings?: Record<string, string>) => void;
  sendCroppedScreenshot: (dataUrl: string, multiMode: boolean) => void;
  onScreenshotData: (callback: (dataUrl: string) => void) => void;
  onAddScreenshotLayer: (callback: (dataUrl: string) => void) => void;
  closePreviewWindow: () => void;
  selectFile: (filters: any[]) => Promise<string | null>;
  getPlugins: () => Promise<any[]>;
  installPlugin: (zipPath: string) => Promise<{success: boolean; error?: string}>;
  uninstallPlugin: (folderName: string) => Promise<{success: boolean; error?: string}>;
  readPluginFile: (pluginId: string, filePath: string) => Promise<string | null>;
  selectFolder: () => Promise<string | null>;
  updateShortcuts: (shortcuts: any, multiScreenshot: boolean, fastScreenshot?: boolean, screenshotDelay?: number) => void;
  showNotification: (title: string, body: string, image?: string) => void;
  onNotificationData: (callback: (data: any) => void) => void;
  onFastScreenshotDone: (callback: (dataUrl: string) => void) => void;
  setStartupMode: (runOnStartup: boolean) => void;
  setMiniMode: (isMini: boolean) => void;
  checkUpdates: () => Promise<{ status: 'dev' | 'available' | 'latest' | 'error', version?: string }>;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onDownloadProgress: (callback: (progress: any) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;
  onUpdateError: (callback: (error: string) => void) => () => void;
  openExternal: (url: string) => void;
  downloadUpdate: () => void;
  installUpdate: () => void;
  onToggleGlobalShortcuts?: (callback: () => void) => void;
  resizeWindow: (width: number, height: number) => void;
  killPort: (port: number) => Promise<any>;
  windowHide: () => void;
  windowMinimize: () => void;
  windowShow: () => void;
  expandForPicker: () => void;
  restoreFromPicker: () => void;
  setAutoclickerConfig: (hotkey: string, interval: number, intervalUnit: 'ms'|'s'|'m', button: 'left' | 'right' | 'middle', randomizeMs: number, clickDelay: number) => void;
  onAutoclickerStateChanged: (callback: (isActive: boolean) => void) => void;
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
  setHumanTyperConfig: (startHotkey: string, pauseHotkey: string, stopHotkey: string, config: any) => void;
  startHumanTyping: (text: string, config: any) => void;
  stopHumanTyping: () => void;
  pauseHumanTyping: () => void;
  resumeHumanTyping: () => void;
  onHumanTyperState: (callback: (isActive: boolean) => void) => void;
  onHumanTyperPaused: (callback: (isPaused: boolean) => void) => void;
  updateAiKey: (key: string) => void;
  analyzeText: (data: any) => Promise<any>;
  humanizeText: (data: any) => Promise<any>;
  sendWebhook: (url: string, filePath: string, message?: string) => Promise<{ success: boolean; status?: number; text?: string; error?: string }>;
  verifyPluginZip: (zipPath: string) => Promise<{valid: boolean, error?: string}>;
  updateHumanTyperText: (text: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
