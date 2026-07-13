import { useState, useRef } from 'react';
import { Play, Copy } from 'lucide-react';
import nerdamer from 'nerdamer';
import 'nerdamer/Algebra';
import 'nerdamer/Calculus';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';

export default function Integrals() {
  const { language } = useSettings();
  const [expr, setExpr] = useState('');
  const [variable, setVariable] = useState('x');
  const [lowerBound, setLowerBound] = useState('');
  const [upperBound, setUpperBound] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const calculateInt = () => {
    if (!expr.trim()) return;
    try {
      setError(null);
      
      // Basic pre-processing to allow missing brackets
      let safeExpr = expr;
      safeExpr = safeExpr.replace(/√(\d+|\w+)/g, 'sqrt($1)');
      safeExpr = safeExpr.replace(/π/g, 'pi');
      
      // Calculate integral
      let res;
      if (lowerBound && upperBound) {
         res = nerdamer(`defint(${safeExpr}, ${lowerBound}, ${upperBound}, ${variable})`).text();
      } else {
         res = nerdamer(`integrate(${safeExpr}, ${variable})`).text();
         res += ' + C';
      }
      setResult(res);
    } catch (e: any) {
      setError('Error parsing or integrating. Check syntax.');
      setResult(null);
    }
  };

  const handleExpand = () => {
    if (!expr.trim()) return;
    try {
      setError(null);
      let safeExpr = expr;
      safeExpr = safeExpr.replace(/√(\d+|\w+)/g, 'sqrt($1)');
      safeExpr = safeExpr.replace(/π/g, 'pi');
      
      const res = nerdamer(`expand(${safeExpr})`).text();
      setResult(res);
    } catch (e: any) {
      setError('Error expanding. Check syntax.');
      setResult(null);
    }
  };

  const handleDerivative = () => {
    if (!expr.trim()) return;
    try {
      setError(null);
      let safeExpr = expr;
      safeExpr = safeExpr.replace(/√(\d+|\w+)/g, 'sqrt($1)');
      safeExpr = safeExpr.replace(/π/g, 'pi');
      
      const res = nerdamer(`diff(${safeExpr}, ${variable})`).text();
      setResult(res);
    } catch (e: any) {
      setError('Error differentiating. Check syntax.');
      setResult(null);
    }
  };

  const insertText = (text: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const val = inputRef.current.value;
      const newValue = val.substring(0, start) + text + val.substring(end);
      setExpr(newValue);
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursor = start + text.length;
          if (text.includes('()')) {
            inputRef.current.setSelectionRange(newCursor - 1, newCursor - 1);
          } else {
            inputRef.current.setSelectionRange(newCursor, newCursor);
          }
        }
      }, 10);
    } else {
      setExpr(prev => prev + text);
    }
  };

  // Allow enter to solve
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      calculateInt();
    }
  };

  const copyRes = () => {
    if (result) navigator.clipboard.writeText(result);
  };

  return (
    <div className="panel" style={{ height: '100%', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h2 style={{ margin: '0', color: 'var(--text-main)', fontSize: '1.2em' }}>{t(language as Lang, 'integralsTitle')}</h2>
      <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t(language as Lang, 'integralsDesc')}</p>
      
      <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('()')}>( )</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('^')}>xⁿ</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('√()')}>√</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('sin()')}>sin</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('cos()')}>cos</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('tan()')}>tan</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('log()')}>ln</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('π')}>π</button>
          <button className="win-btn" style={{ padding: '4px 10px' }} onClick={() => insertText('e')}>e</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: '5px' }}>
            <input 
              type="text" 
              value={upperBound} 
              onChange={e => setUpperBound(e.target.value)} 
              style={{ width: '30px', textAlign: 'center', padding: '0', fontFamily: 'monospace', fontSize: '0.85em', color: 'var(--text-main)', marginBottom: '-5px', zIndex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', outline: 'none' }}
            />
            <div style={{ fontSize: '2.5em', fontWeight: 300, color: 'var(--accent)', lineHeight: '0.8' }}>∫</div>
            <input 
              type="text" 
              value={lowerBound} 
              onChange={e => setLowerBound(e.target.value)} 
              style={{ width: '30px', textAlign: 'center', padding: '0', fontFamily: 'monospace', fontSize: '0.85em', color: 'var(--text-main)', marginTop: '-5px', zIndex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', outline: 'none' }}
            />
          </div>
          
          <input 
            ref={inputRef}
            type="text" 
            className="input"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(language as Lang, 'integralsEg')}
            style={{ flex: 1, fontFamily: 'monospace', fontSize: '1.1em' }}
            autoFocus
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent)', fontWeight: 'bold' }}>
            d<input 
               type="text" 
               className="input" 
               value={variable} 
               onChange={e => setVariable(e.target.value.substring(0, 3))} // Max 3 chars
               style={{ width: '40px', textAlign: 'center', padding: '5px', marginLeft: '2px', fontFamily: 'monospace' }}
            />
          </div>
          
          <button className="btn btn-primary" style={{ padding: '8px 12px', fontWeight: 'bold' }} onClick={calculateInt} title="Integrate">
            ∫ dx
          </button>
          <button className="btn" style={{ padding: '8px 12px', fontWeight: 'bold' }} onClick={handleDerivative} title="Derivative">
            d/dx
          </button>
          <button className="btn" style={{ padding: '8px 12px', fontWeight: 'bold' }} onClick={handleExpand} title="Expand Expression">
            Expand
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9em' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>{t(language as Lang, 'integralsResult')}</div>
          <div style={{ 
            background: 'var(--bg-main)', 
            border: '1px solid var(--accent)', 
            padding: '20px', 
            borderRadius: '12px',
            fontSize: '1.2em',
            fontFamily: 'monospace',
            color: 'var(--text-main)',
            position: 'relative',
            overflowX: 'auto'
          }} className="custom-scrollbar">
            {result}
            <button className="win-btn" onClick={copyRes} style={{ position: 'absolute', right: '10px', top: '10px' }} title={t(language as Lang, 'copy')}>
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
