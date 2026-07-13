import { useState, useEffect, useRef } from 'react';
import { evaluate } from 'mathjs';
import { useWindowSize } from '../hooks/useWindowSize';
import { Settings2, History } from 'lucide-react';
import { t, type Lang } from '../i18n/texts';
import { useSettings } from '../contexts/SettingsContext';

export default function Calculator() {
  const { isXs, isSm, width } = useWindowSize();
  const { language } = useSettings();
  const [display, setDisplay] = useState('0');
  const [isScientific, setIsScientific] = useState(() => localStorage.getItem('calc-mode') === 'sci');
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('calc-history') || '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [isRadians, setIsRadians] = useState(() => localStorage.getItem('calc-radians') !== 'false');
  const [justCalculated, setJustCalculated] = useState(false);

  useEffect(() => {
    localStorage.setItem('calc-mode', isScientific ? 'sci' : 'std');
  }, [isScientific]);

  useEffect(() => {
    localStorage.setItem('calc-radians', String(isRadians));
  }, [isRadians]);

  useEffect(() => {
    localStorage.setItem('calc-history', JSON.stringify(history));
  }, [history]);

  const inputRef = useRef<HTMLInputElement>(null);

  const appendNum = (num: string) => {
    setDisplay(prev => {
      if (justCalculated) {
        setJustCalculated(false);
        const isOperator = ['/', '*', '-', '+', '^'].includes(num);
        if (isOperator) {
           const newStr = prev + num;
           setTimeout(() => {
             inputRef.current?.setSelectionRange(newStr.length, newStr.length);
             inputRef.current?.focus();
           }, 0);
           return newStr;
        } else {
           setTimeout(() => {
             inputRef.current?.setSelectionRange(num.length, num.length);
             inputRef.current?.focus();
           }, 0);
           return num;
        }
      }
      if (prev === '0' || prev === 'Error') {
        setTimeout(() => {
           inputRef.current?.setSelectionRange(num.length, num.length);
           inputRef.current?.focus();
        }, 0);
        return num;
      }
      const input = inputRef.current;
      if (input && input.selectionStart !== null) {
        const start = input.selectionStart;
        const end = input.selectionEnd || start;
        const newStr = prev.slice(0, start) + num + prev.slice(end);
        setTimeout(() => {
          input.setSelectionRange(start + num.length, start + num.length);
          input.focus();
        }, 0);
        return newStr;
      }
      return prev + num;
    });
  };

  const calculate = () => {
    try {
      if (!display.trim()) return;
      
      let expr = display;
      expr = expr.replace(/√/g, 'sqrt');
      expr = expr.replace(/π/g, 'pi');
      expr = expr.replace(/h/g, '(6.62607015e-34)');
      expr = expr.replace(/c/g, '(299792458)');
      
      let scope: any = {};
      if (!isRadians) {
        scope = {
          sin: (x: any) => Math.sin(Number(x) * Math.PI / 180),
          cos: (x: any) => Math.cos(Number(x) * Math.PI / 180),
          tan: (x: any) => Math.tan(Number(x) * Math.PI / 180),
          asin: (x: any) => Math.asin(Number(x)) * 180 / Math.PI,
          acos: (x: any) => Math.acos(Number(x)) * 180 / Math.PI,
          atan: (x: any) => Math.atan(Number(x)) * 180 / Math.PI
        };
      }

      const result = String(evaluate(expr, scope));
      setHistory(prev => {
        const newHist = [`${display} = ${result}`, ...prev].slice(0, 10);
        return newHist;
      });
      setDisplay(result);
      setJustCalculated(true);
      setTimeout(() => {
        inputRef.current?.setSelectionRange(result.length, result.length);
        inputRef.current?.focus();
      }, 0);
    } catch {
      setDisplay('Error');
    }
  };

  const clear = () => setDisplay('0');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем хоткеи если фокус в инпуте
      if (document.activeElement?.tagName === 'INPUT') return;

      const validKeys = ['0','1','2','3','4','5','6','7','8','9','/','*','-','+','.','(',')','^'];
      if (validKeys.includes(e.key)) {
        appendNum(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        clear();
      } else if (e.key === 'Backspace') {
        setDisplay(prev => {
          if (prev === 'Error') return '0';
          const input = inputRef.current;
          if (input && input.selectionStart !== null && input.selectionStart > 0) {
            const start = input.selectionStart;
            const end = input.selectionEnd || start;
            if (start === end) {
              const newStr = prev.slice(0, start - 1) + prev.slice(end);
              setTimeout(() => {
                input.setSelectionRange(start - 1, start - 1);
                input.focus();
              }, 0);
              return newStr || '0';
            } else {
              const newStr = prev.slice(0, start) + prev.slice(end);
              setTimeout(() => {
                input.setSelectionRange(start, start);
                input.focus();
              }, 0);
              return newStr || '0';
            }
          }
          return prev.length > 1 ? prev.slice(0, -1) : '0';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fontSize = Math.max(1.2, Math.min(2, width * 0.06)) + 'rem';

  if (isXs) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '8px' }}>
        <div style={{ fontSize: fontSize, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)', textAlign: 'right', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {display}
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ width: '100%', height: '100%', margin: '0 auto', gap: isSm ? '6px' : '15px', padding: isSm ? '4px' : undefined, display: 'flex', flexDirection: 'column' }}>
      {!isSm && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t(language as Lang, 'calc')}</h2>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              className={`btn ${showHistory ? 'btn-primary' : ''}`}
              title={language === 'ru' ? 'История' : 'History'}
              onClick={() => setShowHistory(!showHistory)}
              style={{ padding: '6px' }}
            >
              <History size={16} />
            </button>
            {isScientific && (
              <button 
                className="btn"
                onClick={() => setIsRadians(!isRadians)}
                style={{ padding: '6px 10px', fontSize: '0.8em', fontWeight: 'bold' }}
              >
                {isRadians ? 'RAD' : 'DEG'}
              </button>
            )}
            <button 
              className={`btn ${isScientific ? 'btn-primary' : ''}`}
              title={t(language as Lang, 'scientificMode')}
              onClick={() => setIsScientific(!isScientific)}
              style={{ padding: '6px' }}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      )}

      <div style={{ 
        background: 'var(--bg-card)', 
        padding: isSm ? '8px' : '15px', 
        borderRadius: '8px', 
        marginBottom: isSm ? '4px' : '10px',
        display: 'flex'
      }}>
        <input
          ref={inputRef}
          type="text"
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
          onKeyDown={(e) => {
             if (e.key === 'Enter') {
               e.preventDefault();
               calculate();
             }
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            textAlign: 'right',
            fontSize: fontSize,
            color: 'var(--accent)',
            fontFamily: 'monospace',
            fontWeight: 700,
            outline: 'none'
          }}
        />
      </div>

      {showHistory ? (
        <div className="custom-scrollbar" style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '8px', padding: '10px', overflowY: 'auto' }}>
          {history.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>{language === 'ru' ? 'История пуста' : 'History is empty'}</div>}
          {history.map((item, i) => (
            <div key={i} style={{ padding: '8px 5px', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', justifyContent: 'flex-end', fontFamily: 'monospace', fontSize: '1.1em' }} onClick={() => {
              setDisplay(item.split(' = ')[1]);
              setShowHistory(false);
            }}>
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          {/* Scientific panel */}
        {isScientific && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isSm ? '4px' : '8px', flex: 1 }}>
            {[
              { label: '(', val: '(' }, { label: ')', val: ')' },
              { label: 'x²', val: '^2' }, { label: 'x³', val: '^3' },
              { label: '√', val: '√(' }, { label: '∛', val: 'cbrt(' },
              { label: '^', val: '^' }, { label: 'π', val: 'π' },
              { label: 'sin', val: 'sin(' }, { label: 'cos', val: 'cos(' },
              { label: 'tan', val: 'tan(' }, { label: 'e', val: 'e' },
              { label: 'h', val: 'h' }, // Постоянная планка
              { label: 'c', val: 'c' } // Скорость света
            ].map(btn => (
              <button 
                key={btn.label} 
                className="btn" 
                style={{ padding: '0', fontSize: '0.9em', background: 'var(--bg-card)', width: '100%', height: '100%' }} 
                onClick={() => appendNum(btn.val)}
                title={btn.label === 'h' ? 'Постоянная Планка' : btn.label === 'c' ? 'Скорость света' : undefined}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isSm ? '4px' : '8px', flex: isScientific ? 2 : 1 }}>
          {['C', '(', ')', '←'].map(btn => (
            <button key={btn} className={`btn ${btn === 'C' || btn === '←' ? 'btn-primary' : ''}`} style={{ padding: '0', width: '100%', height: '100%', fontSize: '1.2em' }} onClick={() => {
              if (btn === 'C') clear();
              else if (btn === '←') {
                setDisplay(prev => {
                  if (prev === 'Error') return '0';
                  const input = inputRef.current;
                  if (input && input.selectionStart !== null && input.selectionStart > 0) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd || start;
                    if (start === end) {
                      const newStr = prev.slice(0, start - 1) + prev.slice(end);
                      setTimeout(() => { input.setSelectionRange(start - 1, start - 1); input.focus(); }, 0);
                      return newStr || '0';
                    } else {
                      const newStr = prev.slice(0, start) + prev.slice(end);
                      setTimeout(() => { input.setSelectionRange(start, start); input.focus(); }, 0);
                      return newStr || '0';
                    }
                  }
                  return prev.length > 1 ? prev.slice(0, -1) : '0';
                });
              }
              else appendNum(btn);
            }}>{btn}</button>
          ))}
          {['7', '8', '9', '/'].map(btn => <button key={btn} className="btn" style={{ padding: '0', width: '100%', height: '100%', fontSize: '1.2em' }} onClick={() => appendNum(btn)}>{btn}</button>)}
          {['4', '5', '6', '*'].map(btn => <button key={btn} className="btn" style={{ padding: '0', width: '100%', height: '100%', fontSize: '1.2em' }} onClick={() => appendNum(btn)}>{btn}</button>)}
          {['1', '2', '3', '-'].map(btn => <button key={btn} className="btn" style={{ padding: '0', width: '100%', height: '100%', fontSize: '1.2em' }} onClick={() => appendNum(btn)}>{btn}</button>)}
          {['0', '.', '=', '+'].map(btn => (
            <button key={btn} className={`btn ${btn === '=' ? 'btn-primary' : ''}`} style={{ padding: '0', width: '100%', height: '100%', fontSize: '1.2em' }} onClick={() => {
               if (btn === '=') calculate();
               else appendNum(btn);
            }}>{btn}</button>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
