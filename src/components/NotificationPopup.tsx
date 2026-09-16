import { useEffect, useState } from 'react';
import { X, Bell } from 'lucide-react';

export default function NotificationPopup() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    setTitle(decodeURIComponent(params.get('title') || 'Уведомление'));
    setBody(decodeURIComponent(params.get('body') || ''));
    
    if (window.electronAPI && window.electronAPI.onNotificationData) {
      window.electronAPI.onNotificationData((data: any) => {
        if (data.title) setTitle(data.title);
        if (data.body) setBody(data.body);
        if (data.image) setImage(data.image);
      });
      window.electronAPI.requestNotificationData?.();
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      margin: '0',
      boxSizing: 'border-box',
      border: '1px solid var(--accent)',
      backgroundColor: 'var(--bg-main)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      padding: '15px',
      borderRadius: '8px'
    }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 'bold' }}>
             <Bell size={16} />
             <span style={{ fontSize: '1rem' }}>{title}</span>
          </div>
          <button className="win-btn close" onClick={() => window.electronAPI?.windowClose()} style={{ padding: '4px', margin: '-5px', cursor: 'pointer' }}>
             <X size={14} />
          </button>
       </div>
       <div 
         onClick={() => {
           if (image && window.electronAPI) {
             window.electronAPI.openPaintWithImage(image);
             window.electronAPI.windowClose();
           }
         }}
         style={{ 
           flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)', fontSize: '0.9em', lineHeight: '1.4',
           cursor: image ? 'pointer' : 'default'
         }}
       >
          {body}
          {image && (
             <div style={{ marginTop: '10px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <img src={image} alt="Notification media" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', display: 'block' }} />
             </div>
          )}
          {image && (
            <div style={{ marginTop: '6px', fontSize: '0.75em', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.7 }}>
              Нажмите чтобы открыть в редакторе
            </div>
          )}
       </div>
    </div>
  );
}
