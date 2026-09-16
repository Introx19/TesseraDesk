import InfoButton from '../InfoButton';
import React, { useState, useEffect } from 'react';
import { t, type Lang } from '../../i18n/texts';
import { ArrowRightLeft } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { Scale, Plus, X } from 'lucide-react';

type Category = 'length' | 'mass' | 'temp' | 'data' | 'area' | 'speed' | 'volume' | 'currency' | 'force';

const units = {
  length: {
    m: { name: { en: 'Meters', ru: 'Метры' }, factor: 1 },
    km: { name: { en: 'Kilometers', ru: 'Километры' }, factor: 1000 },
    cm: { name: { en: 'Centimeters', ru: 'Сантиметры' }, factor: 0.01 },
    mm: { name: { en: 'Millimeters', ru: 'Миллиметры' }, factor: 0.001 },
    in: { name: { en: 'Inches', ru: 'Дюймы' }, factor: 0.0254 },
    ft: { name: { en: 'Feet', ru: 'Футы' }, factor: 0.3048 },
    yd: { name: { en: 'Yards', ru: 'Ярды' }, factor: 0.9144 },
    mi: { name: { en: 'Miles', ru: 'Мили' }, factor: 1609.344 },
    ly: { name: { en: 'Light Years', ru: 'Световые года' }, factor: 9460730472580800 },
  },
  mass: {
    g: { name: { en: 'Grams', ru: 'Граммы' }, factor: 1 },
    kg: { name: { en: 'Kilograms', ru: 'Килограммы' }, factor: 1000 },
    mg: { name: { en: 'Milligrams', ru: 'Миллиграммы' }, factor: 0.001 },
    oz: { name: { en: 'Ounces', ru: 'Унции' }, factor: 28.3495 },
    lb: { name: { en: 'Pounds', ru: 'Фунты' }, factor: 453.592 },
  },
  temp: {
    c: { name: { en: 'Celsius', ru: 'Цельсий' } },
    f: { name: { en: 'Fahrenheit', ru: 'Фаренгейт' } },
    k: { name: { en: 'Kelvin', ru: 'Кельвин' } },
    r: { name: { en: 'Rankine', ru: 'Ранкин' } }
  },
  data: {
    b: { name: { en: 'Bytes', ru: 'Байты' }, factor: 1 },
    kb: { name: { en: 'Kilobytes', ru: 'Килобайты' }, factor: 1024 },
    mb: { name: { en: 'Megabytes', ru: 'Мегабайты' }, factor: 1024**2 },
    gb: { name: { en: 'Gigabytes', ru: 'Гигабайты' }, factor: 1024**3 },
    tb: { name: { en: 'Terabytes', ru: 'Терабайты' }, factor: 1024**4 },
  },
  area: {
    m2: { name: { en: 'Square Meters', ru: 'Квадратные метры' }, factor: 1 },
    km2: { name: { en: 'Square Kilometers', ru: 'Кв. километры' }, factor: 1000000 },
    cm2: { name: { en: 'Square Centimeters', ru: 'Кв. сантиметры' }, factor: 0.0001 },
    ha: { name: { en: 'Hectares', ru: 'Гектары' }, factor: 10000 },
    acre: { name: { en: 'Acres', ru: 'Акры' }, factor: 4046.86 },
    sqft: { name: { en: 'Square Feet', ru: 'Кв. футы' }, factor: 0.092903 },
  },
  speed: {
    ms: { name: { en: 'Meters / Second', ru: 'Метры в секунду' }, factor: 1 },
    kmh: { name: { en: 'Kilometers / Hour', ru: 'Километры в час' }, factor: 1/3.6 },
    mph: { name: { en: 'Miles / Hour', ru: 'Мили в час' }, factor: 0.44704 },
    kn: { name: { en: 'Knots', ru: 'Узлы' }, factor: 0.514444 },
    mach: { name: { en: 'Mach', ru: 'Махи' }, factor: 340.3 },
  },
  volume: {
    l: { name: { en: 'Liters', ru: 'Литры' }, factor: 1 },
    ml: { name: { en: 'Milliliters', ru: 'Миллилитры' }, factor: 0.001 },
    m3: { name: { en: 'Cubic Meters', ru: 'Кубические метры' }, factor: 1000 },
    gal: { name: { en: 'Gallons (US)', ru: 'Галлоны (США)' }, factor: 3.78541 },
    oz: { name: { en: 'Fluid Ounces (US)', ru: 'Жидкие унции' }, factor: 0.0295735 },
  },
  currency: {
    USD: { name: { en: 'US Dollar', ru: 'Доллар США' }, rate: 1 },
    EUR: { name: { en: 'Euro', ru: 'Евро' }, rate: 0.85 },
    CAD: { name: { en: 'Canadian Dollar', ru: 'Канадский доллар' }, rate: 1.37 },
    RUB: { name: { en: 'Russian Ruble', ru: 'Российский рубль' }, rate: 90 },
    BYN: { name: { en: 'Belarusian Ruble', ru: 'Белорусский рубль' }, rate: 3.2 },
    KZT: { name: { en: 'Kazakhstani Tenge', ru: 'Казахстанский тенге' }, rate: 450 },
    UAH: { name: { en: 'Ukrainian Hryvnia', ru: 'Украинская гривна' }, rate: 39 },
    GBP: { name: { en: 'British Pound', ru: 'Фунт стерлингов' }, rate: 0.78 },
    JPY: { name: { en: 'Japanese Yen', ru: 'Японская иена' }, rate: 150 },
    CNY: { name: { en: 'Chinese Yuan', ru: 'Китайский юань' }, rate: 7.2 }
  },
  force: {
    n: { name: { en: 'Newtons', ru: 'Ньютоны' }, factor: 1 },
    kn: { name: { en: 'Kilonewtons', ru: 'Килоньютоны' }, factor: 1000 },
    lbf: { name: { en: 'Pound-force', ru: 'Фунт-сила' }, factor: 4.44822 },
    kgf: { name: { en: 'Kilogram-force', ru: 'Килограмм-сила' }, factor: 9.80665 },
    dyn: { name: { en: 'Dynes', ru: 'Дины' }, factor: 0.00001 }
  }
};

