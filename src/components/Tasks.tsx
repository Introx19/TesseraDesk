import { useState, useEffect } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';
import { useModal } from '../contexts/ModalContext';

interface Task {
  id: number;
  text: string;
  completed: boolean;
  isFavorite?: boolean;
}

export default function Tasks() {
  const { language } = useSettings();
  const modal = useModal();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('tesseradesk-tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tasks", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tesseradesk-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (inputText.trim()) {
      setTasks([{ id: Date.now(), text: inputText.trim(), completed: false }, ...tasks]);
      setInputText('');
    }
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const toggleFavorite = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
  };

  const removeTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const clearAll = async () => {
    if (await modal.confirm(t(language as Lang, 'clearTasksConfirm'))) {
      setTasks([]);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.isFavorite === b.isFavorite) return 0;
    return a.isFavorite ? -1 : 1;
  });

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t(language as Lang, 'tasks')}</h2>
        {tasks.length > 0 && (
          <button className="win-btn" onClick={clearAll} title={t(language as Lang, 'clearAll')} style={{ padding: '6px' }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '15px', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder={t(language as Lang, 'newTaskPlaceholder')}
          style={{ 
            flex: 1, 
            padding: '10px 15px', 
            borderRadius: '8px', 
            border: '1px solid var(--glass-border)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            outline: 'none'
          }}
        />
        <button className="btn btn-primary" onClick={addTask}>{t(language as Lang, 'add')}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
        {sortedTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>{t(language as Lang, 'noTasks')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedTasks.map(task => (
              <div key={task.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                background: 'var(--bg-card)',
                padding: '12px 15px',
                borderRadius: '8px',
                opacity: task.completed ? 0.6 : 1,
                transition: 'all 0.2s',
                border: task.isFavorite ? '1px solid var(--accent)' : '1px solid transparent'
              }}>
                <input 
                  type="checkbox" 
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
                <span style={{ 
                  flex: 1, 
                  textDecoration: task.completed ? 'line-through' : 'none',
                  wordBreak: 'break-word',
                  color: task.isFavorite ? 'var(--accent)' : 'inherit'
                }}>
                  {task.text}
                </span>
                <button 
                  className="win-btn" 
                  onClick={() => toggleFavorite(task.id)}
                  style={{ color: task.isFavorite ? 'var(--accent)' : 'var(--text-muted)' }}
                  title={t(language as Lang, 'favorite')}
                >
                  <Star size={16} fill={task.isFavorite ? 'var(--accent)' : 'none'} />
                </button>
                <button 
                  className="win-btn close" 
                  onClick={() => removeTask(task.id)}
                  title={t(language as Lang, 'remove')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
