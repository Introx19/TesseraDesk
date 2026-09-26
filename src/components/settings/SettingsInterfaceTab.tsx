import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';

const SettingsInterfaceTab: React.FC = () => {
  const { theme, appStyle, customAccent, autoUpdate, updateSettings, language, runAtStartup, oledProtection } = useSettings();

  return (
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
          <option value="midnight-oled">Midnight OLED</option>
          <option value="claymorphism">Claymorphism</option>
        </select>
      </div>

      <h3 style={{marginBottom: '10px'}}>{t(language as Lang, 'customColors')}</h3>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
        <input 
          type="color" 
          value={customAccent || (theme === 'light' ? '#3b82f6' : theme === 'soft' ? '#f97316' : '#eab308')} 
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
          value={language} 
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
          checked={runAtStartup} 
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
          checked={oledProtection} 
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
};

export default SettingsInterfaceTab;
