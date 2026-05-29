import React, { useState, useEffect } from 'react';
import { t, type Lang } from '../../i18n/texts';
import { useSettings } from '../../contexts/SettingsContext';
import { Scale } from 'lucide-react';

type Category = 'length' | 'mass' | 'temp' | 'data' | 'area' | 'speed' | 'volume';

const units = {
  length: {
    m: { name: 'Meters', factor: 1 },
    km: { name: 'Kilometers', factor: 1000 },
    cm: { name: 'Centimeters', factor: 0.01 },
    mm: { name: 'Millimeters', factor: 0.001 },
    in: { name: 'Inches', factor: 0.0254 },
    ft: { name: 'Feet', factor: 0.3048 },
    yd: { name: 'Yards', factor: 0.9144 },
    mi: { name: 'Miles', factor: 1609.344 },
  },
  mass: {
    g: { name: 'Grams', factor: 1 },
    kg: { name: 'Kilograms', factor: 1000 },
    mg: { name: 'Milligrams', factor: 0.001 },
    oz: { name: 'Ounces', factor: 28.3495 },
    lb: { name: 'Pounds', factor: 453.592 },
  },
  temp: {
    c: { name: 'Celsius' },
    f: { name: 'Fahrenheit' },
    k: { name: 'Kelvin' }
  },
  data: {
    b: { name: 'Bytes', factor: 1 },
    kb: { name: 'Kilobytes', factor: 1024 },
    mb: { name: 'Megabytes', factor: 1024**2 },
    gb: { name: 'Gigabytes', factor: 1024**3 },
    tb: { name: 'Terabytes', factor: 1024**4 },
  },
  area: {
    m2: { name: 'Square Meters', factor: 1 },
    km2: { name: 'Square Kilometers', factor: 1000000 },
    cm2: { name: 'Square Centimeters', factor: 0.0001 },
    ha: { name: 'Hectares', factor: 10000 },
    acre: { name: 'Acres', factor: 4046.86 },
    sqft: { name: 'Square Feet', factor: 0.092903 },
  },
  speed: {
    ms: { name: 'Meters / Second', factor: 1 },
    kmh: { name: 'Kilometers / Hour', factor: 1/3.6 },
    mph: { name: 'Miles / Hour', factor: 0.44704 },
    kn: { name: 'Knots', factor: 0.514444 },
  },
  volume: {
    l: { name: 'Liters', factor: 1 },
    ml: { name: 'Milliliters', factor: 0.001 },
    m3: { name: 'Cubic Meters', factor: 1000 },
    gal: { name: 'Gallons (US)', factor: 3.78541 },
    oz: { name: 'Fluid Ounces (US)', factor: 0.0295735 },
  }
};

const convert = (value: number, from: string, to: string, category: Category): number => {
  if (category === 'temp') {
    let c = 0;
    if (from === 'c') c = value;
    else if (from === 'f') c = (value - 32) * 5 / 9;
    else if (from === 'k') c = value - 273.15;
    
    if (to === 'c') return c;
    if (to === 'f') return (c * 9 / 5) + 32;
    if (to === 'k') return c + 273.15;
    return 0;
  }
  
  const catUnits = (units as any)[category];
  if (!catUnits || !catUnits[from] || !catUnits[to]) return 0;
  
  const fromFactor = catUnits[from].factor;
  const toFactor = catUnits[to].factor;
  
  return (value * fromFactor) / toFactor;
};

const Dropdown = ({ value, options, onChange }: { value: string, options: any, onChange: (val: string) => void }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div 
        className="task-input" 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '100%', minHeight: '42px' }}
        onClick={() => setOpen(!open)}
      >
        <span>{options[value]?.name || ''}</span>
        <span style={{ fontSize: '0.8em', color: 'var(--accent)' }}>▼</span>
      </div>
      
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, 
            background: 'var(--bg-main)', border: '1px solid var(--accent)', 
            borderRadius: '8px', marginTop: '5px', zIndex: 100, 
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
                {v.name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Converter: React.FC = () => {
  const { language } = useSettings();
  const [cat, setCat] = useState<Category>('length');
  const [val1, setVal1] = useState<string>('1');
  const [val2, setVal2] = useState<string>('');
  
  const catUnits = Object.keys(units[cat]);
  const [unit1, setUnit1] = useState<string>(catUnits[0]);
  const [unit2, setUnit2] = useState<string>(catUnits[1] || catUnits[0]);
  
  const handleCatChange = (newCat: Category) => {
    setCat(newCat);
    const u = Object.keys(units[newCat]);
    setUnit1(u[0]);
    setUnit2(u[1] || u[0]);
    setVal1('1');
  };
  
  useEffect(() => {
    const num = parseFloat(val1);
    if (!isNaN(num)) {
      const res = convert(num, unit1, unit2, cat);
      setVal2(String(parseFloat(res.toFixed(6))));
    } else {
      setVal2('');
    }
  }, [val1, unit1, unit2, cat]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main)', padding: '20px' }}>
      <h2 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Scale size={24} color="var(--accent)" />
        {t(language as Lang, 'dlc_converter_name')}
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
            type="number" 
            className="task-input" 
            style={{ flex: 1, fontSize: '1.2em' }}
            value={val1}
            onChange={e => setVal1(e.target.value)}
          />
          <Dropdown value={unit1} options={(units as any)[cat]} onChange={setUnit1} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ color: 'var(--accent)', fontSize: '1.5em' }}>=</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
          <input 
            type="text" 
            className="task-input" 
            style={{ flex: 1, fontSize: '1.2em' }}
            value={val2}
            readOnly
          />
          <Dropdown value={unit2} options={(units as any)[cat]} onChange={setUnit2} />
        </div>
      </div>
    </div>
  );
};

export default Converter;
