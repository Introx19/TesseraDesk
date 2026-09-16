import InfoButton from '../InfoButton';
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { translations } from '../../i18n/texts';
import { MousePointerClick } from 'lucide-react';

type Lang = 'en' | 'ru';
const t = (lang: Lang, key: keyof typeof translations['en']) => translations[lang][key] || translations['en'][key];

export default function AutoClicker() {
  const { 
    language,
    autoclickerHotkey, 
    autoclickerInterval, 
    autoclickerIntervalUnit,
    autoclickerButton, 
    autoclickerRandomize,
    autoclickerClickDelay,
    updateSettings 
  } = useSettings();
  
  const [isActive, setIsActive] = useState(false);
  const [localHotkey, setLocalHotkey] = useState(autoclickerHotkey);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Update local input if context changes from another place
  useEffect(() => {
    setLocalHotkey(autoclickerHotkey);
  }, [autoclickerHotkey]);

  useEffect(() => {
    const handleStateChange = (active: boolean) => {
      setIsActive(active);
    };
    if (window.electronAPI?.onAutoclickerStateChanged) {
      window.electronAPI.onAutoclickerStateChanged(handleStateChange);
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.setAutoclickerConfig) {
      window.electronAPI.setAutoclickerConfig(autoclickerHotkey, autoclickerInterval, autoclickerIntervalUnit, autoclickerButton, autoclickerRandomize, autoclickerClickDelay);
    }
  }, [autoclickerHotkey, autoclickerInterval, autoclickerIntervalUnit, autoclickerButton, autoclickerRandomize, autoclickerClickDelay]);

  const handleShortcutChange = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const keys = [];
    if (e.ctrlKey) keys.push('CommandOrControl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey && !e.ctrlKey) keys.push('CommandOrControl');
    
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    
    // Clear shortcut if Backspace/Delete pressed without modifiers
    if ((e.key === 'Backspace' || e.key === 'Delete') && keys.length === 0) {
      setLocalHotkey('');
      updateSettings({ autoclickerHotkey: '' });
      return;
    }
    
    const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    keys.push(pressedKey);
    
    const newShortcut = keys.join('+');
    setLocalHotkey(newShortcut);
    updateSettings({ autoclickerHotkey: newShortcut });
  };

  return (
    <div className="tool-container">
      <div className="tool-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MousePointerClick size={20} />
        <span className="tool-title">{t(language as Lang, 'autoclicker')}</span>
        <InfoButton text={language === 'ru' ? 'Автоматический высокоскоростной кликер с настройкой задержки и рандомизации.' : 'Automated high-speed clicker with customizable intervals and random variance.'} />
        
      </div>

      <div className="tool-content" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Status Card */}
        <div style={{
          padding: '24px',
          borderRadius: '16px',
          background: isActive ? 'var(--accent-color)' : 'var(--bg-card)',
          color: isActive ? '#fff' : 'var(--text-color)',
          textAlign: 'center',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: isActive ? '0 10px 30px -10px var(--accent-glow)' : '0 4px 15px rgba(0,0,0,0.05)',
          border: isActive ? '1px solid transparent' : '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isActive ? '#fff' : 'var(--text-muted)',
            boxShadow: isActive ? '0 0 10px #fff' : 'none',
            transition: 'all 0.3s ease',
            marginBottom: '4px'
          }} />
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, letterSpacing: '0.5px' }}>
            {isActive ? t(language as Lang, 'clickerStatusActive') : t(language as Lang, 'clickerStatusStopped')}
          </h2>
          <p style={{ margin: 0, opacity: isActive ? 0.9 : 0.6, fontSize: '0.9em' }}>
            {t(language as Lang, 'autoclickerHotkey')}: <strong style={{
              color: isActive ? '#fff' : 'var(--accent-color)', 
              fontWeight: 700, 
              padding: '2px 8px', 
              background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-color)', 
              borderRadius: '6px',
              marginLeft: '6px'
            }}>{autoclickerHotkey || '---'}</strong>
          </p>
        </div>

        {/* Settings Block */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div className="settings-section">
            <label className="settings-label" style={{display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-muted)'}}>{t(language as Lang, 'autoclickerHotkey')}</label>
            <input
              type="text"
              className="settings-input custom-hotkey-input"
              value={localHotkey}
              readOnly
              onKeyDown={handleShortcutChange}
              placeholder={t(language as Lang, 'hotkeysInstructions')}
              style={{ 
                width: '100%', 
                boxSizing: 'border-box', 
                padding: '12px', 
                borderRadius: '10px', 
                transition: 'all 0.2s ease',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <div className="settings-section">
            <label className="settings-label" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-muted)'}}>
              <span>{t(language as Lang, 'autoclickerInterval' as any) || 'Delay'}</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="number"
                min="0"
                className="settings-input"
                value={autoclickerInterval}
                onChange={(e) => updateSettings({ autoclickerInterval: Math.max(0, Number(e.target.value)) })}
                style={{ 
                  flex: 1,
                  boxSizing: 'border-box', 
                  padding: '12px', 
                  borderRadius: '10px', 
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  outline: 'none',
                }}
              />
              <div style={{
                display: 'flex',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                {(['ms', 's', 'm'] as const).map(unit => (
                  <button
                    key={unit}
                    onClick={() => updateSettings({ autoclickerIntervalUnit: unit })}
                    style={{
                      padding: '12px 10px',
                      background: autoclickerIntervalUnit === unit ? 'var(--accent)' : 'transparent',
                      color: autoclickerIntervalUnit === unit ? '#fff' : 'var(--text-color)',
                      border: 'none',
                      outline: 'none',
                      cursor: 'pointer',
                      fontWeight: autoclickerIntervalUnit === unit ? 'bold' : 'normal',
                      flex: 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {unit === 'ms' ? 'ms' : unit === 's' ? 'sec' : 'min'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-label" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-muted)'}}>
              <span>{t(language as Lang, 'autoclickerRandomize' as any) || 'Randomize (ms)'}</span>
              <span style={{
                color: 'var(--accent-color)', 
                fontWeight: 'bold', 
                background: 'var(--bg-color)', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.9em'
              }}>±{autoclickerRandomize} ms</span>
            </label>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={autoclickerRandomize || 0}
              onChange={(e) => updateSettings({ autoclickerRandomize: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--accent-color)', height: '6px', borderRadius: '3px' }}
            />
          </div>

          <div className="settings-section">
            <label className="settings-label" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-muted)'}}>
              <span>{t(language as Lang, 'htClickDelay') || 'Click Delay (ms)'}</span>
              <span style={{
                color: 'var(--accent-color)', 
                fontWeight: 'bold', 
                background: 'var(--bg-color)', 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.9em'
              }}>{autoclickerClickDelay || 10} ms</span>
            </label>
            <input
              type="range"
              min="1"
              max="200"
              step="1"
              value={autoclickerClickDelay || 10}
              onChange={(e) => updateSettings({ autoclickerClickDelay: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--accent-color)', height: '6px', borderRadius: '3px' }}
            />
          </div>

          <div className="settings-section">
            <label className="settings-label" style={{display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--text-muted)'}}>{t(language as Lang, 'autoclickerButton')}</label>
            <div style={{ position: 'relative' }}>
              <div 
                className="settings-input" 
                style={{ 
                  width: '100%', boxSizing: 'border-box', cursor: 'pointer', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px', borderRadius: '10px',
                  background: 'var(--bg-color)',
                  border: isDropdownOpen ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  boxShadow: isDropdownOpen ? '0 0 0 2px var(--accent-glow)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span style={{ fontWeight: 500 }}>
                  {autoclickerButton === 'left' ? t(language as Lang, 'leftClick') : 
                   autoclickerButton === 'right' ? t(language as Lang, 'rightClick') : 
                   t(language as Lang, 'middleClick')}
                </span>
                <span style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', color: 'var(--text-muted)' }}>▼</span>
              </div>
              
              {isDropdownOpen && (
                <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setIsDropdownOpen(false)} />
                <div style={{ 
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 10, 
                  background: 'var(--bg-card)', border: '1px solid var(--glass-border)', 
                  borderRadius: '12px', overflow: 'hidden', 
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  transformOrigin: 'bottom',
                  animation: 'dropdownFadeIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                  {(['left', 'right', 'middle'] as const).map((btn, index) => (
                    <div 
                      key={btn}
                      style={{ 
                        padding: '12px 16px', cursor: 'pointer',
                        background: autoclickerButton === btn ? 'var(--accent-glow)' : 'transparent',
                        color: autoclickerButton === btn ? 'var(--accent-color)' : 'var(--text-color)',
                        fontWeight: autoclickerButton === btn ? 600 : 400,
                        borderBottom: index < 2 ? '1px solid var(--glass-border)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => {
                        updateSettings({ autoclickerButton: btn });
                        setIsDropdownOpen(false);
                      }}
                      onMouseEnter={(e) => {
                        if (autoclickerButton !== btn) e.currentTarget.style.background = 'var(--bg-color)';
                      }}
                      onMouseLeave={(e) => {
                        if (autoclickerButton !== btn) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {btn === 'left' ? t(language as Lang, 'leftClick') : 
                       btn === 'right' ? t(language as Lang, 'rightClick') : 
                       t(language as Lang, 'middleClick')}
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <style>
          {`
            @keyframes dropdownFadeIn {
              from { opacity: 0; transform: scaleY(0.95) translateY(-5px); }
              to { opacity: 1; transform: scaleY(1) translateY(0); }
            }
            .custom-hotkey-input:focus {
              border-color: var(--accent-color) !important;
              box-shadow: 0 0 0 2px var(--accent-glow) !important;
            }
          `}
        </style>
      </div>
    </div>
  );
}
