import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';
import { useModal } from '../contexts/ModalContext';

interface Reminder {
  id: number;
  text: string;
  time: string; // YYYY-MM-DDTHH:MM
  notified: boolean;
}

export default function Reminders() {
  const { timerSound, volume, dndMode, language } = useSettings();
  const modal = useModal();
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('tesseradesk-reminders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [newText, setNewText] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    localStorage.setItem('tesseradesk-reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      
      setReminders(prev => {
        let changed = false;
        const mapped = prev.map(r => {
          if (!r.notified && r.time) {
            const reminderDate = new Date(r.time);
            if (now >= reminderDate) {
              changed = true;
              if (window.electronAPI) {
                window.electronAPI.showNotification(t(language as Lang, 'reminderAlertTitle'), r.text);
              }
              playAlarm();
              return { ...r, notified: true };
            }
          }
          return r;
        });
        return changed ? mapped : prev;
      });
    }, 15000);

    return () => clearInterval(checkInterval);
  }, []);

  const playAlarm = () => {
    let audio: HTMLAudioElement | null = null;
    if (timerSound === 'bell') {
       audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    } else if (timerSound === 'digital') {
       audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2861/2861-preview.mp3');
    } else if (timerSound) {
       audio = new Audio(`media:///${timerSound.replace(/\\/g, '/')}`);
    }

    if (audio && !dndMode) {
      audio.volume = volume / 100;
      audio.play().catch(e => console.log(e));
    }
  };

  const addReminder = () => {
    if (newText.trim() && newTime) {
      setReminders(prev => [...prev, {
        id: Date.now(),
        text: newText.trim(),
        time: newTime,
        notified: false
      }].sort((a, b) => a.time.localeCompare(b.time)));
      setNewText('');
      setNewTime('');
    }
  };

  const removeReminder = (id: number) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const renderDate = (timeStr: string) => {
    if (!timeStr) return '';
    if (!timeStr.includes('T')) return timeStr; // Legacy fallback
    
    const d = new Date(timeStr);
    const isToday = new Date().toDateString() === d.toDateString();
    const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    if (isToday) return `${t(language as Lang, 'todayAt')}${time}`;
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')} ${time}`;
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>{t(language as Lang, 'reminders')}</h2>
        {reminders.length > 0 && (
          <button 
            className="win-btn close" 
            onClick={async () => { if(await modal.confirm(t(language as Lang, 'clearRemindersConfirm'))) setReminders([]) }}
            title={t(language as Lang, 'clear')}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input 
          type="datetime-local" 
          className="task-input" 
          value={newTime}
          onChange={e => setNewTime(e.target.value)}
        />
        <input 
          type="text" 
          className="task-input" 
          style={{ flex: 1, minWidth: 0 }} 
          placeholder={t(language as Lang, 'eventPlaceholder')} 
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addReminder()}
        />
        <button className="btn btn-primary" onClick={addReminder} style={{ padding: '8px', flexShrink: 0 }} title={t(language as Lang, 'add')}>
          <Plus size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
        {reminders.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
            {t(language as Lang, 'noReminders')}
          </div>
        ) : (
          reminders.map(rem => (
            <div 
              key={rem.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'var(--bg-card)', 
                padding: '12px', 
                borderRadius: '8px',
                opacity: rem.notified ? 0.5 : 1
              }}
            >
              <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginRight: '15px' }}>
                {renderDate(rem.time)}
              </div>
              <div style={{ flex: 1, textDecoration: rem.notified ? 'line-through' : 'none' }}>
                {rem.text}
              </div>
              <button className="win-btn close" onClick={() => removeReminder(rem.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
