import { BrowserWindow } from 'electron';

export const appState = {
  mainWindow: null as BrowserWindow | null,
  toolWindows: {} as Record<string, BrowserWindow | null>,
  previewWindows: [] as BrowserWindow[],
  selectWindow: null as BrowserWindow | null,
  isAppCompact: false,
  compactHeight: 380,
  savedWindowSize: [480, 650] as [number, number],
  currentSaveToDisk: true,
  currentCustomFolder: null as string | null,
  currentFastMode: false,
  pendingEditorImage: null as string | null,
  typerState: { running: false, paused: false },
  appHumanTyperText: '',
  notificationWins: [] as BrowserWindow[],
  notifDataMap: new Map<number, { title: string, body: string, image?: string }>(),
};
