import { useState } from 'react';
import elementsData from './elements.json';
import { useWindowSize } from '../../hooks/useWindowSize';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';
import { elementNamesRu } from './elementTranslations';

const categoryRu: Record<string, string> = {
  'noble gas': 'Благородный газ',
  'alkali metal': 'Щелочной металл',
  'alkaline earth metal': 'Щелочноземельный металл',
  'transition metal': 'Переходный металл',
  'post-transition metal': 'Постпереходный металл',
  'metalloid': 'Металлоид',
  'nonmetal': 'Неметтал',
  'diatomic nonmetal': 'Двухатомный неметалл',
  'polyatomic nonmetal': 'Многоатомный неметалл',
  'halogen': 'Галоген',
  'lanthanide': 'Лантаноид',
  'actinide': 'Актиноид'
};

const translatePhase = (phase: string, lang: string) => {
  if (lang !== 'ru') return phase;
  if (!phase) return phase;
  const p = phase.toLowerCase();
  if (p.includes('solid')) return phase.replace(/Solid/i, 'Твердое');
  if (p.includes('liquid')) return phase.replace(/Liquid/i, 'Жидкость');
  if (p.includes('gas')) return phase.replace(/Gas/i, 'Газ');
  if (p.includes('expected')) return phase.replace(/Expected to be/i, 'Ожидается');
  return phase;
};

