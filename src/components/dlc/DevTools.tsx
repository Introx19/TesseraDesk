import { useState, useEffect } from 'react';
import { useWindowSize } from '../../hooks/useWindowSize';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';
import { Code, Trash2, Check, Copy, RefreshCw, XCircle, Pipette, ChevronDown, ChevronRight } from 'lucide-react';

export default function DevTools() {
  const { isSm } = useWindowSize();
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState<'text' | 'port' | 'regex' | 'color' | 'snippets'>('text');

  // Text/JSON state
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [textError, setTextError] = useState('');

  // Port Killer state
  const [portInput, setPortInput] = useState('');
  const [portStatus, setPortStatus] = useState<{success: boolean, msg: string} | null>(null);

  // Regex state
  const [regexPattern, setRegexPattern] = useState('');
  const [regexFlags, setRegexFlags] = useState('gm');
  const [regexTestStr, setRegexTestStr] = useState('');
  const [regexResult, setRegexResult] = useState<{match: string, index: number}[]>([]);

  // Color state
  const [colorInput, setColorInput] = useState('#00ffcc');
  const [copiedColor, setCopiedColor] = useState('');

  // Snippets state
  const [snippets, setSnippets] = useState<{id: string, title: string, content: string}[]>([]);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetContent, setNewSnippetContent] = useState('');
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('td-snippets-expanded') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const saved = localStorage.getItem('td-snippets');
    if (saved) {
      try { setSnippets(JSON.parse(saved)); } catch (e) {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('td-snippets-expanded', JSON.stringify(expandedSnippets));
  }, [expandedSnippets]);

  const saveSnippets = (data: any) => {
    setSnippets(data);
    localStorage.setItem('td-snippets', JSON.stringify(data));
  };

  const handleCopy = (text: string, type: string = '') => {
    navigator.clipboard.writeText(text);
    setCopiedColor(type);
    setTimeout(() => setCopiedColor(''), 1500);
  };

  // Text Functions
  const formatJson = () => {
    try {
      const parsed = JSON.parse(textInput);
      setTextOutput(JSON.stringify(parsed, null, 2));
      setTextError('');
    } catch (e: any) {
      setTextError(e.message);
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(textInput);
      setTextOutput(JSON.stringify(parsed));
      setTextError('');
    } catch (e: any) {
      setTextError(e.message);
    }
  };

  const encodeB64 = () => {
    try {
      setTextOutput(btoa(unescape(encodeURIComponent(textInput))));
      setTextError('');
    } catch (e: any) {
      setTextError(e.message);
    }
  };

  const decodeB64 = () => {
    try {
      setTextOutput(decodeURIComponent(escape(atob(textInput))));
      setTextError('');
    } catch (e: any) {
      setTextError(e.message);
    }
  };

  // Port Killer
  const killPort = async () => {
    if (!portInput || !window.electronAPI?.killPort) return;
    setPortStatus(null);
    try {
      const p = parseInt(portInput);
      if (isNaN(p)) return;
      const res = await window.electronAPI.killPort(p);
      setPortStatus({ success: res.success, msg: res.message });
    } catch (e: any) {
      setPortStatus({ success: false, msg: e.message });
    }
  };

  // Regex Tester
  useEffect(() => {
    if (!regexPattern) {
      setRegexResult([]);
      return;
    }
    try {
      const re = new RegExp(regexPattern, regexFlags);
      const matches = [];
      let m;
      if (re.global) {
        while ((m = re.exec(regexTestStr)) !== null) {
          matches.push({ match: m[0], index: m.index });
        }
      } else {
        m = re.exec(regexTestStr);
        if (m) matches.push({ match: m[0], index: m.index });
      }
      setRegexResult(matches);
    } catch (e) {
      setRegexResult([]);
    }
  }, [regexPattern, regexFlags, regexTestStr]);

  // Color Converters
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '';
  };
  
  const hexToHsl = (hex: string) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '';
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
  };

  const pickColor = async () => {
    if (!('EyeDropper' in window)) return;
    
    const originalOpacity = document.body.style.opacity;
    const originalPointer = document.body.style.pointerEvents;
    
    document.body.style.opacity = '0';
    document.body.style.pointerEvents = 'none';
    
    // Expand window across full display synchronously to retain user gesture
    window.electronAPI?.expandForPicker();
    
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      setColorInput(result.sRGBHex);
    } catch (e) {
      // user canceled or error
    } finally {
      document.body.style.opacity = originalOpacity;
      document.body.style.pointerEvents = originalPointer;
      window.electronAPI?.restoreFromPicker();
    }
  };

  return (
    <div className="panel" style={{ height: '100%', padding: '0', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {!isSm && <h2 style={{ padding: '15px 20px 0', margin: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>{t(language as Lang, 'dlc_devTools_name' as any)}</h2>}
      
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
        {[
          { id: 'text', label: t(language as Lang, 'devTools_jsonTitle' as any) },
          { id: 'port', label: t(language as Lang, 'devTools_portsTitle' as any) },
          { id: 'regex', label: t(language as Lang, 'devTools_regexTitle' as any) },
          { id: 'color', label: t(language as Lang, 'devTools_colorTitle' as any) },
          { id: 'snippets', label: t(language as Lang, 'devTools_snippetsTitle' as any) }
        ].map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 15px',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-main)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        
        {/* TEXT & JSON TAB */}
        {activeTab === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: '100%' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn" onClick={formatJson}>{t(language as Lang, 'devTools_formatJson' as any)}</button>
              <button className="btn" onClick={minifyJson}>{t(language as Lang, 'devTools_minifyJson' as any)}</button>
              <button className="btn" onClick={encodeB64}>{t(language as Lang, 'devTools_encodeB64' as any)}</button>
              <button className="btn" onClick={decodeB64}>{t(language as Lang, 'devTools_decodeB64' as any)}</button>
            </div>
            {textError && <div style={{ color: '#ff5252', fontSize: '0.9em', padding: '10px', background: 'rgba(255,82,82,0.1)', borderRadius: '6px' }}>{textError}</div>}
            
            <div style={{ display: 'flex', flex: 1, gap: '15px', minHeight: '300px', flexDirection: isSm ? 'column' : 'row' }}>
              <textarea 
                className="task-input" 
                placeholder="Input..." 
                value={textInput} 
                onChange={e => setTextInput(e.target.value)}
                style={{ flex: 1, resize: 'none', fontFamily: 'monospace', minHeight: '150px' }}
                spellCheck={false}
              />
              <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <textarea 
                  className="task-input" 
                  placeholder="Output..." 
                  value={textOutput} 
                  readOnly
                  style={{ flex: 1, resize: 'none', fontFamily: 'monospace', background: 'var(--bg-card)', opacity: 0.8, minHeight: '150px' }}
                  spellCheck={false}
                />
                <button 
                  className="icon-btn" 
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--bg-card)', padding: '5px' }}
                  onClick={() => handleCopy(textOutput, 'output')}
                  title="Copy"
                >
                  {copiedColor === 'output' ? <Check size={16} color="var(--accent)"/> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PORT KILLER TAB */}
        {activeTab === 'port' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <RefreshCw size={48} color="var(--accent)" style={{ marginBottom: '15px' }} />
              <h3>{t(language as Lang, 'devTools_portsTitle' as any)}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: '20px' }}>
                {language === 'ru' ? 'Введите номер порта (например, 3000 или 5173), чтобы принудительно завершить процесс, который его занимает.' : 'Enter a port number (e.g. 3000 or 5173) to forcefully terminate the process using it.'}
              </p>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <input 
                  type="number" 
                  className="task-input" 
                  placeholder="3000" 
                  value={portInput}
                  onChange={e => setPortInput(e.target.value)}
                  style={{ width: '120px', textAlign: 'center', fontSize: '1.2em' }}
                  onKeyDown={e => e.key === 'Enter' && killPort()}
                />
                <button className="btn" onClick={killPort} style={{ background: 'var(--accent)', color: '#000', fontWeight: 'bold' }}>
                  {t(language as Lang, 'devTools_killPort' as any)}
                </button>
              </div>

              {portStatus && (
                <div style={{ 
                  marginTop: '20px', padding: '15px', borderRadius: '8px',
                  background: portStatus.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                  color: portStatus.success ? '#4CAF50' : '#F44336',
                  border: `1px solid ${portStatus.success ? '#4CAF50' : '#F44336'}`,
                  display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center'
                }}>
                  {portStatus.success ? <Check size={20} /> : <XCircle size={20} />}
                  <span>{portStatus.msg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGEX TAB */}
        {activeTab === 'regex' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                className="task-input" 
                value={regexPattern} 
                onChange={e => setRegexPattern(e.target.value)}
                placeholder={t(language as Lang, 'devTools_regexPattern' as any)}
                style={{ flex: 2, fontFamily: 'monospace' }}
              />
              <input 
                className="task-input" 
                value={regexFlags} 
                onChange={e => setRegexFlags(e.target.value)}
                placeholder={t(language as Lang, 'devTools_regexFlags' as any)}
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
            </div>
            
            <textarea 
              className="task-input" 
              value={regexTestStr} 
              onChange={e => setRegexTestStr(e.target.value)}
              placeholder={t(language as Lang, 'devTools_testString' as any)}
              style={{ minHeight: '100px', resize: 'vertical' }}
            />
            
            <div style={{ background: 'var(--bg-card)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ marginTop: 0 }}>Matches ({regexResult.length})</h4>
              {regexResult.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {regexResult.map((m, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em' }}>
                      <span style={{ color: 'var(--accent)' }}>[{m.index}]</span> {m.match}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>No matches found.</div>
              )}
            </div>
          </div>
        )}

        {/* COLOR TAB */}
        {activeTab === 'color' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', height: '100%' }}>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--glass-border)' }}>
                  <input 
                    type="color" 
                    value={colorInput} 
                    onChange={e => setColorInput(e.target.value)}
                    style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', padding: 0, border: 'none', cursor: 'pointer', outline: 'none', background: 'transparent' }}
                  />
                </div>
                {'EyeDropper' in window && (
                  <button className="btn" onClick={pickColor} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Pipette size={16} /> Pick from Screen
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '250px' }}>
                {[
                  { label: 'HEX', val: colorInput },
                  { label: 'RGB', val: hexToRgb(colorInput) },
                  { label: 'HSL', val: hexToHsl(colorInput) }
                ].map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: 'bold' }}>{c.label}</div>
                    <div style={{ flex: 1, background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', border: '1px solid var(--glass-border)' }}>
                      {c.val}
                    </div>
                    <button className="icon-btn" onClick={() => handleCopy(c.val, c.label)} title="Copy">
                      {copiedColor === c.label ? <Check size={18} color="var(--accent)"/> : <Copy size={18} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '20px', width: '100%', maxWidth: '500px' }}>
              <div style={{ flex: 1, background: '#fff', color: colorInput, padding: '20px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
                Text on Light
              </div>
              <div style={{ flex: 1, background: '#000', color: colorInput, padding: '20px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
                Text on Dark
              </div>
            </div>
          </div>
        )}

        {/* SNIPPETS TAB */}
        {activeTab === 'snippets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: '100%' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                className="task-input" 
                placeholder={t(language as Lang, 'devTools_snippetTitle' as any)} 
                value={newSnippetTitle} 
                onChange={e => setNewSnippetTitle(e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                className="btn" 
                onClick={() => {
                  if (newSnippetTitle && newSnippetContent) {
                    saveSnippets([...snippets, { id: Date.now().toString(), title: newSnippetTitle, content: newSnippetContent }]);
                    setNewSnippetTitle('');
                    setNewSnippetContent('');
                  }
                }}
              >
                {t(language as Lang, 'devTools_snippetAdd' as any)}
              </button>
            </div>
            <textarea 
              className="task-input" 
              placeholder={t(language as Lang, 'devTools_snippetContent' as any)}
              value={newSnippetContent} 
              onChange={e => setNewSnippetContent(e.target.value)}
              style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'monospace' }}
            />
            
            <div style={{ borderTop: '1px solid var(--glass-border)', margin: '10px 0' }}></div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {snippets.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No snippets yet.</div>}
              {snippets.map(snip => {
                const isExpanded = expandedSnippets[snip.id] === true;
                return (
                <div key={snip.id} style={{ flexShrink: 0, background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 15px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid var(--glass-border)' : 'none' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Code size={16} color="var(--accent)"/> {snip.title}</strong>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="icon-btn" onClick={() => handleCopy(snip.content, snip.id)} title="Copy">
                        {copiedColor === snip.id ? <Check size={16} color="var(--accent)"/> : <Copy size={16} />}
                      </button>
                      <button className="icon-btn" onClick={() => setExpandedSnippets(prev => ({...prev, [snip.id]: !isExpanded}))} title="Toggle">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <button className="icon-btn" onClick={() => saveSnippets(snippets.filter(s => s.id !== snip.id))} title="Delete" style={{ color: '#ff5252' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '15px', fontFamily: 'monospace', fontSize: '0.9em', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                      {snip.content}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
