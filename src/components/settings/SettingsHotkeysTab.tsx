import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';

const SettingsHotkeysTab: React.FC = () => {
  const { shortcuts, updateSettings, globalShortcutsEnabled, language } = useSettings();
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts);

  useEffect(() => {
    setLocalShortcuts(shortcuts);
  }, [shortcuts]);

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

  const resetHotkeys = async () => {
    const defaultShortcuts = { toggleApp: '', toggleShortcuts: '', openCalc: '', openStopwatch: '', openMinitimer: '', openReminders: '', openScreenshot: '' };
    setLocalShortcuts(defaultShortcuts);
    updateSettings({ shortcuts: defaultShortcuts });
  };

  return (
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
};

export default SettingsHotkeysTab;