const shortenEConfig = (config: string) => {
  if (!config) return config;
  const nobleGases = [
    { sym: 'Rn', config: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6' },
    { sym: 'Xe', config: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6' },
    { sym: 'Kr', config: '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6' },
    { sym: 'Ar', config: '1s2 2s2 2p6 3s2 3p6' },
    { sym: 'Ne', config: '1s2 2s2 2p6' },
    { sym: 'He', config: '1s2' }
  ];
  for (const gas of nobleGases) {
    if (config.startsWith(gas.config) && config !== gas.config) {
      return `[${gas.sym}] ` + config.substring(gas.config.length).trim();
    }
  }
  return config;
};

export default function PeriodicTable() {
  const { isSm } = useWindowSize();
  const { language } = useSettings();
  const [selected, setSelected] = useState<typeof elementsData[0] | null>(null);

  // Group colors
  const getColor = (cat: string) => {
    if (cat.includes('noble gas')) return 'rgba(156, 39, 176, 0.6)';
    if (cat.includes('alkali metal')) return 'rgba(244, 67, 54, 0.6)';
    if (cat.includes('alkaline earth metal')) return 'rgba(255, 152, 0, 0.6)';
    if (cat.includes('transition metal')) return 'rgba(63, 81, 181, 0.6)';
    if (cat.includes('post-transition metal')) return 'rgba(0, 150, 136, 0.6)';
    if (cat.includes('metalloid')) return 'rgba(76, 175, 80, 0.6)';
    if (cat.includes('nonmetal')) return 'rgba(33, 150, 243, 0.6)';
    if (cat.includes('halogen')) return 'rgba(0, 188, 212, 0.6)';
    if (cat.includes('lanthanide')) return 'rgba(121, 85, 72, 0.6)';
    if (cat.includes('actinide')) return 'rgba(96, 125, 139, 0.6)';
    return 'rgba(158, 158, 158, 0.6)';
  };

  return (
    <div className="panel" style={{ height: '100%', padding: '0', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {!isSm && <h2 style={{ padding: '15px 20px 0', margin: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>{t(language as Lang, 'periodicTableTitle')}</h2>}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Modal Overlay for Details */}
        {selected && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={() => setSelected(null)}>
            <div style={{
              background: 'var(--bg-main)', width: '400px', maxWidth: '90%', borderRadius: '12px',
              border: '1px solid var(--accent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', padding: '20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{
                  background: getColor(selected.cat), width: '80px', height: '80px', borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.8em', opacity: 0.8, alignSelf: 'flex-start', paddingLeft: '4px', marginTop: '-10px' }}>{selected.num}</span>
                  <span style={{ fontSize: '2em', fontWeight: 'bold' }}>{selected.sym}</span>
                </div>
                <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5em', color: 'var(--text-main)' }}>
                    {language === 'ru' ? elementNamesRu[selected.num] || selected.name : selected.name}
                  </h2>
                  {language === 'ru' && <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '5px' }}>{selected.name}</div>}
                  <div style={{ fontSize: '0.95em', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {language === 'ru' ? (categoryRu[selected.cat] || selected.cat) : selected.cat}
                  </div>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Атомная масса' : 'Atomic Mass'}</span>
                  <span style={{ fontWeight: 'bold' }}>{typeof selected.mass === 'number' ? selected.mass.toFixed(4) : selected.mass} u</span>
                </div>
                {selected.phase && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Агрегатное состояние' : 'Standard State'}</span>
                    <span style={{ fontWeight: 'bold' }}>{translatePhase(selected.phase, language)}</span>
                  </div>
                )}
                {selected.econfig && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Электронная конфигурация' : 'Electron Configuration'}</span>
                    <span style={{ fontWeight: 'bold' }}>{shortenEConfig(selected.econfig)}</span>
                  </div>
                )}
                {selected.electro && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Электроотрицательность (по Полингу)' : 'Electronegativity (Pauling)'}</span>
                    <span style={{ fontWeight: 'bold' }}>{selected.electro}</span>
                  </div>
                )}
                {selected.ion && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Энергия ионизации' : 'Ionization Energy'}</span>
                    <span style={{ fontWeight: 'bold' }}>{selected.ion} eV</span>
                  </div>
                )}
                {selected.affinity !== undefined && selected.affinity !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Сродство к электрону' : 'Electron Affinity'}</span>
                    <span style={{ fontWeight: 'bold' }}>{selected.affinity} eV</span>
                  </div>
                )}
                {selected.melt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Температура плавления' : 'Melting Point'}</span>
                    <span style={{ fontWeight: 'bold' }}>{selected.melt} K</span>
                  </div>
                )}
                {selected.boil && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Температура кипения' : 'Boiling Point'}</span>
                    <span style={{ fontWeight: 'bold' }}>{selected.boil} K</span>
                  </div>
                )}
                {selected.density && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Плотность' : 'Density'}</span>
                    <span style={{ fontWeight: 'bold' }}>{selected.density} g/cm³</span>
                  </div>
                )}
                {selected.discoverer && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? 'Открыватель' : 'Discovered By'}</span>
                    <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '200px' }}>{selected.discoverer}</span>
                  </div>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setSelected(null)}>{language === 'ru' ? 'Закрыть' : 'Close'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Table Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', position: 'relative' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '30px repeat(18, 1fr)',
            gridTemplateRows: '20px repeat(7, 1fr)',
            gap: '4px',
            minWidth: '700px'
          }}>
            {/* Headers X */}
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={`col-${i}`} style={{ gridColumn: i + 2, gridRow: 1, textAlign: 'center', fontSize: '0.8em', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                {i + 1}
              </div>
            ))}
            {/* Headers Y */}
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`row-${i}`} style={{ gridColumn: 1, gridRow: i + 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8em', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                {i + 1}
              </div>
            ))}

            {elementsData.map((el: any) => (
              <div
                key={el.num}
                onClick={() => setSelected(el)}
                style={{
                  gridColumn: el.col + 1,
                  gridRow: el.row + 1,
                  aspectRatio: '1',
                  background: getColor(el.cat),
                  border: selected?.num === el.num ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                  transform: selected?.num === el.num ? 'scale(1.1)' : 'scale(1)',
                  zIndex: selected?.num === el.num ? 10 : 1,
                  boxShadow: selected?.num === el.num ? '0 0 10px rgba(255,255,255,0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                <div style={{ fontSize: '0.6em', opacity: 0.8, alignSelf: 'flex-start', paddingLeft: '3px', marginTop: '-4px' }}>{el.num}</div>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{el.sym}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px 20px', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--glass-border)', fontSize: '0.8em' }}>
          {Object.entries({
            'alkali metal': 'rgba(244, 67, 54, 0.6)',
            'alkaline earth metal': 'rgba(255, 152, 0, 0.6)',
            'transition metal': 'rgba(63, 81, 181, 0.6)',
            'post-transition metal': 'rgba(0, 150, 136, 0.6)',
            'metalloid': 'rgba(76, 175, 80, 0.6)',
            'nonmetal': 'rgba(33, 150, 243, 0.6)',
            'halogen': 'rgba(0, 188, 212, 0.6)',
            'noble gas': 'rgba(156, 39, 176, 0.6)',
            'lanthanide': 'rgba(121, 85, 72, 0.6)',
            'actinide': 'rgba(96, 125, 139, 0.6)'
          }).map(([key, color]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', background: color, borderRadius: '2px' }}></div>
              <span style={{ color: 'var(--text-muted)' }}>{language === 'ru' ? (categoryRu[key] || key) : key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
