import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';

const SettingsToolsTab: React.FC = () => {
  const { pomodoroEnabled, pomodoroWork, pomodoroBreak, multiScreenshot, fastScreenshot, saveFastScreenshotDisk, updateSettings, language } = useSettings();

  return (
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
};

export default SettingsToolsTab;
