import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Palette, Volume2, Keyboard, PenTool, Package, CheckCircle, DownloadCloud, Trash2, Info } from 'lucide-react';
import { t, type Lang } from '../i18n/texts';
import { useModal } from '../contexts/ModalContext';

const Settings: React.FC = () => {
  const { theme, appStyle, globalShortcutsEnabled, customAccent, volume, timerSound, shortcuts, activeTools, autoUpdate, updateSettings, pomodoroWork, pomodoroBreak, pomodoroEnabled, language, multiScreenshot, fastScreenshot } = useSettings();
  const [activeTab, setActiveTab] = useState<'interface' | 'sound' | 'hotkeys' | 'tools' | 'dlc' | 'about'>('interface');
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);
  const modal = useModal();

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.resizeWindow) {
      window.electronAPI.resizeWindow(650, 650);
    }
  }, []);

  const handleCheckUpdates = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.checkUpdates();
      if (res.status === 'dev') {
        modal.confirm({ message: t(language as Lang, 'upToDateApp'), hideCancel: true });
      } else if (res.status === 'available') {
        modal.confirm({ message: `Update available: ${res.version}. Downloading in background...`, hideCancel: true });
      } else if (res.status === 'latest') {
        modal.confirm({ message: t(language as Lang, 'upToDateApp'), hideCancel: true });
      } else {
        modal.confirm({ message: 'Error checking for updates.', hideCancel: true });
      }
    } else {
       modal.confirm({ message: t(language as Lang, 'upToDateApp'), hideCancel: true });
    }
  };

  const resetAllSettings = async () => {
    if (await modal.confirm(t(language as Lang, 'confirmResetSettings'))) {
      const defaultState = {
        theme: 'dark' as const,
        appStyle: 'glassmorphism' as const,
        customAccent: null,
        customBg: null,
        runAtStartup: false,
        volume: 50,
        timerSound: 'bell',
        shortcuts: { 
          toggleApp: 'CommandOrControl+Shift+F', 
          toggleShortcuts: 'CommandOrControl+Shift+S',
          openCalc: 'CommandOrControl+Space', 
          openStopwatch: 'CommandOrControl+Shift+T',
          openMinitimer: 'CommandOrControl+Shift+M',
          openReminders: 'CommandOrControl+Shift+R',
          openScreenshot: ''
        },
        globalShortcutsEnabled: true,
        pomodoroWork: 25,
        pomodoroBreak: 5,
        dndMode: false,
        activeTools: { 
          stopwatch: true, minitimer: true, reminders: true, calc: true, tasks: true, notes: true, screenshot: true, paint: true, store: false, 
          periodicTable: activeTools.periodicTable, 
          desmos: activeTools.desmos, 
          formulas: activeTools.formulas,
          integrals: activeTools.integrals,
          converter: activeTools.converter,
          worldClock: activeTools.worldClock,
          devTools: activeTools.devTools
        }
      };
      updateSettings(defaultState);
      setLocalShortcuts(defaultState.shortcuts);
    }
  };

  const resetHotkeys = async () => {
    if (await modal.confirm(t(language as Lang, 'confirmResetShortcuts'))) {
      const defaultShortcuts = { toggleApp: '', toggleShortcuts: '', openCalc: '', openStopwatch: '', openMinitimer: '', openReminders: '', openScreenshot: '' };
      setLocalShortcuts(defaultShortcuts);
      updateSettings({ shortcuts: defaultShortcuts });
    }
  };

  useEffect(() => {
    setLocalShortcuts(shortcuts);
  }, [shortcuts]);

  const handleSelectSound = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.selectFile([{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] }]);
      if (filePath) updateSettings({ timerSound: filePath });
    }
  };

  const playTestSound = () => {
    let audioSrc = '';
    if (timerSound === 'bell') {
      audioSrc = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    } else if (timerSound === 'digital') {
      audioSrc = 'https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3';
    } else {
      audioSrc = `media:///${timerSound.replace(/\\/g, '/')}`;
    }
    const audio = new Audio(audioSrc);
    audio.volume = volume / 100;
    audio.play().catch(console.error);
  };

  const handleShortcutChange = (shortcutName: keyof typeof shortcuts, e: React.KeyboardEvent) => {
    e.preventDefault();
    const keys = [];
    if (e.ctrlKey) keys.push('CommandOrControl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey && !e.ctrlKey) keys.push('CommandOrControl');
    
    // Ignore if only modifiers are pressed
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    
    const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    keys.push(pressedKey);
    
    const newShortcut = keys.join('+');
    setLocalShortcuts(prev => ({ ...prev, [shortcutName]: newShortcut }));
    updateSettings({ shortcuts: { ...shortcuts, [shortcutName]: newShortcut } });
  };

  const renderInterface = () => (
    <div className="settings-section">
      <h3 style={{marginTop: 0, marginBottom: '10px'}}>{t(language as Lang, 'themePresets')}</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button className={`action-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'dark' })}>{t(language as Lang, 'dark')}</button>
        <button className={`action-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'light' })}>{t(language as Lang, 'light')}</button>
        <button className={`action-btn ${theme === 'soft' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'soft' })}>{t(language as Lang, 'soft')}</button>
      </div>

      <h3 style={{marginBottom: '10px'}}>{t(language as Lang, 'appStyle' as any) || 'App Style'}</h3>
      <div style={{ marginBottom: '20px' }}>
        <select 
          value={appStyle} 
          onChange={(e) => updateSettings({ appStyle: e.target.value as any })}
          className="task-input"
          style={{ width: '100%', maxWidth: '250px' }}
        >
          <option value="glassmorphism">{t(language as Lang, 'glassmorphism' as any) || 'Glassmorphism'}</option>
          <option value="neumorphism">Neumorphism</option>
        </select>
      </div>

      <h3 style={{marginBottom: '10px'}}>{t(language as Lang, 'customColors')}</h3>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
        <input 
          type="color" 
          value={customAccent || '#eab308'} 
          onChange={e => updateSettings({ customAccent: e.target.value })} 
          style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} 
        />
        <label>{t(language as Lang, 'accentColor')}</label>
        {customAccent && (
          <button className="win-btn" onClick={() => updateSettings({ customAccent: null })}>
            {t(language as Lang, 'reset')}
          </button>
        )}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px', marginTop: '10px' }}>
        <input 
          type="checkbox" 
          checked={multiScreenshot} 
          onChange={(e) => updateSettings({ multiScreenshot: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'multiScreenshot')}
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
        <input 
          type="checkbox" 
          checked={fastScreenshot} 
          onChange={(e) => updateSettings({ fastScreenshot: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'fastScreenshot')}
      </label>

      <h3 style={{marginBottom: '10px'}}>{t(language as Lang, 'interfaceLanguage')}</h3>
      <div style={{ marginBottom: '20px' }}>
        <select 
          className="task-input" 
          value={useSettings().language} 
          onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'ru' })}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </select>
      </div>

      <h3 style={{marginBottom: '10px'}}>{t(language as Lang, 'systemSettings')}</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
        <input 
          type="checkbox" 
          checked={useSettings().runAtStartup} 
          onChange={(e) => updateSettings({ runAtStartup: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'runAtStartup')}
      </label>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
        <input 
          type="checkbox" 
          checked={autoUpdate} 
          onChange={(e) => updateSettings({ autoUpdate: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'autoUpdateSettings')}
      </label>

      <div style={{ marginBottom: '20px' }}>
        <button className="action-btn outline" onClick={() => window.electronAPI?.showNotification(t(language as Lang, 'testNotificationTitle'), t(language as Lang, 'testNotificationContent'))}>
          {t(language as Lang, 'testSystemNotifications')}
        </button>
      </div>
    </div>
  );

  const renderSound = () => (
    <div className="settings-section">
      <h3 style={{marginTop: 0, marginBottom: '10px'}}>{t(language as Lang, 'notificationVolume')}</h3>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={volume} 
          onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
          onMouseUp={playTestSound}
          onTouchEnd={playTestSound}
          style={{ flex: 1, accentColor: 'var(--accent)' }}
        />
        <span style={{ width: '30px', textAlign: 'right' }}>{volume}%</span>
      </div>

      <h3 style={{marginBottom: '10px'}}>{t(language as Lang, 'timerSound')}</h3>
      <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
        <select 
          className="task-input" 
          value={timerSound === 'bell' || timerSound === 'digital' ? timerSound : 'custom'} 
          onChange={(e) => {
            if (e.target.value !== 'custom') {
              updateSettings({ timerSound: e.target.value });
            } else {
              handleSelectSound();
            }
          }}
        >
          <option value="bell">{t(language as Lang, 'defaultBell')}</option>
          <option value="digital">{t(language as Lang, 'digitalTimer')}</option>
          <option value="custom">{t(language as Lang, 'customSound')}</option>
        </select>
        
        {timerSound !== 'bell' && timerSound !== 'digital' && (
          <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', wordBreak: 'break-all', marginTop: '5px' }}>
            {t(language as Lang, 'file')} {timerSound} 
            <button className="win-btn" style={{marginLeft: '10px'}} onClick={() => updateSettings({ timerSound: 'bell' })}>{t(language as Lang, 'reset')}</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHotkeys = () => (
    <div className="settings-section">
      <p style={{marginTop: 0, fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: '15px'}}>
        {t(language as Lang, 'hotkeysInstructions')} <br/>
        {t(language as Lang, 'hotkeysInstructions2')}
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <input 
          type="checkbox" 
          checked={globalShortcutsEnabled} 
          onChange={(e) => updateSettings({ globalShortcutsEnabled: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }}
        />
        <div>
          <div style={{ fontWeight: 500 }}>Enable Global Shortcuts (Game Mode)</div>
          <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Disable this when playing games to prevent shortcut conflicts. (The "Toggle App" shortcut will still work)</div>
        </div>
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', opacity: globalShortcutsEnabled ? 1 : 0.5, pointerEvents: globalShortcutsEnabled ? 'auto' : 'none' }}>
        <div className="shortcut-row">
          <label style={{ flex: 1 }}>{t(language as Lang, 'toggleAppShortcut')}</label>
          <input 
            type="text" 
            className="task-input shortcut-input" 
            value={localShortcuts.toggleApp} 
            onKeyDown={(e) => handleShortcutChange('toggleApp', e)}
            readOnly
          />
        </div>
        
        <div className="shortcut-row">
          <label style={{ flex: 1 }}>{t(language as Lang, 'openCalcShortcut')}</label>
          <input 
            type="text" 
            className="task-input shortcut-input" 
            value={localShortcuts.openCalc} 
            onKeyDown={(e) => handleShortcutChange('openCalc', e)}
            readOnly
          />
        </div>

        <div className="shortcut-row">
          <label style={{ flex: 1 }}>{t(language as Lang, 'openStopwatchShortcut')}</label>
          <input 
            type="text" 
            className="task-input shortcut-input" 
            value={localShortcuts.openStopwatch} 
            onKeyDown={(e) => handleShortcutChange('openStopwatch', e)}
            readOnly
          />
        </div>

        <div className="shortcut-row">
          <label style={{ flex: 1 }}>{t(language as Lang, 'openMinitimerShortcut')}</label>
          <input 
            type="text" 
            className="task-input shortcut-input" 
            value={localShortcuts.openMinitimer || ''} 
            onKeyDown={(e) => handleShortcutChange('openMinitimer' as any, e)}
            readOnly
          />
        </div>

        <div className="shortcut-row">
          <label style={{ flex: 1 }}>{t(language as Lang, 'openRemindersShortcut')}</label>
          <input 
            type="text" 
            className="task-input shortcut-input" 
            value={localShortcuts.openReminders || ''} 
            onKeyDown={(e) => handleShortcutChange('openReminders' as any, e)}
            readOnly
          />
        </div>

        <div className="shortcut-row">
          <label style={{ flex: 1 }}>{t(language as Lang, 'openScreenshotShortcut')}</label>
          <input 
            type="text" 
            className="task-input shortcut-input" 
            value={localShortcuts.openScreenshot || ''} 
            onKeyDown={(e) => handleShortcutChange('openScreenshot' as any, e)}
            readOnly
          />
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <button className="action-btn outline" onClick={resetHotkeys}>
            {t(language as Lang, 'clearHotkeysBtn')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderTools = () => (
    <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <p style={{marginTop: 0, fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: '5px'}}>
        {t(language as Lang, 'toolsInfo')}
      </p>
      
      {Object.entries(activeTools).map(([tool, isActive]) => {
        const labels: Record<string, string> = {
          stopwatch: t(language as Lang, 'stopwatch'),
          minitimer: t(language as Lang, 'minitimer'),
          reminders: t(language as Lang, 'reminders'),
          calc: t(language as Lang, 'calc'),
          tasks: t(language as Lang, 'tasks'),
          notes: t(language as Lang, 'notes'),
          screenshot: t(language as Lang, 'screenshot_tool'),
          paint: t(language as Lang, 'paint_tool'),
        };
        if (!labels[tool]) return null;
        return (
          <label key={tool} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isActive} 
              onChange={(e) => updateSettings({ activeTools: { ...activeTools, [tool]: e.target.checked } })}
              style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
            />
            {labels[tool]}
          </label>
        );
      })}

      <h3 style={{marginTop: '20px', marginBottom: '10px'}}>{t(language as Lang, 'pomodoroSettings')}</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '15px' }}>
        <input 
          type="checkbox" 
          checked={pomodoroEnabled} 
          onChange={(e) => updateSettings({ pomodoroEnabled: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'enablePomodoro')}
      </label>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', opacity: pomodoroEnabled ? 1 : 0.5, pointerEvents: pomodoroEnabled ? 'auto' : 'none' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '5px' }}>{t(language as Lang, 'focusMin')}</label>
          <input 
             type="number" 
             className="task-input" 
             style={{ width: '80px' }} 
             value={pomodoroWork} 
             onChange={e => updateSettings({ pomodoroWork: parseInt(e.target.value) || 1 })} 
             min="1"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '5px' }}>{t(language as Lang, 'breakMin')}</label>
          <input 
             type="number" 
             className="task-input" 
             style={{ width: '80px' }} 
             value={pomodoroBreak} 
             onChange={e => updateSettings({ pomodoroBreak: parseInt(e.target.value) || 1 })} 
             min="1"
          />
        </div>
      </div>
    </div>
  );
  const [downloading, setDownloading] = useState<string | null>(null);
  
  const dlcs = [
    {
      id: 'periodicTable',
      name: t(language as Lang, 'dlc_periodicTable_name'),
      desc: t(language as Lang, 'dlc_periodicTable_desc'),
      isInstalled: activeTools.periodicTable
    },
    {
      id: 'desmos',
      name: t(language as Lang, 'dlc_desmos_name'),
      desc: t(language as Lang, 'dlc_desmos_desc'),
      isInstalled: activeTools.desmos
    },
    {
      id: 'formulas',
      name: t(language as Lang, 'dlc_formulas_name'),
      desc: t(language as Lang, 'dlc_formulas_desc'),
      isInstalled: activeTools.formulas
    },
    {
      id: 'integrals',
      name: t(language as Lang, 'dlc_integrals_name'),
      desc: t(language as Lang, 'dlc_integrals_desc'),
      isInstalled: activeTools.integrals
    },
    {
      id: 'converter',
      name: t(language as Lang, 'dlc_converter_name'),
      desc: t(language as Lang, 'dlc_converter_desc'),
      isInstalled: activeTools.converter
    },
    {
      id: 'worldClock',
      name: t(language as Lang, 'dlc_worldClock_name' as any),
      desc: t(language as Lang, 'dlc_worldClock_desc' as any),
      isInstalled: activeTools.worldClock
    },
    {
      id: 'devTools',
      name: t(language as Lang, 'dlc_devTools_name' as any),
      desc: t(language as Lang, 'dlc_devTools_desc' as any),
      isInstalled: activeTools.devTools
    }
  ];

  const installDlc = (id: string) => {
    setDownloading(id);
    setTimeout(() => {
      updateSettings({ activeTools: { ...activeTools, [id]: true } });
      setDownloading(null);
    }, 2500);
  };

  const handleRemoveDlc = async (dlcId: keyof typeof activeTools) => {
    if (await modal.confirm(t(language as Lang, 'confirmRemoveDlc'))) {
      updateSettings({ activeTools: { ...activeTools, [dlcId]: false } });
    }
  };

  const renderDlc = () => (
    <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <p style={{marginTop: 0, fontSize: '0.9em', color: 'var(--text-secondary)'}}>{t(language as Lang, 'dlcInfo')}</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {dlcs.map(item => (
          <div key={item.id} style={{
            background: 'var(--bg-card)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={20} color="var(--accent)" />
              <div style={{ fontWeight: 'bold', fontSize: '1.05em' }}>{item.name}</div>
            </div>
            <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
              <div>
                {item.isInstalled && (
                  <span style={{ fontSize: '0.85em', color: '#4caf50', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle size={14} /> {t(language as Lang, 'installed')}
                  </span>
                )}
              </div>
              <div>
                {item.isInstalled ? (
                  <button className="action-btn outline-danger" onClick={() => handleRemoveDlc(item.id as keyof typeof activeTools)} style={{ padding: '4px 10px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Trash2 size={14} /> {t(language as Lang, 'remove')}
                  </button>
                ) : downloading === item.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ fontSize: '0.85em', color: 'var(--accent)' }}>{t(language as Lang, 'downloading')}</span>
                  </div>
                ) : (
                  <button className="action-btn active" onClick={() => installDlc(item.id)} style={{ padding: '4px 10px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <DownloadCloud size={14} /> {t(language as Lang, 'install')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <div className={`settings-tab ${activeTab === 'interface' ? 'active' : ''}`} onClick={() => setActiveTab('interface')}>
          <Palette size={18} /> {t(language as Lang, 'general')}
        </div>
        <div className={`settings-tab ${activeTab === 'sound' ? 'active' : ''}`} onClick={() => setActiveTab('sound')}>
          <Volume2 size={18} /> {t(language as Lang, 'menuSounds')}
        </div>
        <div className={`settings-tab ${activeTab === 'hotkeys' ? 'active' : ''}`} onClick={() => setActiveTab('hotkeys')}>
          <Keyboard size={18} /> {t(language as Lang, 'shortcuts')}
        </div>
        <div className={`settings-tab ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>
          <PenTool size={18} /> {t(language as Lang, 'menuTools')}
        </div>
        <div className={`settings-tab ${activeTab === 'dlc' ? 'active' : ''}`} onClick={() => setActiveTab('dlc')}>
          <Package size={18} /> {t(language as Lang, 'tools')}
        </div>
        <div className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
          <Info size={18} /> {t(language as Lang, 'tabAbout')}
        </div>
      </div>
      <div className="settings-content">
        <h2>
          {activeTab === 'interface' && t(language as Lang, 'tabInterface')}
          {activeTab === 'sound' && t(language as Lang, 'tabSound')}
          {activeTab === 'hotkeys' && t(language as Lang, 'tabHotkeys')}
          {activeTab === 'tools' && t(language as Lang, 'tabTools')}
          {activeTab === 'dlc' && t(language as Lang, 'tabDlc')}
          {activeTab === 'about' && t(language as Lang, 'tabAbout')}
        </h2>
        {activeTab === 'interface' && renderInterface()}
        {activeTab === 'sound' && renderSound()}
        {activeTab === 'hotkeys' && renderHotkeys()}
        {activeTab === 'tools' && renderTools()}
        {activeTab === 'dlc' && renderDlc()}
        
        {activeTab === 'about' && (
          <div className="settings-section">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginBottom: '5px', border: 'none', padding: 0 }}>TesseraDesk</h2>
              <div style={{ color: 'var(--text-muted)' }}>{t(language as Lang, 'currentVersion')} 1.7.2</div>
            </div>
            
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
              <p style={{ marginTop: 0, marginBottom: '10px' }}>{t(language as Lang, 'aboutDesc')}</p>
              <p style={{ marginBottom: '10px', color: 'var(--accent)' }}>{t(language as Lang, 'aboutAmateur')}</p>
              <p style={{ marginBottom: 0 }}>{t(language as Lang, 'aboutFeedback')}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button className="action-btn active" onClick={handleCheckUpdates}>{t(language as Lang, 'checkUpdates')}</button>
              <button className="action-btn outline" onClick={() => window.dispatchEvent(new Event('trigger-onboarding'))}>{t(language as Lang, 'launchTutorial')}</button>
            </div>
          </div>
        )}
        
        <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
          <button className="action-btn outline-danger" onClick={resetAllSettings}>
            {t(language as Lang, 'resetSettingsBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
