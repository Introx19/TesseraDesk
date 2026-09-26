import React, { useState, useEffect, useRef } from 'react';
import { useSettings, defaultSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';
import { useModal } from '../../contexts/ModalContext';
import DonateModal from '../DonateModal';

const SettingsAboutTab: React.FC = () => {
  const { extendedMode, updateSettings, language } = useSettings();
  const modal = useModal();
  const secretClicks = useRef(0);
  const lastClickTime = useRef(0);
  
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugDescription, setBugDescription] = useState('');

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
      const unsub2 = window.electronAPI.onDownloadProgress((progress: any) => {
        setDownloadProgress(progress);
      });
      const unsub3 = window.electronAPI.onUpdateDownloaded(async (info: any) => {
        setUpdateMsg('Новая версия ' + info.version + ' скачана!');
        setDownloadProgress(null);
        setUpdateReady(true);
      });
      const unsub4 = window.electronAPI.onUpdateError((errorStr: string) => {
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
  }, [language]);

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
    }
  };

  return (
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
        <div style={{ color: 'var(--text-muted)' }}>{t(language as Lang, 'currentVersion')} 1.8.7</div>
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
          onClick={() => setShowDonateModal(true)}
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
      
      <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
        <button className="action-btn outline-danger" onClick={resetAllSettings}>
          {t(language as Lang, 'resetSettingsBtn')}
        </button>
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
      
      {showDonateModal && <DonateModal onClose={() => setShowDonateModal(false)} />}
    </div>
  );
};

export default SettingsAboutTab;
