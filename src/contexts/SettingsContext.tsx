import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light' | 'soft';
export type AppStyle = 'glassmorphism' | 'neo-brutalism' | 'minimalist-monochrome' | 'material-design' | 'flat-design' | 'neumorphism' | 'cyberpunk';

export interface SettingsState {
  theme: Theme;
  appStyle: AppStyle;
  language: 'ru' | 'en';
  customAccent: string | null;
  runAtStartup: boolean;
  volume: number;
  timerSound: string;
  bgOpacity: number;
  pomodoroEnabled: boolean;
  pomodoroWork: number;
  pomodoroBreak: number;
  dndMode: boolean;
  autoUpdate: boolean;
  multiScreenshot: boolean;
  globalShortcutsEnabled: boolean;
  shortcuts: {
    toggleApp: string;
    toggleShortcuts: string;
    openCalc: string;
    openStopwatch: string;
    openMinitimer: string;
    openReminders: string;
    openScreenshot: string;
  };
  activeTools: {
    stopwatch: boolean;
    minitimer: boolean;
    reminders: boolean;
    calc: boolean;
    tasks: boolean;
    notes: boolean;
    screenshot: boolean;
    paint: boolean;
    store: boolean;
    periodicTable: boolean;
    desmos: boolean;
    formulas: boolean;
    integrals: boolean;
    converter: boolean;
    worldClock: boolean;
  };
}

const defaultSettings: SettingsState = {
  theme: 'dark',
  appStyle: 'glassmorphism',
  language: 'ru',
  customAccent: null,
  runAtStartup: false,
  volume: 50,
  timerSound: 'bell',
  bgOpacity: 0.4,
  pomodoroEnabled: true,
  pomodoroWork: 25,
  pomodoroBreak: 5,
  dndMode: false,
  autoUpdate: true,
  multiScreenshot: false,
  globalShortcutsEnabled: true,
  shortcuts: {
    toggleApp: '',
    toggleShortcuts: '',
    openCalc: '',
    openStopwatch: '',
    openMinitimer: '',
    openReminders: '',
    openScreenshot: '',
  },
  activeTools: {
    stopwatch: true,
    minitimer: true,
    reminders: true,
    calc: true,
    tasks: true,
    notes: true,
    screenshot: true,
    paint: true,
    store: true,
    periodicTable: false,
    desmos: false,
    formulas: false,
    integrals: false,
    converter: false,
    worldClock: false,
  }
};

interface SettingsContextType extends SettingsState {
  updateSettings: (newSettings: Partial<SettingsState>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('tesseradesk-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          shortcuts: { ...defaultSettings.shortcuts, ...(parsed.shortcuts || {}) },
          activeTools: { ...defaultSettings.activeTools, ...(parsed.activeTools || {}) }
        };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('tesseradesk-settings', JSON.stringify(settings));
    
    if (window.electronAPI) {
      if (settings.globalShortcutsEnabled) {
        window.electronAPI.updateShortcuts(settings.shortcuts);
      } else {
        // Unregister all tool shortcuts, except the master toggles
        window.electronAPI.updateShortcuts({
          toggleApp: settings.shortcuts.toggleApp,
          toggleShortcuts: settings.shortcuts.toggleShortcuts,
          openCalc: '',
          openStopwatch: '',
          openMinitimer: '',
          openReminders: '',
          openScreenshot: ''
        });
      }
      window.electronAPI.setStartupMode(settings.runAtStartup);
    }
    
    // Apply theme and style
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-style', settings.appStyle);
    
    if (settings.customAccent) {
      root.style.setProperty('--accent', settings.customAccent);
      // Generate a slightly transparent version for glow
      root.style.setProperty('--accent-glow', settings.customAccent + '80');
    } else {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-glow');
    }
    // Set opacity
    root.style.setProperty('--bg-opacity', settings.bgOpacity.toString());
  }, [settings]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onToggleGlobalShortcuts?.(() => {
        setSettings(prev => ({ ...prev, globalShortcutsEnabled: !prev.globalShortcutsEnabled }));
      });
    }
  }, []);

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
