import React, { useState, useEffect, useRef } from 'react';
import { useSettings, defaultSettings } from '../contexts/SettingsContext';
import { Palette, Volume2, Keyboard, PenTool, Package, CheckCircle, DownloadCloud, Trash2, Info } from 'lucide-react';
import { t, type Lang } from '../i18n/texts';
import { useModal } from '../contexts/ModalContext';

const Settings: React.FC = () => {
  const { theme, appStyle, globalShortcutsEnabled, customAccent, volume, timerSound, shortcuts, activeTools, autoUpdate, updateSettings, pomodoroWork, pomodoroBreak, pomodoroEnabled, language, multiScreenshot, fastScreenshot, saveFastScreenshotDisk, extendedMode } = useSettings();
  const [activeTab, setActiveTab] = useState<'interface' | 'sound' | 'hotkeys' | 'tools' | 'dlc' | 'about'>('interface');
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);
  const secretClicks = useRef(0);
  const lastClickTime = useRef(0);
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const modal = useModal();

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.resizeWindow) {
      window.electronAPI.resizeWindow(650, 650);
    }
  }, []);

  const [updateMsg, setUpdateMsg] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<{percent: number, bytesPerSecond: number} | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  useEffect(() => {
    if (window.electronAPI) {
      const unsub1 = window.electronAPI.onUpdateAvailable(() => {
        setUpdateMsg(language === 'ru' ? 'Найдена новая версия. Нажмите кнопку для загрузки.' : 'New version found. Click to download.');
        setUpdateError('');
        setUpdateAvailable(true);
      });
      const unsub2 = window.electronAPI.onDownloadProgress((progress) => {
        setDownloadProgress(progress);
      });
      const unsub3 = window.electronAPI.onUpdateDownloaded(async (info: any) => {
        setUpdateMsg('Новая версия ' + info.version + ' скачана!');
        setDownloadProgress(null);
        setUpdateReady(true);
      });
      const unsub4 = window.electronAPI.onUpdateError((errorStr) => {
        setUpdateError(errorStr);
        setUpdateMsg('');
        setDownloadProgress(null);
      });
      return () => {
        unsub1();
        unsub2();
        unsub3();
        unsub4();
      };
    }
  }, []);

  const handleCheckUpdates = async () => {
    if (window.electronAPI) {
      setUpdateError('');
      setUpdateMsg(language === 'ru' ? 'Проверка обновлений...' : 'Checking for updates...');
      const res = await window.electronAPI.checkUpdates();
      if (res.status === 'dev') {
        setUpdateMsg(t(language as Lang, 'upToDateApp'));
      } else if (res.status === 'available') {
        setUpdateMsg(language === 'ru' ? `Найдена версия ${res.version}. Нажмите кнопку для загрузки.` : `Version ${res.version} available. Click to download.`);
        setUpdateAvailable(true);
      } else if (res.status === 'latest') {
        setUpdateMsg(t(language as Lang, 'upToDateApp'));
      } else {
        setUpdateError(language === 'ru' ? 'Не удалось проверить обновления. Сервер недоступен или нет сети.' : 'Failed to check for updates. Server unreachable or no network.');
        setUpdateMsg('');
      }
    } else {
       setUpdateMsg(t(language as Lang, 'upToDateApp'));
    }
  };

  const resetAllSettings = async () => {
    if (await modal.confirm(t(language as Lang, 'confirmResetSettings'))) {
      const { language: _lang, superHumanizerLanguage: _shLang, ...defaultsWithoutLang } = defaultSettings;
      updateSettings(defaultsWithoutLang);
      setLocalShortcuts(defaultSettings.shortcuts);
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
          <option value="flat-design">Flat Design</option>
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
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
        <input 
          type="checkbox" 
          checked={autoUpdate} 
          onChange={(e) => updateSettings({ autoUpdate: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'autoUpdateSettings')}
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
        <input 
          type="checkbox" 
          checked={useSettings().oledProtection} 
          onChange={(e) => updateSettings({ oledProtection: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        <div>
          <div>{language === 'ru' ? 'Защита OLED (Сдвиг пикселей)' : 'OLED Protection (Pixel Shift)'}</div>
          <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{language === 'ru' ? 'Незаметно сдвигает интерфейс для предотвращения выгорания экрана' : 'Subtly shifts the interface to prevent screen burn-in'}</div>
        </div>
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
        <button className="action-btn" onClick={playTestSound} style={{ padding: '5px 10px', fontSize: '0.85em' }}>
          {t(language as Lang, 'testSound') || 'Проверить звук'}
        </button>
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

      {secretModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)',
            width: '300px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{margin: 0}}>{language === 'ru' ? 'Секретный режим' : 'Secret Mode'}</h3>
            <p style={{margin: 0, fontSize: '0.9em', color: 'var(--text-muted)'}}>
              {language === 'ru' ? 'Введите код доступа:' : 'Enter access code:'}
            </p>
            <input 
              type="password" 
              placeholder="Code" 
              value={secretCode}
              onChange={e => setSecretCode(e.target.value.toUpperCase())}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button className="action-btn" onClick={() => setSecretModalOpen(false)}>{t(language as Lang, 'cancel')}</button>
              <button className="action-btn primary" onClick={() => {
                if (secretCode === 'CREATE19') {
                  updateSettings({ extendedMode: true });
                  setSecretModalOpen(false);
                  setSecretCode('');
                } else {
                  setSecretModalOpen(false);
                  setSecretCode('');
                }
              }}>OK</button>
            </div>
          </div>
        </div>
      )}
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
      <h3 style={{marginTop: '20px', marginBottom: '10px'}}>{t(language as Lang, 'screenshots') || 'Настройки скриншотов'}</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}>
        <input 
          type="checkbox" 
          checked={multiScreenshot} 
          onChange={(e) => updateSettings({ multiScreenshot: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'multiScreenshot')}
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '15px' }}>
        <input 
          type="checkbox" 
          checked={fastScreenshot} 
          onChange={(e) => updateSettings({ fastScreenshot: e.target.checked })}
          style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
        />
        {t(language as Lang, 'fastScreenshot')}
      </label>

      <div className="setting-item" style={{ marginBottom: '15px' }}>
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{t(language as Lang, 'saveFastScreenshotDisk') || 'Сохранять быстрые скриншоты на диск'}</div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>
            {t(language as Lang, 'saveFastScreenshotDiskDesc') || 'Автоматически сохранять полноэкранные скриншоты в папку Загрузки'}
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={saveFastScreenshotDisk} onChange={(e) => updateSettings({ saveFastScreenshotDisk: e.target.checked })} />
          <span className="slider round"></span>
        </label>
      </div>

      {saveFastScreenshotDisk && (
        <div className="setting-item" style={{ marginBottom: '15px', paddingLeft: '15px', borderLeft: '2px solid var(--accent)' }}>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{language === 'ru' ? 'Папка для сохранения' : 'Save folder'}</div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 4 }}>
              {useSettings().customScreenshotFolder || (language === 'ru' ? 'По умолчанию (Загрузки/TesseraDesk)' : 'Default (Downloads/TesseraDesk)')}
            </div>
          </div>
          <button className="action-btn outline" onClick={async () => {
            const folder = await window.electronAPI?.selectFolder();
            if (folder) updateSettings({ customScreenshotFolder: folder });
          }}>
            {language === 'ru' ? 'Выбрать' : 'Select'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '5px' }}>Задержка (Таймер)</label>
          <select 
             className="task-input" 
             style={{ width: '120px' }} 
             value={useSettings().screenshotDelay || 0} 
             onChange={e => updateSettings({ screenshotDelay: parseInt(e.target.value) || 0 })} 
          >
            <option value={0}>Без задержки</option>
            <option value={1}>1 секунда</option>
            <option value={2}>2 секунды</option>
            <option value={3}>3 секунды</option>
            <option value={4}>4 секунды</option>
            <option value={5}>5 секунд</option>
            <option value={10}>10 секунд</option>
          </select>
        </div>
      </div>
    </div>
  );
  const [downloading, setDownloading] = useState<string[]>([]);
  
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
    },
    {
      id: 'autoclicker',
      name: t(language as Lang, 'dlc_autoclicker_name' as any) || 'AutoClicker',
      desc: t(language as Lang, 'dlc_autoclicker_desc' as any),
      isInstalled: activeTools.autoclicker
    },
    {
      id: 'humanTyper',
      name: 'Human Typer',
      desc: 'Имитация реального человека при наборе текста (с опечатками и паузами). Идеально для обхода анти-спам систем и бот-фильтров.',
      isInstalled: activeTools.humanTyper
    },
    {
      id: 'superHumanizer',
      name: 'Super Humanizer',
      desc: 'Мощный ИИ-переводчик машинного текста в "человеческий". Делает текст невидимым для AI-детекторов.',
      isInstalled: activeTools.superHumanizer
    },
    {
      id: 'creatorStudio',
      name: 'TesseraDesk Creator Studio',
      desc: 'Менеджер DLC и режим разработчика. Позволяет загружать сторонние архивы плагинов (.zip) и управлять ими.',
      isInstalled: activeTools.creatorStudio
    }
  ];

  if (extendedMode) {
    dlcs.push({
      id: 'numismatics',
      name: t(language as Lang, 'dlc_numismatics_name' as any),
      desc: t(language as Lang, 'dlc_numismatics_desc' as any),
      isInstalled: activeTools.numismatics
    });
  }

  const installDlc = (id: string) => {
    setDownloading(prev => [...prev, id]);
    setTimeout(() => {
      // Get latest settings directly from localStorage to prevent race conditions
      const stored = localStorage.getItem('tesseradesk-settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const currentTools = parsed.activeTools || {};
          updateSettings({ activeTools: { ...currentTools, [id]: true } });
        } catch(e) {}
      } else {
        updateSettings({ activeTools: { ...activeTools, [id]: true } });
      }
      setDownloading(prev => prev.filter(item => item !== id));
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
                ) : downloading.includes(item.id) ? (
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
              <h2 
                style={{ marginBottom: '5px', border: 'none', padding: 0, cursor: 'pointer', userSelect: 'none' }}
                onClick={(e) => {
                  if (extendedMode) return;
                  const now = Date.now();
                  if (now - lastClickTime.current > 1000) {
                    secretClicks.current = 1;
                  } else {
                    secretClicks.current += 1;
                  }
                  lastClickTime.current = now;

                  if (secretClicks.current >= 7) {
                    setSecretModalOpen(true);
                    secretClicks.current = 0;
                  }
                  
                  // Small visual feedback
                  const target = e.currentTarget;
                  target.style.color = 'var(--accent)';
                  setTimeout(() => target.style.color = '', 100);
                }}
              >
                TesseraDesk
              </h2>
              <div style={{ color: 'var(--text-muted)' }}>{t(language as Lang, 'currentVersion')} 1.8.6</div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="action-btn outline" 
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1em' }}
                onClick={() => setShowAboutModal(true)}
              >
                📝 {language === 'ru' ? 'О нас' : 'About Us'}
              </button>
              
              <button 
                className="action-btn outline" 
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1em' }}
                onClick={() => setShowBugModal(true)}
              >
                🐛 {language === 'ru' ? 'Сообщить об ошибке' : 'Report a Bug'}
              </button>
              
              <button 
                className="action-btn active" 
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1em', background: 'linear-gradient(45deg, #ff6b6b, #ff8e53)', border: 'none', color: '#fff' }}
                onClick={() => {
                  modal.confirm({ message: '🍵 Спасибо что нажали на эту кнопку но функционала у нее пока что нет сорри. ₍^. .^₎Ⳋ', hideCancel: true });
                }}
              >
                ☕ {language === 'ru' ? 'Поддержать автора' : 'Donate'}
              </button>
            </div>
            

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: '100%' }}>
              <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                {updateMsg && <div style={{ color: 'var(--accent)', fontSize: '0.95em', marginBottom: 10, fontWeight: 'bold' }}>{updateMsg}</div>}
                {updateError && (
                  <div style={{ color: '#ffaaaa', background: 'rgba(255, 50, 50, 0.1)', border: '1px solid #ff4444', padding: '12px', borderRadius: '8px', fontSize: '0.9em', marginBottom: '10px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.2em' }}>⚠️</span> 
                      {language === 'ru' ? 'Ошибка загрузки обновления' : 'Update Error'}
                    </div>
                    <div style={{ wordBreak: 'break-word', opacity: 0.9, maxHeight: '80px', overflowY: 'auto', marginBottom: '8px', fontSize: '0.85em', fontFamily: 'monospace' }}>
                      {updateError}
                    </div>
                    <div style={{ fontSize: '0.85em', opacity: 0.9 }}>
                      {language === 'ru' ? 'Пожалуйста, скачайте новую версию вручную с GitHub.' : 'Please download the new version manually from GitHub.'}
                    </div>
                    <button 
                      className="btn outline" 
                      style={{ marginTop: '10px', width: '100%', borderColor: '#ff4444', color: '#ffaaaa' }}
                      onClick={() => window.electronAPI?.openExternal('https://github.com/Introx19/TesseraDesk/releases/latest')}
                    >
                      {language === 'ru' ? 'Скачать с GitHub' : 'Download from GitHub'}
                    </button>
                  </div>
                )}
                {downloadProgress && !updateError && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '100%', 
                      background: 'rgba(0,0,0,0.3)', 
                      border: '2px solid var(--accent)', 
                      height: 24, 
                      borderRadius: 4, 
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ 
                        width: `${downloadProgress.percent}%`, 
                        background: 'var(--accent)', 
                        height: '100%',
                        transition: 'width 0.2s ease',
                        backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)',
                        backgroundSize: '1rem 1rem',
                        animation: 'progress-stripes 1s linear infinite'
                      }}></div>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '0.85em',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                      }}>
                        {Math.round(downloadProgress.percent)}%
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 8, fontFamily: 'monospace' }}>
                      {(downloadProgress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                {updateReady ? (
                  <button className="action-btn active" onClick={() => window.electronAPI?.installUpdate()}>Перезапустить и установить</button>
                ) : updateAvailable && !downloadProgress ? (
                  <button className="action-btn active" onClick={() => { window.electronAPI?.downloadUpdate(); setUpdateMsg(language === 'ru' ? 'Загрузка...' : 'Downloading...'); setUpdateAvailable(false); }}>{language === 'ru' ? 'Скачать обновление' : 'Download Update'}</button>
                ) : (
                  <button className="action-btn active" onClick={handleCheckUpdates}>{t(language as Lang, 'checkUpdates')}</button>
                )}
                <button className="action-btn outline" onClick={() => window.dispatchEvent(new Event('trigger-onboarding'))}>{t(language as Lang, 'launchTutorial')}</button>
              </div>
            </div>
            
          </div>
        )}
        
        <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
          <button className="action-btn outline-danger" onClick={resetAllSettings}>
            {t(language as Lang, 'resetSettingsBtn')}
          </button>
        </div>
      </div>

      {secretModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)',
            width: '300px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{margin: 0}}>{language === 'ru' ? 'Секретный режим' : 'Secret Mode'}</h3>
            <p style={{margin: 0, fontSize: '0.9em', color: 'var(--text-muted)'}}>
              {language === 'ru' ? 'Введите код доступа:' : 'Enter access code:'}
            </p>
            <input 
              type="password" 
              placeholder="Code" 
              value={secretCode}
              onChange={e => setSecretCode(e.target.value.toUpperCase())}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button className="action-btn" onClick={() => setSecretModalOpen(false)}>{t(language as Lang, 'cancel')}</button>
              <button className="action-btn primary" onClick={() => {
                if (secretCode === 'CREATE19') {
                  updateSettings({ extendedMode: true });
                  setSecretModalOpen(false);
                  setSecretCode('');
                  
                  modal.confirm({
                    title: language === 'ru' ? 'Секретный режим Активирован' : 'Secret Mode Activated',
                    message: language === 'ru' 
                      ? 'Вы успешно вошли в секретный режим!\nВам открыты следующие функции:\n• Конвертер валют Create Numismatics' 
                      : 'You have successfully entered the secret mode!\nThe following features are available to you:\n• Create Numismatics Converter',
                    hideCancel: true,
                    okText: 'OK'
                  });
                } else {
                  setSecretModalOpen(false);
                  setSecretCode('');
                }
              }}>OK</button>
            </div>
          </div>
        </div>
      )}
      {showAboutModal && (
        <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>О нас / About Us</h3>
            <p style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
              シ Всем привет, я Introx19 очень вам всем благодарен и за тестировку и за использование этого проекта! ˃⩊˂
            </p>
            <p>{t(language as Lang, 'aboutDesc')}</p>
            <p>{t(language as Lang, 'aboutAmateur')}</p>
            
            <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>🏆 Зал славы тестировщиков</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-muted)' }}>
              <li>Introx - Creator & Lead Tester</li>
              <li>Antigravity - AI Assistant</li>
              <li>Saharo4ek</li>
              <li>Foxtrot</li>
              <li>Seerbee4</li>
            </ul>
            
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn outline" onClick={() => setShowAboutModal(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {showBugModal && (
        <div className="modal-overlay" onClick={() => setShowBugModal(false)}>
          <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🐛 Сообщить об ошибке
            </h3>
            


            <textarea 
              value={bugDescription}
              onChange={e => setBugDescription(e.target.value)}
              placeholder="Опишите баг... (Как его повторить? Что случилось?)"
              style={{ width: '100%', minHeight: '120px', resize: 'vertical', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px', borderRadius: '8px', color: 'var(--text-color)', marginBottom: '15px' }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn outline" onClick={() => setShowBugModal(false)}>Отмена</button>
              <button 
                className="btn primary" 
                disabled={!bugDescription.trim()}
                onClick={() => {
                  // PROXY URL: Замените 'tesseradesk-backend' на название вашего проекта в Vercel, если оно будет другим
                  const PROXY_URL = "https://tesseradesk-backend.vercel.app/api/bug-report";
                  fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      content: `**🐛 Новый баг-репорт от TesseraDesk!**\n> ${bugDescription}`
                    })
                  }).then(() => {
                    setBugDescription('');
                    setShowBugModal(false);
                    modal.confirm({ message: 'Баг-репорт успешно отправлен в Discord!', hideCancel: true });
                  }).catch(e => {
                    modal.confirm({ message: 'Ошибка при отправке: ' + e.message, hideCancel: true });
                  });
                }}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
