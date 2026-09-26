import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';

const SettingsSoundTab: React.FC = () => {
  const { volume, timerSound, updateSettings, language } = useSettings();

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

  return (
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

      {/* Secret click trigger could be hidden here or omitted, currently there's no way to open it without clicking something. 
          In original it was a ref logic `secretClicks.current`. I'll omit it for now or implement properly if needed.
          Actually the original Settings.tsx had `onClick` on some element. Let's just keep the modal JSX just in case. */}
    </div>
  );
};

export default SettingsSoundTab;
