import InfoButton from '../InfoButton';
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Keyboard, Type, Settings, Play, Square, AlertCircle, Pause } from 'lucide-react';
import { t } from '../../i18n/texts';

const HumanTyper: React.FC = () => {
  const { language, updateSettings, humanTyperSpeed, humanTyperErrors, humanTyperThinkPct, humanTyperStartHotkey, humanTyperStopHotkey, humanTyperPauseHotkey, humanTyperEnterMode } = useSettings();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localText, setLocalText] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.onHumanTyperState) {
        window.electronAPI.onHumanTyperState((state: boolean) => {
          setIsActive(state);
          if (!state) setIsPaused(false);
        });
      }
      if (window.electronAPI.onHumanTyperPaused) {
        window.electronAPI.onHumanTyperPaused((pausedState: boolean) => {
          setIsPaused(pausedState);
        });
      }
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.updateHumanTyperText) {
      window.electronAPI.updateHumanTyperText(localText);
    }
  }, [localText]);

  const handleStart = () => {
    if (window.electronAPI) {
      window.electronAPI.startHumanTyping(localText, {
        speed: humanTyperSpeed,
        errors: humanTyperErrors,
        thinkPct: humanTyperThinkPct,
        thinkMin: 350,
        thinkMax: 1400
      });
    }
  };

  const handleStop = () => {
    if (window.electronAPI) {
      window.electronAPI.stopHumanTyping();
    }
  };

  return (
    <div className="tool-window autoclicker-window">
      <div className="tool-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Keyboard size={20} className="tool-icon" />
          <h2>{t(language, 'htTitle')}</h2>
          <InfoButton text={t(language, 'htDesc')} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title={t(language, 'htSettings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="tool-content" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {showSettings ? (
          <div className="settings-section" style={{ marginTop: 0 }}>
            <h3>{t(language, 'htSettings')}</h3>
            
            <div className="setting-item">
              <div className="setting-info">
                <span>{t(language, 'htBaseDelay')}</span>
                <span className="setting-desc">{t(language, 'htBaseDelayDesc')}</span>
              </div>
              <input 
                type="number" 
                value={humanTyperSpeed} 
                onChange={(e) => updateSettings({ humanTyperSpeed: Number(e.target.value) })}
                style={{ width: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-color)', outline: 'none' }}
                min={10} max={500}
              />
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <span>{t(language, 'htTypoChance')}</span>
                <span className="setting-desc">{t(language, 'htTypoChanceDesc')}</span>
              </div>
              <input 
                type="number" 
                value={humanTyperErrors} 
                onChange={(e) => updateSettings({ humanTyperErrors: Number(e.target.value) })}
                style={{ width: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-color)', outline: 'none' }}
                min={0} max={100}
              />
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>{t(language, 'htThinkChance')}</span>
                <span className="setting-desc">{t(language, 'htThinkChanceDesc')}</span>
              </div>
              <input 
                type="number" 
                value={humanTyperThinkPct} 
                onChange={(e) => updateSettings({ humanTyperThinkPct: Number(e.target.value) })}
                style={{ width: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-color)', outline: 'none' }}
                min={0} max={100}
              />
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <span>{t(language, 'htEnterMode')}</span>
                <span className="setting-desc">{t(language, 'htEnterModeDesc')}</span>
              </div>
              <select 
                value={humanTyperEnterMode} 
                onChange={(e) => updateSettings({ humanTyperEnterMode: e.target.value as any })}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-color)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="enter" style={{ background: '#1e1e24' }}>{t(language, 'htEnterOnly')}</option>
                <option value="shift+enter" style={{ background: '#1e1e24' }}>{t(language, 'htShiftEnter')}</option>
              </select>
            </div>

            <h4 style={{ margin: '10px 0 5px 0', opacity: 0.8, fontSize: '0.9em' }}>{t(language, 'htGlobalHotkeys')}</h4>
            
            <div className="setting-item">
              <span>{t(language, 'htStartHotkey')}</span>
              <input 
                type="text" 
                className="custom-hotkey-input"
                value={humanTyperStartHotkey} 
                readOnly
                onKeyDown={(e) => {
                  e.preventDefault();
                  const keys = [];
                  if (e.ctrlKey) keys.push('CommandOrControl');
                  if (e.altKey) keys.push('Alt');
                  if (e.shiftKey) keys.push('Shift');
                  if (e.metaKey && !e.ctrlKey) keys.push('CommandOrControl');
                  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
                  if ((e.key === 'Backspace' || e.key === 'Delete') && keys.length === 0) {
                    updateSettings({ humanTyperStartHotkey: '' });
                    return;
                  }
                  const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                  keys.push(pressedKey);
                  updateSettings({ humanTyperStartHotkey: keys.join('+') });
                }}
                style={{ width: '120px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-color)', outline: 'none', cursor: 'pointer' }}
                placeholder={t(language, 'htPressKey')}
              />
            </div>
            
            <div className="setting-item">
              <span>{t(language, 'htPauseHotkey')}</span>
              <input 
                type="text" 
                className="custom-hotkey-input"
                value={humanTyperPauseHotkey} 
                readOnly
                onKeyDown={(e) => {
                  e.preventDefault();
                  const keys = [];
                  if (e.ctrlKey) keys.push('CommandOrControl');
                  if (e.altKey) keys.push('Alt');
                  if (e.shiftKey) keys.push('Shift');
                  if (e.metaKey && !e.ctrlKey) keys.push('CommandOrControl');
                  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
                  if ((e.key === 'Backspace' || e.key === 'Delete') && keys.length === 0) {
                    updateSettings({ humanTyperPauseHotkey: '' });
                    return;
                  }
                  const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                  keys.push(pressedKey);
                  updateSettings({ humanTyperPauseHotkey: keys.join('+') });
                }}
                style={{ width: '120px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-color)', outline: 'none', cursor: 'pointer' }}
                placeholder={t(language, 'htPressKey')}
              />
            </div>

            <div className="setting-item">
              <span>{t(language, 'htStopHotkey')}</span>
              <input 
                type="text" 
                className="custom-hotkey-input"
                value={humanTyperStopHotkey} 
                readOnly
                onKeyDown={(e) => {
                  e.preventDefault();
                  const keys = [];
                  if (e.ctrlKey) keys.push('CommandOrControl');
                  if (e.altKey) keys.push('Alt');
                  if (e.shiftKey) keys.push('Shift');
                  if (e.metaKey && !e.ctrlKey) keys.push('CommandOrControl');
                  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
                  if ((e.key === 'Backspace' || e.key === 'Delete') && keys.length === 0) {
                    updateSettings({ humanTyperStopHotkey: '' });
                    return;
                  }
                  const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                  keys.push(pressedKey);
                  updateSettings({ humanTyperStopHotkey: keys.join('+') });
                }}
                style={{ width: '120px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-color)', outline: 'none', cursor: 'pointer' }}
                placeholder={t(language, 'htPressKey')}
              />
            </div>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'rgba(0,0,0,0.2)',
              padding: '15px',
              borderRadius: '12px'
            }}>
              <label style={{ fontSize: '0.9em', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Type size={16} /> {t(language, 'htTextInput')}
              </label>
              <textarea 
                className="custom-scrollbar"
                style={{ minHeight: '120px', resize: 'vertical', width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-color)', outline: 'none' }}
                placeholder={t(language, 'htTextPlaceholder')}
                value={localText}
                onChange={e => setLocalText(e.target.value)}
              />
            </div>

            {isActive ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="timer-btn stop" onClick={handleStop} style={{ padding: '15px', flex: 1 }}>
                  <Square size={20} />
                  {t(language, 'htStop')}
                </button>
                <button 
                  className={`timer-btn ${isPaused ? 'start' : 'pause'}`} 
                  onClick={isPaused ? handleStart : () => window.electronAPI.pauseHumanTyping()} 
                  style={{ padding: '15px', flex: 1, background: isPaused ? 'var(--accent)' : '#ffb020', color: '#1a1a24' }}
                >
                  {isPaused ? <Play size={20} /> : <Pause size={20} />}
                  {isPaused ? t(language, 'htResume') : t(language, 'htPause')}
                </button>
              </div>
            ) : (
              <button 
                className="timer-btn start" 
                onClick={handleStart} 
                style={{ padding: '15px' }}
                disabled={!localText.trim()}
              >
                <Play size={20} />
                {t(language, 'htStart')}
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, fontSize: '0.85em', marginTop: '10px', justifyContent: 'center' }}>
              <AlertCircle size={14} />
              <span>{t(language, 'htStartWarning')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HumanTyper;
