import { useState, useEffect } from 'react';
import { Timer as TimerIcon, Hourglass, Calculator as CalculatorIcon, List, Pin, X, Minus, Scissors, Palette, PanelLeftClose, PanelRightClose, Settings as SettingsIcon, Droplet, Moon, ExternalLink, StickyNote, ChevronsUp, FlaskConical, LineChart, BookOpen, FunctionSquare, Scale, Globe, ChevronDown } from 'lucide-react';
import Stopwatch from './components/Stopwatch';
import MiniTimer from './components/MiniTimer';
import Reminders from './components/Reminders';
import NotificationPopup from './components/NotificationPopup';
import Calculator from './components/Calculator';
import Tasks from './components/Tasks';
import Notes from './components/Notes';
import ToolWindowShell from './components/ToolWindowShell';
import ScreenshotPreview from './components/ScreenshotPreview';
import Settings from './components/Settings';
import PeriodicTable from './components/dlc/PeriodicTable';
import Graphs from './components/dlc/Graphs';
import Formulas from './components/dlc/Formulas';
import Integrals from './components/dlc/Integrals';
import Converter from './components/dlc/Converter';
import WorldClock from './components/dlc/WorldClock';
import ScreenshotSelect from './components/ScreenshotSelect';
import Onboarding from './components/Onboarding';
import { useSettings } from './contexts/SettingsContext';
import { t, type Lang } from './i18n/texts';

