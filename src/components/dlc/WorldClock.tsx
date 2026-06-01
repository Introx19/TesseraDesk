import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Clock as ClockIcon, Globe } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';
import { useWindowSize } from '../../hooks/useWindowSize';

// Timezones will be generated dynamically using Intl API

export default function WorldClock() {
  const { language } = useSettings();
  const { isXs, isSm } = useWindowSize();
  
  const [clocks, setClocks] = useState<{id: string, zone: string, label: string}[]>(() => {
    const saved = localStorage.getItem('tesseradesk-worldclock');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Default: Local Time only
    return [
      { id: 'Local', label: 'Local Time', zone: 'local' }
    ];
  });

  const [time, setTime] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allZones = React.useMemo(() => {
    const zones = Intl.supportedValuesOf('timeZone');
    const now = new Date();
    
    return zones.map(zone => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
        const parts = formatter.formatToParts(now);
        const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || '';
        const offsetString = offsetPart.replace('GMT', 'UTC');
        
        let offsetValue = 0;
        const match = offsetString.match(/UTC([+-]\d{2}):(\d{2})/);
        if (match) {
          const hours = parseInt(match[1], 10);
          const mins = parseInt(match[2], 10);
          offsetValue = hours * 60 + (hours < 0 ? -mins : mins);
        }
        
        return {
          id: zone,
          label: `(${offsetString}) ${zone.replace(/_/g, ' ')}`,
          offsetValue
        };
      } catch (e) {
        return { id: zone, label: zone, offsetValue: 0 };
      }
    }).sort((a, b) => a.offsetValue - b.offsetValue || a.label.localeCompare(b.label));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('tesseradesk-worldclock', JSON.stringify(clocks));
  }, [clocks]);

  const addClock = (zoneObj: { id: string, label: string, zone: string }) => {
    if (!clocks.find(c => c.id === zoneObj.id)) {
      setClocks([...clocks, zoneObj]);
    }
    setShowAdd(false);
  };

  const removeClock = (id: string) => {
    setClocks(clocks.filter(c => c.id !== id));
  };

  const formatTime = (date: Date, zone: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    };
    if (zone !== 'local') {
      options.timeZone = zone;
    }
    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', options).format(date);
  };

  const formatDate = (date: Date, zone: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    };
    if (zone !== 'local') {
      options.timeZone = zone;
    }
    return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', options).format(date);
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: isXs || isSm ? '4px' : undefined }}>
      {!isXs && !isSm && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={24} color="var(--accent)" />
            {t(language as Lang, 'dlc_worldClock_name' as any) || 'World Clock'}
          </h2>
          <button className="win-btn" onClick={() => setShowAdd(!showAdd)} title={t(language as Lang, 'add' as any) || 'Add'}>
            <Plus size={16} />
          </button>
        </div>
      )}

      {showAdd && (
        <div style={{ marginBottom: '15px', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <h3 style={{ marginTop: 0, fontSize: '0.9em', marginBottom: '10px' }}>Add Timezone</h3>
          <input 
            type="text"
            placeholder="Search timezone (e.g. London, UTC+03)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', outline: 'none', marginBottom: '8px' }}
          />
          <div className="custom-scrollbar" style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '6px' }}>
            {'Local Time'.toLowerCase().includes(searchQuery.toLowerCase()) && (
               <button 
                 className="action-btn" 
                 style={{ textAlign: 'left', padding: '8px', fontSize: '0.85em', background: 'transparent', border: 'none', color: clocks.find(c => c.id === 'Local') ? 'var(--text-muted)' : 'var(--text-main)', cursor: clocks.find(c => c.id === 'Local') ? 'not-allowed' : 'pointer' }}
                 disabled={!!clocks.find(c => c.id === 'Local')}
                 onClick={() => { addClock({ id: 'Local', label: 'Local Time', zone: 'local' }); setSearchQuery(''); }}
               >
                 Local Time
               </button>
            )}
            {allZones.filter(z => z.label.toLowerCase().includes(searchQuery.toLowerCase())).map(z => {
               const isDisabled = !!clocks.find(c => c.id === z.id);
               return (
                 <button 
                   key={z.id}
                   className="action-btn" 
                   style={{ textAlign: 'left', padding: '8px', fontSize: '0.85em', background: 'transparent', border: 'none', color: isDisabled ? 'var(--text-muted)' : 'var(--text-main)', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                   disabled={isDisabled}
                   onClick={() => { addClock({ id: z.id, label: z.label, zone: z.id }); setSearchQuery(''); }}
                 >
                   {z.label}
                 </button>
               );
            })}
          </div>
        </div>
      )}

      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {clocks.map(clock => (
          <div key={clock.id} style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ zIndex: 1 }}>
              <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {clock.label}
              </div>
              <div style={{ fontSize: '2em', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '1px' }}>
                {formatTime(time, clock.zone)}
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--accent)', marginTop: '2px' }}>
                {formatDate(time, clock.zone)}
              </div>
            </div>
            
            <ClockIcon size={60} opacity={0.05} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <button 
              className="win-btn close" 
              onClick={() => removeClock(clock.id)}
              style={{ position: 'absolute', right: '10px', top: '10px', width: '28px', height: '28px', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '6px' }}
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {clocks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            No clocks added.
          </div>
        )}
      </div>
    </div>
  );
}
