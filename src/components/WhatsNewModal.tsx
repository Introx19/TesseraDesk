import { X, Sparkles } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const CURRENT_VERSION = '1.8.8';

export default function WhatsNewModal({ onClose }: { onClose: () => void }) {
  const { language } = useSettings();
  
  const items = language === 'ru' ? [
    { icon: '📁', title: 'Папки в библиотеке', desc: 'Новая возможность: теперь можно создавать папки и организовывать свои инструменты с помощью перетаскивания (Drag-and-Drop)!' },
    { icon: '⚙️', title: 'Масштабный рефакторинг', desc: 'Мы провели серьезный рефакторинг ядра (и написали кучу тестов!). Из-за этого могли возникнуть некоторые баги. Если найдете проблему — пожалуйста, напишите баг-репорт. Спасибо за понимание ≽^⎚⩊⎚^≼' },
  ] : [
    { icon: '📁', title: 'Library Folders', desc: 'New feature: You can now create folders in the library and organize your widgets using Drag-and-Drop!' },
    { icon: '⚙️', title: 'Massive Refactoring', desc: 'We did a major core refactoring (and added many tests!). There might be some bugs as a result. If you find any issues, please submit a bug report. Thanks for understanding ≽^⎚⩊⎚^≼' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', 
      justifyContent: 'center', zIndex: 10000,
      animation: 'fadeIn 0.4s ease-out'
    }}>
      <div style={{ 
        width: '480px', maxWidth: '95%', maxHeight: '90vh',
        borderRadius: '18px', position: 'relative',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        background: 'var(--bg-main)',
        display: 'flex', flexDirection: 'column'
      }}>
        
        {/* Header gradient */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255,210,0,0.1) 0%, rgba(255,255,255,0.03) 100%)',
          padding: '20px 24px 16px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <Sparkles size={20} style={{ color: 'var(--accent)' }} />
              <h2 style={{ margin: 0, fontSize: '1.15em', color: 'var(--text-main)' }}>
                {language === 'ru' ? 'Что нового?' : "What's New?"}
              </h2>
            </div>
            <span style={{ fontSize: '0.8em', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              TESSERA DESK v{CURRENT_VERSION}
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Items list */}
        <div className="custom-scrollbar" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px' }}>
              <span style={{ fontSize: '1.4em', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88em', marginBottom: '4px', color: 'var(--text-main)' }}>{item.title}</div>
                <div style={{ fontSize: '0.81em', color: 'var(--text-muted)', lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button className="action-btn" style={{ width: '100%', padding: '12px', fontSize: '0.95em', fontWeight: 700 }} onClick={onClose}>
            {language === 'ru' ? '🚀 Поехали!' : "🚀 Let's go!"}
          </button>
        </div>

      </div>
    </div>
  );
}

export const checkWhatsNew = () => {
  const lastSeen = localStorage.getItem('lastSeenVersion');
  if (lastSeen !== CURRENT_VERSION) {
    localStorage.setItem('lastSeenVersion', CURRENT_VERSION);
    return true;
  }
  return false;
};