const convert = (value: number, from: string, to: string, category: Category): number => {
  if (category === 'temp') {
    let c = 0;
    if (from === 'c') c = value;
    else if (from === 'f') c = (value - 32) * 5 / 9;
    else if (from === 'k') c = value - 273.15;
    else if (from === 'r') c = (value - 491.67) * 5 / 9;
    
    if (to === 'c') return c;
    if (to === 'f') return (c * 9 / 5) + 32;
    if (to === 'k') return c + 273.15;
    if (to === 'r') return (c + 273.15) * 9 / 5;
    return 0;
  }
  
  if (category === 'currency') {
    const catUnits = (units as any)[category];
    if (!catUnits || !catUnits[from] || !catUnits[to]) return 0;
    const rateFrom = catUnits[from].rate;
    const rateTo = catUnits[to].rate;
    return (value / rateFrom) * rateTo;
  }
  
  const catUnits = (units as any)[category];
  if (!catUnits || !catUnits[from] || !catUnits[to]) return 0;
  
  const fromFactor = catUnits[from].factor;
  const toFactor = catUnits[to].factor;
  
  return (value * fromFactor) / toFactor;
};

const Dropdown = ({ value, options, onChange, lang }: { value: string, options: any, onChange: (val: string) => void, lang: string }) => {
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const handleOpen = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Check if there is enough space below, otherwise open upwards
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 200; // max height of dropdown
      
      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        setCoords({ top: rect.top - menuHeight - 5, left: rect.left, width: rect.width });
      } else {
        setCoords({ top: rect.bottom + 5, left: rect.left, width: rect.width });
      }
    }
    setOpen(true);
  };
  
  return (
    <div style={{ position: 'relative', flex: 1 }} ref={containerRef}>
      <div 
        className="task-input" 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '100%', minHeight: '42px' }}
        onClick={() => open ? setOpen(false) : handleOpen()}
      >
        <span>{options[value]?.name?.[lang as any] || options[value]?.name?.en || ''}</span>
        <span style={{ fontSize: '0.8em', color: 'var(--accent)' }}>▼</span>
      </div>
      
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed', top: coords.top, left: coords.left, width: coords.width,
            background: 'var(--bg-main)', border: '1px solid var(--accent)', 
            borderRadius: '8px', zIndex: 99999, 
            maxHeight: '200px', overflowY: 'auto',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
          }}>
            {Object.entries(options).map(([k, v]: [string, any]) => (
              <div 
                key={k}
                style={{
                  padding: '10px 15px', cursor: 'pointer',
                  background: k === value ? 'var(--accent)' : 'transparent',
                  color: k === value ? '#000' : 'var(--text-main)',
                  fontWeight: k === value ? 'bold' : 'normal'
                }}
                onClick={() => { onChange(k); setOpen(false); }}
                onMouseEnter={(e) => {
                  if (k !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (k !== value) e.currentTarget.style.background = 'transparent';
                }}
              >
                {v.name[lang as any] || v.name.en}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const formatValue = (val: string) => {
  const stripped = val.replace(/,/g, '');
  return stripped.replace(/\b\d+(\.\d+)?\b/g, (match) => {
    const parts = match.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  });
};

const Converter: React.FC = () => {
  const { language } = useSettings();
  const [cat, setCat] = useState<Category>(() => (localStorage.getItem('converter_cat') as Category) || 'length');
  const [val1, setVal1] = useState<string>(() => localStorage.getItem('converter_val1') || '1');
  
  const catUnits = Object.keys(units[cat]);
  const [unit1, setUnit1] = useState<string>(() => {
    const saved = localStorage.getItem('converter_unit1');
    return saved && units[cat][saved as keyof typeof units[typeof cat]] ? saved : catUnits[0];
  });
  
  const [targetUnits, setTargetUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('converter_targetUnits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(u => units[cat][u as keyof typeof units[typeof cat]])) {
          return parsed;
        }
      } catch (e) {}
    }
    return [catUnits[1] || catUnits[0]];
  });
  
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('converter_cat', cat);
    localStorage.setItem('converter_val1', val1);
    localStorage.setItem('converter_unit1', unit1);
    localStorage.setItem('converter_targetUnits', JSON.stringify(targetUnits));
  }, [cat, val1, unit1, targetUnits]);

  const handleSwapUnits = () => {
    const temp = unit1;
    setUnit1(targetUnits[0]);
    setTargetUnits([temp, ...targetUnits.slice(1)]);
  };
  
  useEffect(() => {
    const cached = localStorage.getItem('tessera_rates');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        Object.keys(units.currency).forEach(k => {
          if (data.rates[k]) (units.currency as any)[k].rate = data.rates[k];
        });
        setLastUpdate(new Date(data.time_last_update_unix * 1000).toLocaleDateString());
      } catch (e) {}
    }
    
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          localStorage.setItem('tessera_rates', JSON.stringify(data));
          Object.keys(units.currency).forEach(k => {
            if (data.rates[k]) (units.currency as any)[k].rate = data.rates[k];
          });
          setLastUpdate(new Date(data.time_last_update_unix * 1000).toLocaleDateString());
          if (cat === 'currency') setVal1(v => v + ' '); // trigger re-render
        }
      }).catch(e => console.log('Rates fetch error:', e));
  }, []);
  
  // Clean up trigger re-render hack
  useEffect(() => {
    if (val1.endsWith(' ')) setVal1(val1.trim());
  }, [val1]);
  
  const handleCatChange = (newCat: Category) => {
    setCat(newCat);
    const u = Object.keys(units[newCat]);
    setUnit1(u[0]);
    setTargetUnits([u[1] || u[0]]);
    setVal1('1');
  };
  
  const getConvertedValue = (targetUnit: string) => {
    const num = parseFloat(val1.replace(/,/g, ''));
    if (!isNaN(num)) {
      const res = convert(num, unit1, targetUnit, cat);
      const formattedRes = String(parseFloat(res.toFixed(6)));
      return formatValue(formattedRes);
    }
    return '';
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main)', padding: '20px' }}>
      <h2 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scale size={24} color="var(--accent)" />
          {t(language as Lang, 'dlc_converter_name')}
          <InfoButton text={language === 'ru' ? 'Универсальный конвертер единиц: длина, вес, температура, скорость, валюты и данные.' : 'Universal unit converter: length, weight, temperature, speed, currency, and data.'} />
          
        </div>
        {cat === 'currency' && lastUpdate && (
          <span style={{ fontSize: '0.45em', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            {t(language as Lang, 'rates_updated' as any) || 'Rates:'} {lastUpdate}
          </span>
        )}
      </h2>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '20px' }}>
        {(Object.keys(units) as Category[]).map(c => (
          <button 
            key={c}
            className={`action-btn ${cat === c ? 'active' : 'outline'}`}
            style={{ padding: '5px 10px', fontSize: '0.85em', flex: '1 1 auto' }}
            onClick={() => handleCatChange(c)}
          >
            {t(language as Lang, `cat_${c}` as any)}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
          <input 
            type="text" 
            className="task-input" 
            style={{ flex: 1, fontSize: '1.2em' }}
            value={val1}
            onChange={e => {
              const stripped = e.target.value.replace(/,/g, '');
              if (stripped === '' || /^-?\d*\.?\d*$/.test(stripped)) {
                setVal1(formatValue(e.target.value));
              }
            }}
          />
          <Dropdown value={unit1} options={(units as any)[cat]} onChange={setUnit1} lang={language} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0' }}>
          <button className="icon-btn" onClick={handleSwapUnits} style={{ padding: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--accent)' }} title={t(language as any, 'swapCurrencies') || 'Поменять местами'}>
            <ArrowRightLeft size={18} />
          </button>
        </div>
        
        {targetUnits.map((targetUnit, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            <input 
              type="text" 
              className="task-input" 
              style={{ flex: 1, fontSize: '1.2em' }}
              value={getConvertedValue(targetUnit)}
              readOnly
            />
            <Dropdown 
              value={targetUnit} 
              options={(units as any)[cat]} 
              onChange={(newUnit) => {
                const newTargets = [...targetUnits];
                newTargets[index] = newUnit;
                setTargetUnits(newTargets);
              }} 
              lang={language} 
            />
            {targetUnits.length > 1 && (
              <button 
                className="icon-btn"
                style={{ padding: '0 12px', background: 'rgba(255,0,0,0.1)', color: '#ff4444', borderRadius: '8px' }}
                onClick={() => setTargetUnits(targetUnits.filter((_, i) => i !== index))}
                title="Удалить"
              >
                <X size={18} />
              </button>
            )}
          </div>
        ))}

        {targetUnits.length < 5 && (
          <button 
            className="action-btn outline" 
            style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '5px', borderStyle: 'dashed' }}
            onClick={() => setTargetUnits([...targetUnits, catUnits[1] || catUnits[0]])}
          >
            <Plus size={18} />
            {language === 'ru' ? 'Добавить единицу' : 'Add Unit'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Converter;
