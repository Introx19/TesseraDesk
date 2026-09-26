import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { DownloadCloud, Package, Info } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';

const SettingsDataTab: React.FC = () => {
  const { language } = useSettings();
  const modal = useModal();

  const handleExportData = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tesseradesk-')) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `tesseradesk-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.electronAPI?.showNotification(
      language === 'ru' ? 'Успешно' : 'Success',
      language === 'ru' ? 'Резервная копия сохранена' : 'Backup saved successfully'
    );
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (await modal.confirm(language === 'ru' ? 'Это перезапишет все ваши текущие данные. Продолжить?' : 'This will overwrite all your current data. Continue?')) {
          for (const key in data) {
            if (key.startsWith('tesseradesk-')) {
              localStorage.setItem(key, data[key]);
            }
          }
          window.electronAPI?.showNotification(
            language === 'ru' ? 'Успешно' : 'Success',
            language === 'ru' ? 'Данные восстановлены. Перезапуск...' : 'Data restored. Restarting...'
          );
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
         modal.confirm({ message: language === 'ru' ? 'Ошибка чтения файла бэкапа' : 'Error reading backup file', hideCancel: true });
      }
    };
    input.click();
  };

  return (
    <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <p style={{marginTop: 0, fontSize: '0.9em', color: 'var(--text-secondary)'}}>
        {language === 'ru' ? 'Вы можете создать локальную копию всех ваших заметок, задач и настроек, чтобы не потерять их при переустановке системы.' : 'You can create a local backup of all your notes, tasks, and settings to prevent data loss.'}
      </p>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <button className="action-btn" onClick={handleExportData} style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <DownloadCloud size={18} /> {language === 'ru' ? 'Сохранить резервную копию' : 'Export Backup'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
        <button className="action-btn outline" onClick={handleImportData} style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Package size={18} /> {language === 'ru' ? 'Восстановить из копии' : 'Restore from Backup'}
        </button>
      </div>
      
      <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
        <h4 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} /> {language === 'ru' ? 'Облачная синхронизация' : 'Cloud Synchronization'}
        </h4>
        <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>
          {language === 'ru' ? 'Синхронизация через облако (GitHub Gist, Google Drive) находится в разработке и появится в будущих обновлениях.' : 'Cloud synchronization (GitHub Gist, Google Drive) is currently in development and will be available in future updates.'}
        </p>
      </div>
    </div>
  );
};

export default SettingsDataTab;
