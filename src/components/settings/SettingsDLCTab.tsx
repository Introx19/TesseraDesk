import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';
import { Package, CheckCircle, DownloadCloud, Trash2 } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';

const SettingsDLCTab: React.FC = () => {
  const { activeTools, extendedMode, updateSettings, language } = useSettings();
  const [downloading, setDownloading] = useState<string[]>([]);
  const modal = useModal();

  const dlcs = [
    {
      id: 'periodicTable',
      name: t(language as Lang, 'dlc_periodicTable_name'),
      desc: t(language as Lang, 'dlc_periodicTable_desc'),
      isInstalled: activeTools.periodicTable
    },
    {
      id: 'desmos',
      name: t(language as Lang, 'dlc_desmos_name'),
      desc: t(language as Lang, 'dlc_desmos_desc'),
      isInstalled: activeTools.desmos
    },
    {
      id: 'formulas',
      name: t(language as Lang, 'dlc_formulas_name'),
      desc: t(language as Lang, 'dlc_formulas_desc'),
      isInstalled: activeTools.formulas
    },
    {
      id: 'integrals',
      name: t(language as Lang, 'dlc_integrals_name'),
      desc: t(language as Lang, 'dlc_integrals_desc'),
      isInstalled: activeTools.integrals
    },
    {
      id: 'converter',
      name: t(language as Lang, 'dlc_converter_name'),
      desc: t(language as Lang, 'dlc_converter_desc'),
      isInstalled: activeTools.converter
    },
    {
      id: 'worldClock',
      name: t(language as Lang, 'dlc_worldClock_name' as any),
      desc: t(language as Lang, 'dlc_worldClock_desc' as any),
      isInstalled: activeTools.worldClock
    },
    {
      id: 'devTools',
      name: t(language as Lang, 'dlc_devTools_name' as any),
      desc: t(language as Lang, 'dlc_devTools_desc' as any),
      isInstalled: activeTools.devTools
    },
    {
      id: 'autoclicker',
      name: t(language as Lang, 'dlc_autoclicker_name' as any) || 'AutoClicker',
      desc: t(language as Lang, 'dlc_autoclicker_desc' as any),
      isInstalled: activeTools.autoclicker
    },
    {
      id: 'humanTyper',
      name: 'Human Typer',
      desc: 'Имитация реального человека при наборе текста (с опечатками и паузами). Идеально для обхода анти-спам систем и бот-фильтров.',
      isInstalled: activeTools.humanTyper
    },
    {
      id: 'superHumanizer',
      name: 'Super Humanizer',
      desc: 'Мощный ИИ-переводчик машинного текста в "человеческий". Делает текст невидимым для AI-детекторов.',
      isInstalled: activeTools.superHumanizer
    },
    {
      id: 'creatorStudio',
      name: 'TesseraDesk Creator Studio',
      desc: 'Менеджер DLC и режим разработчика. Позволяет загружать сторонние архивы плагинов (.zip) и управлять ими.',
      isInstalled: activeTools.creatorStudio
    }
  ];

  if (extendedMode) {
    dlcs.push({
      id: 'numismatics',
      name: t(language as Lang, 'dlc_numismatics_name' as any),
      desc: t(language as Lang, 'dlc_numismatics_desc' as any),
      isInstalled: activeTools.numismatics
    });
  }

  const installDlc = (id: string) => {
    setDownloading(prev => [...prev, id]);
    setTimeout(() => {
      const stored = localStorage.getItem('tesseradesk-settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const currentTools = parsed.activeTools || {};
          updateSettings({ activeTools: { ...currentTools, [id]: true } });
        } catch(e) {}
      } else {
        updateSettings({ activeTools: { ...activeTools, [id]: true } });
      }
      setDownloading(prev => prev.filter(item => item !== id));
    }, 2500);
  };

  const handleRemoveDlc = async (dlcId: keyof typeof activeTools) => {
    if (await modal.confirm(t(language as Lang, 'confirmRemoveDlc'))) {
      updateSettings({ activeTools: { ...activeTools, [dlcId]: false } });
    }
  };

  return (
    <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <p style={{marginTop: 0, fontSize: '0.9em', color: 'var(--text-secondary)'}}>{t(language as Lang, 'dlcInfo')}</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {dlcs.map(item => (
          <div key={item.id} style={{
            background: 'var(--bg-card)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={20} color="var(--accent)" />
              <div style={{ fontWeight: 'bold', fontSize: '1.05em' }}>{item.name}</div>
            </div>
            <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
              <div>
                {item.isInstalled && (
                  <span style={{ fontSize: '0.85em', color: '#4caf50', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle size={14} /> {t(language as Lang, 'installed')}
                  </span>
                )}
              </div>
              <div>
                {item.isInstalled ? (
                  <button className="action-btn outline-danger" onClick={() => handleRemoveDlc(item.id as keyof typeof activeTools)} style={{ padding: '4px 10px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Trash2 size={14} /> {t(language as Lang, 'remove')}
                  </button>
                ) : downloading.includes(item.id) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ fontSize: '0.85em', color: 'var(--accent)' }}>{t(language as Lang, 'downloading')}</span>
                  </div>
                ) : (
                  <button className="action-btn active" onClick={() => installDlc(item.id)} style={{ padding: '4px 10px', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <DownloadCloud size={14} /> {t(language as Lang, 'install')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsDLCTab;
