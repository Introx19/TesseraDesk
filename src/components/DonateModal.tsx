import { useState } from 'react';
import { X, Heart, Copy, Check, Mail } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export default function DonateModal({ onClose }: { onClose: () => void }) {
  const { language } = useSettings();
  const [copied, setCopied] = useState(false);

  const email = "demcheyaroslav31@gmail.com";

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const t = {
    ru: {
      title: 'Поддержать автора',
      desc: '🍵 Спасибо что нажали на эту кнопку!!!',
      info: 'К сожалению, пока что поддержать разработку проекта можно только через банковский перевод e-transfer. (Эта функция доступна только для пользователей с канадскими банковскими счетами).',
      emailLabel: 'Почта для e-transfer:',
      footer: 'Буду очень благодарен любой копейке! ₍^. .^₎Ⳋ'
    },
    en: {
      title: 'Support the Author',
      desc: '🍵 Thank you for clicking this button!!!',
      info: 'Unfortunately, right now the only way to support the project is via Interac e-Transfer. (This is only available for users with Canadian bank accounts).',
      emailLabel: 'e-Transfer Email:',
      footer: 'I will be extremely grateful for every penny! ₍^. .^₎Ⳋ'
    }
  };

  const currentT = t[language as keyof typeof t] || t.en;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', 
      justifyContent: 'center', zIndex: 10000,
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ 
        width: '420px', maxWidth: '95%', maxHeight: '90vh',
        borderRadius: '18px', position: 'relative',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        background: 'var(--bg-main)',
        display: 'flex', flexDirection: 'column'
      }}>
        
        {/* Header gradient */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255,68,102,0.1) 0%, rgba(255,255,255,0.03) 100%)',
          padding: '20px 24px 16px', 
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <Heart size={20} style={{ color: '#ff4466' }} />
              <h2 style={{ margin: 0, fontSize: '1.15em', color: 'var(--text-main)' }}>
                {currentT.title}
              </h2>
            </div>
            <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
              {currentT.desc}
            </span>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="custom-scrollbar" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          <div style={{ fontSize: '0.9em', color: 'var(--text-main)', lineHeight: '1.5' }}>
            {currentT.info}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.85em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} />
              {currentT.emailLabel}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, fontSize: '1.1em', color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 500, userSelect: 'all' }}>
                {email}
              </div>
              <button 
                className="action-btn" 
                onClick={handleCopy}
                title="Copy Email"
                style={{ padding: '8px 12px', minWidth: '100px', display: 'flex', justifyContent: 'center' }}
              >
                {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.95em', color: 'var(--text-main)', textAlign: 'center', fontStyle: 'italic', marginTop: '10px' }}>
            {currentT.footer}
          </div>

        </div>
      </div>
    </div>
  );
}