function App() {
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'minitimer' | 'reminders' | 'calc' | 'tasks' | 'notes' | 'settings' | 'store' | 'periodicTable' | 'desmos' | 'formulas' | 'integrals' | 'converter' | 'worldClock'>('stopwatch');
  const [isPinned, setIsPinned] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [miniAnimating, setMiniAnimating] = useState(false);
  const [isOpaque, setIsOpaque] = useState(() => {
    return localStorage.getItem('tesseradesk-opaque') === 'true';
  });

  const [showOpacitySlider, setShowOpacitySlider] = useState(false);

  const { language, activeTools, dndMode, bgOpacity, multiScreenshot, updateSettings } = useSettings();

  useEffect(() => {
    localStorage.setItem('tesseradesk-opaque', String(isOpaque));
    if (isOpaque) document.body.classList.add('opaque-bg');
    else document.body.classList.remove('opaque-bg');
  }, [isOpaque]);

  const hash = window.location.hash;
  const isPreview = hash.includes('preview');
  
  // Render Popups / specific tools if launched via hash
  if (hash.includes('notification')) return <NotificationPopup />;
  if (isPreview) return <ScreenshotPreview />;
  if (hash.includes('screenshot-select')) return <ScreenshotSelect />;
  if (hash.includes('stopwatch')) return <ToolWindowShell><Stopwatch /></ToolWindowShell>;
  if (hash.includes('minitimer')) return <ToolWindowShell><MiniTimer /></ToolWindowShell>;
  if (hash.includes('reminders')) return <ToolWindowShell><Reminders /></ToolWindowShell>;
  if (hash.includes('calc')) return <ToolWindowShell><Calculator /></ToolWindowShell>;
  if (hash.includes('tasks')) return <ToolWindowShell><Tasks /></ToolWindowShell>;
  if (hash.includes('notes')) return <ToolWindowShell><Notes /></ToolWindowShell>;
  if (hash.includes('periodicTable')) return <ToolWindowShell><PeriodicTable /></ToolWindowShell>;
  if (hash.includes('desmos')) return <ToolWindowShell><Graphs /></ToolWindowShell>;
  if (hash.includes('formulas')) return <ToolWindowShell><Formulas /></ToolWindowShell>;
  if (hash.includes('integrals')) return <ToolWindowShell><Integrals /></ToolWindowShell>;
  if (hash.includes('converter')) return <ToolWindowShell><Converter /></ToolWindowShell>;
  if (hash.includes('worldClock')) return <ToolWindowShell><WorldClock /></ToolWindowShell>;

  const togglePin = () => {
    const newPin = !isPinned;
    setIsPinned(newPin);
    if (window.electronAPI && !isCompact) { 
      window.electronAPI.setAlwaysOnTop(newPin);
    }
  };

  const toggleCompact = () => {
    const newCompact = !isCompact;
    setIsCompact(newCompact);
    setIsMini(false);
    
    let itemCount = 0;
    if (activeTools.stopwatch) itemCount++;
    if (activeTools.minitimer) itemCount++;
    if (activeTools.reminders) itemCount++;
    if (activeTools.calc) itemCount++;
    if (activeTools.tasks) itemCount++;
    if (activeTools.notes) itemCount++;
    if (activeTools.periodicTable) itemCount++;
    if (activeTools.desmos) itemCount++;
    if (activeTools.formulas) itemCount++;
    if (activeTools.integrals) itemCount++;
    if (activeTools.converter) itemCount++;
    if (activeTools.worldClock) itemCount++;
    let hasMedia = activeTools.screenshot || activeTools.paint;
    if (activeTools.screenshot) itemCount++;
    if (activeTools.paint) itemCount++;

    // 20px chevron + 16px (top+bottom sidebar pad) + itemCount*35 + gaps + bottomBar (42px) + divider
    // Gaps count = itemCount + 1 (for chevron) + 1 (if bottomBar separated by margin)
    // Divider is approx 11px
    const height = 20 + 16 + (itemCount * 35) + ((itemCount > 0 ? itemCount + 1 : 0) * 5) + 42 + (hasMedia ? 16 : 0);

    if (window.electronAPI) {
        // @ts-ignore (we know height is passed but just in case)
        window.electronAPI.setCompactMode(newCompact, height);
        if (!newCompact) {
            window.electronAPI.setAlwaysOnTop(isPinned);
        }
    }
  };

  const toggleMini = () => {
    if (!isMini) {
      // Collapse: animate out → resize → show mini
      setMiniAnimating(true);
      setTimeout(() => {
        setIsMini(true);
        localStorage.setItem('td-mini', 'true');
        window.electronAPI?.setMiniMode(true);
        setTimeout(() => setMiniAnimating(false), 50);
      }, 350);
    } else {
      // Expand: prepare compressed state → resize → animate in
      setMiniAnimating(true);
      window.electronAPI?.setMiniMode(false);
      setIsMini(false);
      localStorage.setItem('td-mini', 'false');
      // Small delay to let React mount the sidebar in its compressed state, then trigger CSS transition
      setTimeout(() => setMiniAnimating(false), 20);
    }
  };

  const openToolOption = (tool: string) => {
    if (isCompact && window.electronAPI) {
      window.electronAPI.openToolWindow(tool);
    } else {
      setActiveTab(tool as any);
    }
  };

  const openPaint = () => {
    if (window.electronAPI) window.electronAPI.openPaint();
  };

  const takeScreenshot = () => {
    if (window.electronAPI) window.electronAPI.takeScreenshot(multiScreenshot);
  };

  return (
    <>
    <Onboarding />
    <div className="app-container" style={{ 
      flexDirection: isCompact ? 'column' : 'row', 
      height: (isCompact && !isMini) ? 'auto' : '100vh',
      borderRadius: (isCompact && isMini) ? '20px' : '12px',
    }}>
      {!isCompact && (
        <div className="titlebar-drag-region" onDoubleClick={toggleCompact}>
          <div className="titlebar-controls">
            {activeTab !== 'settings' && (
              <button
                className="win-btn"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                style={{ WebkitAppRegion: 'no-drag' } as any}
                onClick={(e) => { e.stopPropagation(); window.electronAPI?.openToolWindow(activeTab); }}
                title="Открыть виджет в отдельном окне"
              >
                <ExternalLink size={14} />
              </button>
            )}
            <button className={`win-btn pin ${isPinned ? 'active' : ''}`} onClick={togglePin} title="Поверх всех окон"><Pin size={14} /></button>
            <button className="win-btn" onClick={toggleCompact} title="Свернуть в виджет"><PanelLeftClose size={14} /></button>
            <button className="win-btn" onClick={() => window.electronAPI?.windowMinimize()}><Minus size={14} /></button>
            <button className="win-btn close" onClick={() => window.electronAPI?.windowClose()}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* MINI MODE overlay - glowing accent button */}
      {isCompact && isMini && (
        <div
          onClick={toggleMini}
          title="Развернуть"
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 999,
            background: 'transparent',
            // @ts-ignore
            WebkitAppRegion: 'drag',
          }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px var(--accent-glow), 0 0 28px var(--accent-glow)',
            flexShrink: 0,
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          }}>
            <PanelRightClose size={18} style={{ color: '#000', strokeWidth: 2.5 }} />
          </div>
        </div>
      )}

      {(!isCompact || !isMini) && (
        <div className={`sidebar ${isCompact ? 'compact-sidebar' : ''} ${miniAnimating ? 'mini-animating' : ''}`} style={{ 
          width: isCompact ? '100%' : '60px', 
          height: isCompact ? 'auto' : '100vh', 
          padding: isCompact ? '8px 5px' : '45px 0 15px 0',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ flex: isCompact ? '0 1 auto' : 1, overflowY: 'auto', overflowX: 'visible', display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', alignItems: 'center' }}>
            {isCompact && !isMini && (
              <button
                className="compact-mini-btn"
                onClick={toggleMini}
                title="Свернуть в квадратик"
              >
                <ChevronsUp size={13} />
              </button>
            )}

            {activeTools.stopwatch && <div id="nav-stopwatch" className={`nav-item ${activeTab === 'stopwatch' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('stopwatch')} title={t(language as Lang, 'stopwatch')}><TimerIcon size={20} /></div>}
            {activeTools.minitimer && <div id="nav-minitimer" className={`nav-item ${activeTab === 'minitimer' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('minitimer')} title={t(language as Lang, 'minitimer')}><Hourglass size={20} /></div>}
            {activeTools.reminders && <div id="nav-reminders" className={`nav-item ${activeTab === 'reminders' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('reminders')} title={t(language as Lang, 'reminders')}><Pin size={20} /></div>}
            {activeTools.calc && <div id="nav-calc" className={`nav-item ${activeTab === 'calc' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('calc')} title={t(language as Lang, 'calc')}><CalculatorIcon size={20} /></div>}
            {activeTools.tasks && <div id="nav-tasks" className={`nav-item ${activeTab === 'tasks' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('tasks')} title={t(language as Lang, 'tasks')}><List size={20} /></div>}
            {activeTools.notes && <div id="nav-notes" className={`nav-item ${activeTab === 'notes' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('notes')} title={t(language as Lang, 'notes')}><StickyNote size={20} /></div>}
            {activeTools.periodicTable && <div id="nav-periodicTable" className={`nav-item ${activeTab === 'periodicTable' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('periodicTable')} title={t(language as Lang, 'periodicTable')}><FlaskConical size={20} /></div>}
            {activeTools.desmos && <div id="nav-desmos" className={`nav-item ${activeTab === 'desmos' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('desmos')} title={t(language as Lang, 'desmos')}><LineChart size={20} /></div>}
            {activeTools.formulas && <div id="nav-formulas" className={`nav-item ${activeTab === 'formulas' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('formulas')} title={t(language as Lang, 'formulas')}><BookOpen size={20} /></div>}
            {activeTools.integrals && <div id="nav-integrals" className={`nav-item ${activeTab === 'integrals' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('integrals')} title={t(language as Lang, 'integrals')}><FunctionSquare size={20} /></div>}
            {activeTools.converter && <div id="nav-converter" className={`nav-item ${activeTab === 'converter' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('converter')} title={t(language as Lang, 'converter')}><Scale size={20} /></div>}
            {activeTools.worldClock && <div id="nav-worldClock" className={`nav-item ${activeTab === 'worldClock' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('worldClock')} title={t(language as Lang, 'dlc_worldClock_name' as any)}><Globe size={20} /></div>}
            
            {(activeTools.stopwatch || activeTools.minitimer || activeTools.reminders || activeTools.calc || activeTools.tasks || activeTools.notes) && (activeTools.screenshot || activeTools.paint) && (
              <div style={{ width: '30px', height: '1px', background: 'var(--glass-border)', margin: '5px auto' }}></div>
            )}
            
            {activeTools.screenshot && <div id="nav-screenshot" className="nav-item" onClick={takeScreenshot} title={t(language as Lang, 'screenshot')}><Scissors size={20} /></div>}
            {activeTools.paint && <div id="nav-paint" className="nav-item" onClick={openPaint} title={t(language as Lang, 'paint')}><Palette size={20} /></div>}
            
            {!isCompact && (
              <>
                <div style={{ width: '30px', height: '1px', background: 'var(--glass-border)', margin: '5px 0' }}></div>
                <div id="nav-dnd" className={`nav-item ${dndMode ? 'active' : ''}`} onClick={() => updateSettings({ dndMode: !dndMode })} title={dndMode ? t(language as Lang, 'dndOn') : t(language as Lang, 'dndOff')}><Moon size={20} /></div>
                
                <div style={{ position: 'relative' }}>
                  <div 
                    id="nav-opacity"
                    className={`nav-item ${isOpaque ? 'active' : ''}`} 
                    onClick={() => setIsOpaque(!isOpaque)} 
                    onContextMenu={(e) => { e.preventDefault(); setShowOpacitySlider(!showOpacitySlider); }}
                    title={t(language as Lang, 'opacity')}
                    style={{ position: 'relative' }}
                  >
                    <Droplet size={20} />
                    <ChevronDown size={12} style={{ position: 'absolute', right: '2px', bottom: '2px', opacity: 0.7 }} />
                  </div>
                  
                  {showOpacitySlider && !isCompact && (
                    <div style={{
                      position: 'fixed', left: '70px', bottom: '80px', 
                      background: 'var(--bg-card)', padding: '15px', 
                      borderRadius: '8px', border: '1px solid var(--glass-border)',
                      display: 'flex', flexDirection: 'column', gap: '10px',
                      zIndex: 9999, width: '150px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>{t(language as Lang, 'opacity')}</span>
                        <span style={{fontSize: '0.8em', color: 'var(--accent)'}}>{Math.round(bgOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" max="100" 
                        value={Math.round(bgOpacity * 100)} 
                        onChange={e => updateSettings({ bgOpacity: parseInt(e.target.value) / 100 })} 
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </div>
                
                <div id="nav-settings" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title={t(language as Lang, 'settings')}><SettingsIcon size={20} /></div>
              </>
            )}
          </div>

          {isCompact && (
            <div style={{
              flexShrink: 0,
              width: '100%',
              padding: '8px 0 10px',
              marginTop: '5px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'transparent',
              borderTop: '1px solid var(--glass-border)'
            }}>
              <button className="win-btn" onClick={toggleCompact} title={t(language as Lang, 'expand')}><PanelRightClose size={16} /></button>
              <button className="win-btn close" onClick={() => window.electronAPI?.windowClose()} style={{ width: '24px', height: '24px' }} title={t(language as Lang, 'close')}><X size={12} /></button>
            </div>
          )}
        </div>
      )}



      {!isCompact && (
        <div className="main-content">
          {activeTab === 'stopwatch' && <Stopwatch />}
          
          <div style={{ display: activeTab === 'minitimer' ? 'contents' : 'none' }}>
            <MiniTimer />
          </div>
          {activeTab === 'reminders' && <Reminders />}
          {activeTab === 'calc' && <Calculator />}
          {activeTab === 'tasks' && <Tasks />}
          {activeTab === 'notes' && <Notes />}
          {activeTab === 'periodicTable' && <PeriodicTable />}
          {activeTab === 'desmos' && <Graphs />}
          {activeTab === 'formulas' && <Formulas />}
          {activeTab === 'integrals' && <Integrals />}
          {activeTab === 'converter' && <Converter />}
          {activeTab === 'worldClock' && <WorldClock />}
          {activeTab === 'settings' && <Settings />}
        </div>
      )}
    </div>
    </>
  );
}

export default App;
