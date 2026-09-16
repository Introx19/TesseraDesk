import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

export default function Dropdown({ options, value, onChange, style }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          padding: '10px 12px',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 1px var(--accent)' : 'none'
        }}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            transition: 'transform 0.2s', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.6
          }} 
        />
      </div>

      {isOpen && (
        <div 
          className="custom-scrollbar"
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 9999,
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            padding: '5px'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: opt.value === value ? 'var(--accent)' : 'transparent',
                color: opt.value === value ? '#000' : 'var(--text-main)',
                fontWeight: opt.value === value ? 'bold' : 'normal',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = 'transparent';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
