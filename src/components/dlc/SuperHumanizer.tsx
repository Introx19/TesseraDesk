import { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { 
  Settings, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, 
  Copy, Check, Globe, FileText, Bot, 
  EyeOff, Key, Play, ExternalLink, X, HelpCircle, Scale
} from 'lucide-react';
import Markdown from 'react-markdown';
import InfoButton from '../InfoButton';
import Dropdown from '../ui/Dropdown';
import Notes from '../Notes'; // THE REAL NOTES COMPONENT FOR DISGUISE
import { t } from '../../i18n/texts';

const MAX_SAFE_WORDS = 3000; // API token safety limit
const SH_VERSION = '1.0.0';
const EULA_KEY = 'sh_eula_accepted';

const SuperHumanizer = () => {
  const [text, setText] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  
  const { geminiApiKey, geminiModel, superHumanizerLanguage, panicHotkey: globalPanicHotkey, updateSettings } = useSettings();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);

  const [apiKey, setApiKey] = useState(geminiApiKey || '');
  const [model, setModel] = useState(geminiModel || 'gemini-3.6-flash');
  const [language, setLanguage] = useState<'ru' | 'en'>(superHumanizerLanguage || 'ru');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [style, setStyle] = useState('Stealth');
  const [instructions, setInstructions] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [leftTab, setLeftTab] = useState<'text' | 'analysis'>('text');
  const [strictLength, setStrictLength] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);
  
  const [isDisguised, setIsDisguised] = useState(false);
  const [panicHotkey, setPanicHotkey] = useState(globalPanicHotkey || 'F9');
  const [recordingHotkey, setRecordingHotkey] = useState(false);
  const [wordDiff, setWordDiff] = useState<number | null>(null);
  const [inputError, setInputError] = useState('');
  const [eulaAccepted, setEulaAccepted] = useState(() => !!localStorage.getItem(EULA_KEY));

  useEffect(() => {
    if (isDisguised) {
      document.title = 'Tessera Desk — Заметки';
    } else {
      document.title = 'Super Humanizer — AI Text Detector & Studio';
    }
  }, [isDisguised]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (recordingHotkey) {
        e.preventDefault();
        e.stopPropagation();
        
        let combo = '';
        if (e.ctrlKey) combo += 'Ctrl+';
        if (e.altKey) combo += 'Alt+';
        if (e.shiftKey) combo += 'Shift+';
        
        let keyName = e.key;
        if (keyName === 'Control' || keyName === 'Alt' || keyName === 'Shift') return;
        if (keyName === ' ') keyName = 'Space';
        else if (keyName.length === 1) keyName = keyName.toUpperCase();
        
        combo += keyName;
        setPanicHotkey(combo);
        setRecordingHotkey(false);
        return;
      }

      let pressed = '';
      if (e.ctrlKey) pressed += 'Ctrl+';
      if (e.altKey) pressed += 'Alt+';
      if (e.shiftKey) pressed += 'Shift+';
      
      let keyName = e.key;
      if (keyName.length === 1) keyName = keyName.toUpperCase();
      pressed += keyName;

      if (pressed.toLowerCase() === panicHotkey.toLowerCase() || e.key.toLowerCase() === panicHotkey.toLowerCase()) {
        e.preventDefault();
        // Don't enter disguise mode if window is too small (mini mode)
        const winHeight = window.innerHeight;
        if (!isDisguised && winHeight < 200) return;
        setIsDisguised(prev => !prev);
        return;
      }

      if (e.key === 'Escape' && isDisguised) {
        e.preventDefault();
        setIsDisguised(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingHotkey, panicHotkey, isDisguised]);

  const saveSettings = async () => {
    updateSettings({ geminiApiKey: apiKey, geminiModel: model, superHumanizerLanguage: language, panicHotkey });
    setShowSettings(false);
  };

  const handleOpenAiStudio = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal('https://ai.google.dev/gemini-api/docs/api-key?authuser=1');
    } else {
      window.open('https://ai.google.dev/gemini-api/docs/api-key?authuser=1', '_blank');
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setInputError('Введите текст для анализа');
      return;
    }
    if (!geminiApiKey) {
      setInputError('Сначала добавьте API ключ Gemini в настройках (иконка ⚙️ вверху)');
      return;
    }
    setInputError('');
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      const res = await window.electronAPI.analyzeText({ text, context, useWebSearch });
      if (res.error) {
        setAnalysisResult('❌ ' + res.error);
      } else {
        setAnalysisResult(res.result || '');
      }
    } catch (e: any) {
      setAnalysisResult('❌ Ошибка при анализе. Проверьте API ключ и подключение к интернету.');
    }
    setIsAnalyzing(false);
  };

  const handleHumanize = async () => {
    if (!text.trim()) {
      setInputError('Введите текст для очеловечивания');
      return;
    }
    if (!geminiApiKey) {
      setInputError(t(superHumanizerLanguage || 'ru', 'shErrorKey'));
      return;
    }
    const wc = wordCount(text);
    if (wc > MAX_SAFE_WORDS) {
      setInputError(t(superHumanizerLanguage || 'ru', 'shErrorLength').replace('{count}', wc.toString()).replace('{max}', MAX_SAFE_WORDS.toString()));
      // Still allow proceeding — just a warning shown
    } else {
      setInputError('');
    }
    setIsHumanizing(true);
    setWordDiff(null);
    try {
      const res = await window.electronAPI.humanizeText({ 
        text, 
        style, 
        additionalInstructions: instructions,
        context,
        useWebSearch,
        strictLength
      });
      if (res.error) {
        setResult(t(superHumanizerLanguage || 'ru', 'shErrorPrefix') + res.error);
      } else {
        const resultText = res.result || '';
        setResult(resultText);
        // Show word count difference
        const originalWc = wordCount(text);
        const resultWc = wordCount(resultText);
        setWordDiff(resultWc - originalWc);
      }
    } catch (e: any) {
      setResult(t(superHumanizerLanguage || 'ru', 'shErrorGeneral'));
    }
    setIsHumanizing(false);
  };

  const handleCopy = (strToCopy: string) => {
    if (!strToCopy) return;
    navigator.clipboard.writeText(strToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAnalysis = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopiedAnalysis(true);
    setTimeout(() => setCopiedAnalysis(false), 2000);
  };

  const wordCount = (str: string) => str.trim() ? str.trim().split(/\s+/).length : 0;

  // =========================================================================
  // EULA MODAL — shown only on first launch
  // =========================================================================
  if (!eulaAccepted) {
    return (
      <div className="tool-window" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
        <div style={{ maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Icon + Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3em', marginBottom: '10px' }}>🤖</div>
            <h2 style={{ margin: 0, color: 'var(--accent)' }}>Super Humanizer</h2>
            <span style={{ fontSize: '0.75em', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em' }}>v{SH_VERSION} — РАННИЙ ДОСТУП</span>
          </div>

          {/* Disclaimer box */}
          <div style={{
            background: 'rgba(255, 150, 50, 0.08)',
            border: '1px solid rgba(255, 150, 50, 0.3)',
            borderRadius: '12px', padding: '16px 18px',
            fontSize: '0.85em', lineHeight: '1.7', color: 'var(--text-muted)'
          }}>
            <div style={{ fontWeight: 700, color: '#ff9944', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚠️ {t(superHumanizerLanguage || 'ru', 'shWarningFirstRun')}
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>{t(superHumanizerLanguage || 'ru', 'shWarningDesc')}</li>
            </ul>
          </div>

          <button
            className="action-btn start-btn"
            style={{ padding: '14px', fontSize: '1em', fontWeight: 700, width: '100%' }}
            onClick={() => { localStorage.setItem(EULA_KEY, '1'); setEulaAccepted(true); }}
          >
            {t(superHumanizerLanguage || 'ru', 'shEulaAccept')}
          </button>
          <div style={{ textAlign: 'center', fontSize: '0.78em', color: 'var(--text-muted)', marginTop: '-8px' }}>
            {t(superHumanizerLanguage || 'ru', 'shEulaOnce')}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DISGUISE MODE: REAL TESSERA DESK NOTES COMPONENT
  // =========================================================================
  if (isDisguised) {
    return (
      <div style={{ height: '100%', width: '100%', background: 'var(--bg-main)' }}>
        {/* Render actual original Notes component inside the container */}
        <Notes /> 
      </div>
    );
  }

  // =========================================================================
  // NORMAL VIEW: STANDARD FLOWDESK TOOL LAYOUT
  // =========================================================================
  return (
    <div className="tool-window" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '20px' }}>
      
      <div className="tool-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} className="tool-icon" style={{ color: 'var(--accent)' }} />
          <h2>Super Humanizer</h2>
          <span style={{
            fontSize: '0.65em', fontWeight: 700, letterSpacing: '0.08em',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px', padding: '2px 7px', color: 'var(--text-muted)'
          }}>v{SH_VERSION}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button 
            className="icon-btn"
            onClick={() => setIsDisguised(true)}
            title={`${t(superHumanizerLanguage || 'ru', 'shDisguiseMode')} (${panicHotkey})`}
            style={{ padding: '6px' }}
          >
            <EyeOff size={16} />
          </button>
          <button 
            className={`icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(true)}
            title={t(superHumanizerLanguage || 'ru', 'shSettingsTooltip')}
            style={{ padding: '6px' }}
          >
            <Settings size={16} />
          </button>
          <div style={{ transform: 'scale(0.9)' }}>
            <InfoButton 
              text={t(superHumanizerLanguage || 'ru', 'shDesc')}
            />
          </div>
        </div>
      </div>

      <div className="tool-content" style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden', padding: '0 20px' }}>
        
        {/* LEFT COLUMN: Input & Scan */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            <button 
              onClick={() => setLeftTab('text')}
              style={{ 
                background: 'transparent', border: 'none', color: leftTab === 'text' ? 'var(--accent)' : 'var(--text-muted)', 
                fontWeight: leftTab === 'text' ? 'bold' : 'normal', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', padding: 0
              }}
            >
              <FileText size={16} /> {t(superHumanizerLanguage || 'ru', 'shSourceText')}
            </button>
            <button 
              onClick={() => setLeftTab('analysis')}
              style={{ 
                background: 'transparent', border: 'none', color: leftTab === 'analysis' ? 'var(--accent)' : 'var(--text-muted)', 
                fontWeight: leftTab === 'analysis' ? 'bold' : 'normal', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', padding: 0, marginLeft: '10px'
              }}
            >
              <Bot size={16} /> {t(superHumanizerLanguage || 'ru', 'shAnalyze')}
            </button>
            <div style={{ flex: 1 }} />
            {leftTab === 'text' && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {wordCount(text)} {t(superHumanizerLanguage || 'ru', 'shWords')} • {text.length} {t(superHumanizerLanguage || 'ru', 'shChars')}
              </span>
            )}
          </div>

          {/* Tab Content */}
          {leftTab === 'text' ? (
            <textarea
              value={text}
            onChange={(e) => { setText(e.target.value); setInputError(''); }}
              placeholder={t(superHumanizerLanguage || 'ru', 'shScanPrompt')}
              style={{ 
                flex: 1, 
                width: '100%', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '8px', 
                padding: '15px', 
                color: 'var(--text-main)', 
                outline: 'none',
                resize: 'none',
                fontSize: '14px',
                lineHeight: '1.5',
                minHeight: 0
              }}
            />
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '15px', fontSize: '14px', lineHeight: '1.6' }}>
              {analysisResult ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button
                      onClick={handleCopyAnalysis}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-main)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {copiedAnalysis ? <Check size={12} color="var(--accent)" /> : <Copy size={12} />}
                      {copiedAnalysis ? t(superHumanizerLanguage || 'ru', 'shCopied') : t(superHumanizerLanguage || 'ru', 'shCopy')}
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div className="prose prose-invert max-w-none prose-headings:text-amber-500 prose-headings:font-bold">
                      <Markdown>{analysisResult}</Markdown>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
                  {t(superHumanizerLanguage || 'ru', 'shScanPrompt')}
                </div>
              )}
            </div>
          )}

          {/* Error/Warning Banner */}
          {inputError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255, 80, 80, 0.12)',
              border: '1px solid rgba(255, 80, 80, 0.35)',
              borderRadius: '8px', padding: '8px 12px',
              fontSize: '12px', color: '#ff7070'
            }}>
              <AlertTriangle size={14} />
              {inputError}
            </div>
          )}

          {/* AI Scan Button at bottom of left column */}
          <button 
            className="action-btn"
            onClick={() => { handleAnalyze(); setLeftTab('analysis'); }}
            disabled={isAnalyzing}
            style={{ width: '100%', margin: 0, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
          >
            {isAnalyzing ? <RefreshCw size={18} className="animate-spin" /> : <Bot size={18} />}
            {isAnalyzing ? '...' : t(superHumanizerLanguage || 'ru', 'shAnalyze')}
          </button>
        </div>


        {/* RIGHT COLUMN: Settings & Result */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
          
          {/* Settings Box */}
          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={16} style={{ color: 'var(--accent)' }}/> {t(superHumanizerLanguage || 'ru', 'shParamsSettings')}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setStrictLength(!strictLength)}
                  title="Сохранять точный объем исходного текста (не урезать)"
                  style={{ 
                    padding: '4px 10px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: strictLength ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                    border: '1px solid var(--glass-border)', 
                    color: strictLength ? '#000' : 'var(--text-muted)'
                  }}
                >
                  <Scale size={14} /> {t(superHumanizerLanguage || 'ru', 'shStrictLength')}
                </button>
                <button
                  onClick={() => setUseWebSearch(!useWebSearch)}
                style={{ 
                  padding: '4px 10px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: useWebSearch ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--glass-border)', 
                  color: useWebSearch ? '#000' : 'var(--text-muted)'
                }}
              >
                <Globe size={14} /> {t(superHumanizerLanguage || 'ru', 'shUseWebSearch')}
              </button>
            </div>
          </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '15px' }}>
              {[
                { name: 'Stealth', desc: t(superHumanizerLanguage || 'ru', 'shStyleStealth') },
                { name: 'Casual', desc: t(superHumanizerLanguage || 'ru', 'shStyleCasual') },
                { name: 'Professional', desc: t(superHumanizerLanguage || 'ru', 'shProfessional') },
                { name: 'Academic', desc: t(superHumanizerLanguage || 'ru', 'shStyleAcademic') },
                { name: 'Gen Z Slang', desc: t(superHumanizerLanguage || 'ru', 'shGenZSlang') },
                { name: 'Storyteller', desc: t(superHumanizerLanguage || 'ru', 'shStoryteller') },
              ].map((s) => (
                <div
                  key={s.name}
                  onClick={() => setStyle(s.name)}
                  style={{ 
                    background: style === s.name ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    border: style === s.name ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                    color: style === s.name ? '#000' : 'var(--text-muted)',
                    borderRadius: '8px',
                    padding: '8px 5px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{s.name}</span>
                  <span style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>{s.desc}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t(superHumanizerLanguage || 'ru', 'shContextPlaceholder')}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }}
              />
              <input 
                type="text" 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t(superHumanizerLanguage || 'ru', 'shCustomInstructions')}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }}
              />
            </div>

            <button 
              className="action-btn start-btn"
              onClick={handleHumanize}
              disabled={isHumanizing}
              style={{ margin: '15px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', fontSize: '14px', padding: '12px' }}
            >
              {isHumanizing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
              {isHumanizing ? '...' : t(superHumanizerLanguage || 'ru', 'shHumanize')}
            </button>
          </div>

          {/* Result Box */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)', padding: '15px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                <CheckCircle2 size={16} /> {t(superHumanizerLanguage || 'ru', 'shResult')}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {wordCount(result)} {t(superHumanizerLanguage || 'ru', 'shWords')}
                </span>
                {wordDiff !== null && result && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    color: Math.abs(wordDiff) > wordCount(text) * 0.15 ? '#ff9944' : '#44cc88',
                    background: Math.abs(wordDiff) > wordCount(text) * 0.15 ? 'rgba(255,153,68,0.12)' : 'rgba(68,204,136,0.12)',
                    border: `1px solid ${Math.abs(wordDiff) > wordCount(text) * 0.15 ? 'rgba(255,153,68,0.3)' : 'rgba(68,204,136,0.3)'}`,
                    borderRadius: '6px', padding: '2px 8px'
                  }}>
                    {wordDiff > 0 ? '+' : ''}{wordDiff} {t(superHumanizerLanguage || 'ru', 'shWordsShort')}
                  </span>
                )}
                <button
                  onClick={() => handleCopy(result)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
                  {copied ? t(superHumanizerLanguage || 'ru', 'shCopied') : t(superHumanizerLanguage || 'ru', 'shCopy')}
                </button>
              </div>
            </div>

            <textarea
              value={result}
              readOnly
              placeholder={t(superHumanizerLanguage || 'ru', 'shResultPlaceholder')}
              style={{ 
                flex: 1, 
                width: '100%', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '8px', 
                padding: '15px', 
                color: 'var(--text-main)', 
                outline: 'none',
                resize: 'none',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
            />
          </div>

        </div>
      </div>

      {/* ===================================================================== */}
      {/* SETTINGS MODAL */}
      {/* ===================================================================== */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px',
            padding: '24px', width: '90%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Settings size={20} style={{ color: 'var(--accent)' }} /> {t(superHumanizerLanguage || 'ru', 'shAppConfig')}
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t(superHumanizerLanguage || 'ru', 'shApiKey')}</label>
                  <button
                    onClick={() => setShowApiKeyGuide(true)}
                    style={{ background: 'transparent', border: 'none', fontSize: '11px', fontWeight: 'bold', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <HelpCircle size={12} /> {t(superHumanizerLanguage || 'ru', 'shGetApiKey')}
                  </button>
                </div>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-main)', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t(superHumanizerLanguage || 'ru', 'shModel')}</label>
                <Dropdown 
                  value={model}
                  onChange={(v) => setModel(v)}
                  options={[
                    { value: "gemini-3.6-flash", label: t(superHumanizerLanguage || 'ru', 'shModelFast') },
                    { value: "gemini-3.5-flash-lite", label: t(superHumanizerLanguage || 'ru', 'shModelInstant') },
                    { value: "gemini-3.7-flash", label: t(superHumanizerLanguage || 'ru', 'shModelExp') },
                    { value: "gemini-3.1-pro", label: t(superHumanizerLanguage || 'ru', 'shModelDeep') }
                  ]}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t(superHumanizerLanguage || 'ru', 'shLanguage')}</label>
                <Dropdown 
                  value={language}
                  onChange={(v) => setLanguage(v as 'ru' | 'en')}
                  options={[
                    { value: "ru", label: t(superHumanizerLanguage || 'ru', 'shLangRu') },
                    { value: "en", label: t(superHumanizerLanguage || 'ru', 'shLangEn') }
                  ]}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t(superHumanizerLanguage || 'ru', 'shDisguiseHotkey')}</label>
                <button
                  onClick={() => setRecordingHotkey(!recordingHotkey)}
                  style={{
                    width: '100%', background: recordingHotkey ? 'var(--accent)' : 'rgba(0,0,0,0.2)',
                    color: recordingHotkey ? '#000' : 'var(--accent)', border: recordingHotkey ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                    borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer'
                  }}
                >
                  {recordingHotkey ? t(superHumanizerLanguage || 'ru', 'shPressKey') : `[ ${panicHotkey} ]`}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
              <button 
                onClick={() => setShowSettings(false)}
                className="icon-btn"
                style={{ padding: '8px 15px' }}
              >
                {t(superHumanizerLanguage || 'ru', 'shCancel')}
              </button>
              <button 
                onClick={saveSettings}
                className="action-btn"
                style={{ padding: '8px 20px', margin: 0, fontWeight: 'bold' }}
              >
                {t(superHumanizerLanguage || 'ru', 'shSave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* API KEY GUIDE MODAL */}
      {/* ===================================================================== */}
      {showApiKeyGuide && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px',
            padding: '24px', width: '90%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Key size={18} style={{ color: 'var(--accent)' }} /> Как получить ключ
              </h2>
              <button 
                onClick={() => setShowApiKeyGuide(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20}/>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '13px', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'var(--accent)', color: '#000', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                <div>Перейдите в Google AI Studio и войдите через Google.</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'var(--accent)', color: '#000', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                <div>Нажмите синюю кнопку «Create API key».</div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ background: 'var(--accent)', color: '#000', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>3</div>
                <div>Скопируйте полученный ключ (начинается на AIzaSy) и вставьте в настройки.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
              <button
                onClick={handleOpenAiStudio}
                className="action-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}
              >
                Google AI Studio <ExternalLink size={14} />
              </button>

              <button 
                onClick={() => setShowApiKeyGuide(false)}
                className="action-btn"
                style={{ margin: 0, fontWeight: 'bold' }}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperHumanizer;
