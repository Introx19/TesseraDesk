import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';
import { 
  Timer as TimerIcon, Hourglass, Pin, Calculator as CalculatorIcon, List, 
  StickyNote, FlaskConical, LineChart, BookOpen, FunctionSquare, Scale, 
  Globe, Terminal, MousePointerClick, Coins, Keyboard, Sparkles, Code2, 
  Scissors, Palette, LayoutGrid, ChevronsUp, Moon, Droplet, ChevronDown, 
  Settings as SettingsIcon, PanelRightClose, Minus, X 
} from 'lucide-react';

interface SidebarProps {
  isCompact: boolean;
  isMini: boolean;
  miniAnimating: boolean;
  activeTab: string;
  plugins: any[];
  openToolOption: (tool: string) => void;
  toggleMini: () => void;
  toggleCompact: () => void;
  takeScreenshot: () => void;
  openPaint: () => void;
  isOpaque: boolean;
  setIsOpaque: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCompact, isMini, miniAnimating, activeTab, plugins, 
  openToolOption, toggleMini, toggleCompact, takeScreenshot, openPaint,
  isOpaque, setIsOpaque
}) => {
  const { language, activeTools, pinnedTools, pinnedOrder, updateSettings, dndMode, bgOpacity } = useSettings();
  
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStarted = useRef<boolean>(false);

  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const opacityMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (opacityMenuRef.current && !opacityMenuRef.current.contains(event.target as Node)) {
        const navOpacity = document.getElementById('nav-opacity');
        if (navOpacity && navOpacity.contains(event.target as Node)) {
          return;
        }
        setShowOpacitySlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div 
      className={`sidebar ${isCompact ? 'compact-sidebar' : ''} ${miniAnimating ? 'mini-animating' : ''}`} 
      style={{ 
        width: isCompact ? '100%' : '60px', 
        height: '100vh', 
        padding: isCompact ? '8px 5px' : '45px 0 15px 0',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        flexShrink: 0,
        overflowY: isCompact ? 'hidden' : 'overlay',
        overflowX: 'hidden'
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const toolId = e.dataTransfer.getData('text/plain');
        if (toolId && (activeTools as any)[toolId]) {
          if (!pinnedTools[toolId]) {
            updateSettings({
              pinnedTools: {
                ...pinnedTools,
                [toolId]: true
              },
              pinnedOrder: [...pinnedOrder, toolId]
            });
          }
        }
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', alignItems: 'center', flexShrink: 0 }}>
        {isCompact && !isMini && (
          <button
            className="compact-mini-btn"
            onClick={toggleMini}
            title="Свернуть в квадратик"
          >
            <ChevronsUp size={13} />
          </button>
        )}

        <div id="nav-library" className={`nav-item ${activeTab === 'library' && !isCompact ? 'active' : ''}`} onClick={() => openToolOption('library')} title={language === 'ru' ? 'Библиотека DLC' : 'DLC Library'}><LayoutGrid size={20} /></div>
        <div style={{ width: '30px', height: '1px', background: 'var(--glass-border)', margin: '5px auto' }}></div>
      </div>
      
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: isCompact ? 'hidden' : 'overlay', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', alignItems: 'center' }}>
        {pinnedOrder.filter(id => id !== 'screenshot' && id !== 'paint').map(toolId => {
          const isPluginTool = toolId.startsWith('plugin-');
          const isCreatorStudio = toolId === 'creatorStudio';
          const isActiveTool = isPluginTool || isCreatorStudio || (activeTools as any)[toolId];
          if (!isActiveTool || !pinnedTools[toolId]) return null;

          const isActive = activeTab === toolId && !isCompact;
          let IconComponent: any = null;
          let title = '';
          let onClickAction = () => openToolOption(toolId);

          if (toolId.startsWith('plugin-')) {
            const p = plugins.find(x => x.id === toolId.replace('plugin-', ''));
            if (p) {
              IconComponent = LayoutGrid;
              title = p.name;
            }
          } else {
            switch(toolId) {
              case 'stopwatch': IconComponent = TimerIcon; title = t(language as Lang, 'stopwatch'); break;
              case 'minitimer': IconComponent = Hourglass; title = t(language as Lang, 'minitimer'); break;
              case 'reminders': IconComponent = Pin; title = t(language as Lang, 'reminders'); break;
              case 'calc': IconComponent = CalculatorIcon; title = t(language as Lang, 'calc'); break;
              case 'tasks': IconComponent = List; title = t(language as Lang, 'tasks'); break;
              case 'notes': IconComponent = StickyNote; title = t(language as Lang, 'notes'); break;
              case 'periodicTable': IconComponent = FlaskConical; title = t(language as Lang, 'periodicTable'); break;
              case 'desmos': IconComponent = LineChart; title = t(language as Lang, 'desmos'); break;
              case 'formulas': IconComponent = BookOpen; title = t(language as Lang, 'formulas'); break;
              case 'integrals': IconComponent = FunctionSquare; title = t(language as Lang, 'integrals'); break;
              case 'converter': IconComponent = Scale; title = t(language as Lang, 'converter'); break;
              case 'worldClock': IconComponent = Globe; title = t(language as Lang, 'dlc_worldClock_name' as any); break;
              case 'devTools': IconComponent = Terminal; title = t(language as Lang, 'dlc_devTools_name' as any); break;
              case 'autoclicker': IconComponent = MousePointerClick; title = t(language as Lang, 'autoclicker'); break;
              case 'numismatics': IconComponent = Coins; title = t(language as Lang, 'numismatics_title' as any) || 'Numismatics'; break;
              case 'humanTyper': IconComponent = Keyboard; title = 'Human Typer'; break;
              case 'superHumanizer': IconComponent = Sparkles; title = 'Super Humanizer'; break;
              case 'creatorStudio': IconComponent = Code2; title = 'Creator Studio'; break;
              case 'screenshot': IconComponent = Scissors; title = t(language as Lang, 'screenshot'); onClickAction = takeScreenshot; break;
              case 'paint': IconComponent = Palette; title = t(language as Lang, 'paint'); onClickAction = openPaint; break;
            }
          }

          if (!IconComponent) return null;

          return (
            <div key={toolId} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              {dragOverTarget === toolId && (
                <div style={{ position: 'absolute', top: -3, left: '20%', right: '20%', height: '2px', background: 'var(--accent)', borderRadius: '2px', zIndex: 10, boxShadow: '0 0 5px var(--accent)' }}></div>
              )}
              <div 
                id={`nav-${toolId}`} 
                className={`nav-item ${isActive ? 'active' : ''} ${draggingId === toolId ? 'dragging' : ''}`} 
                onClick={onClickAction} 
                title={title}
                draggable
                onDragStart={(e) => {
                  dragStarted.current = true;
                  setDraggingId(toolId);
                  e.dataTransfer.setData('text/plain', toolId);
                  e.dataTransfer.effectAllowed = 'move';
                  const ghost = document.createElement('div');
                  ghost.style.cssText = 'width:36px;height:36px;background:var(--accent);opacity:0.5;border-radius:10px;position:fixed;top:-100px';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 18, 18);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverTarget(null);
                  dragStarted.current = false;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragStarted.current) setDragOverTarget(toolId);
                }}
                onDragLeave={() => {
                  if (dragOverTarget === toolId) setDragOverTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverTarget(null);
                  const sourceId = e.dataTransfer.getData('text/plain');
                  if (sourceId && sourceId !== toolId && (activeTools as any)[sourceId]) {
                    const newOrder = [...pinnedOrder];
                    
                    if (!pinnedTools[sourceId]) {
                      const targetIndex = newOrder.indexOf(toolId);
                      if (targetIndex > -1) {
                        newOrder.splice(targetIndex, 0, sourceId);
                      } else {
                        newOrder.push(sourceId);
                      }
                      updateSettings({
                        pinnedTools: { ...pinnedTools, [sourceId]: true },
                        pinnedOrder: newOrder
                      });
                    } else {
                      const sourceIndex = newOrder.indexOf(sourceId);
                      const targetIndex = newOrder.indexOf(toolId);
                      if (sourceIndex > -1 && targetIndex > -1) {
                        newOrder.splice(sourceIndex, 1);
                        newOrder.splice(targetIndex, 0, sourceId);
                        updateSettings({ pinnedOrder: newOrder });
                      }
                    }
                  }
                }}
              >
                <IconComponent size={18} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', alignItems: 'center', flexShrink: 0, marginTop: 'auto' }}>
        {( (activeTools.screenshot && pinnedTools.screenshot) || (activeTools.paint && pinnedTools.paint) ) && (
          <>
            <div style={{ width: '30px', height: '1px', background: 'var(--glass-border)', margin: '5px 0' }}></div>
            {(activeTools.screenshot && pinnedTools.screenshot) && (
              <div key="screenshot" style={{ width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div id="nav-screenshot" className={`nav-item ${(activeTab as string) === 'screenshot' ? 'active' : ''}`} onClick={takeScreenshot} title={t(language as Lang, 'screenshot')}>
                  <Scissors size={18} />
                </div>
              </div>
            )}
            {(activeTools.paint && pinnedTools.paint) && (
              <div key="paint" style={{ width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div id="nav-paint" className={`nav-item ${(activeTab as string) === 'paint' ? 'active' : ''}`} onClick={openPaint} title={t(language as Lang, 'paint')}>
                  <Palette size={18} />
                </div>
              </div>
            )}
          </>
        )}

        {!isCompact && (
          <>
            <div style={{ width: '30px', height: '1px', background: 'var(--glass-border)', margin: '5px 0' }}></div>
            <div id="nav-dnd" className={`nav-item ${dndMode ? 'active' : ''}`} style={{ flexShrink: 0 }} onClick={() => updateSettings({ dndMode: !dndMode })} title={dndMode ? t(language as Lang, 'dndOn') : t(language as Lang, 'dndOff')}><Moon size={18} /></div>
            
            <div style={{ position: 'relative' }}>
              <div 
                id="nav-opacity"
                className={`nav-item ${isOpaque ? 'active' : ''}`} 
                onClick={() => setIsOpaque(!isOpaque)} 
                onContextMenu={(e) => { e.preventDefault(); setShowOpacitySlider(!showOpacitySlider); }}
                title={t(language as Lang, 'opacity')}
                style={{ position: 'relative', flexShrink: 0 }}
              >
                <Droplet size={20} />
                <ChevronDown size={12} style={{ position: 'absolute', right: '2px', bottom: '2px', opacity: 0.7 }} />
              </div>
              
              {showOpacitySlider && !isCompact && (
                <div ref={opacityMenuRef} style={{
                  position: 'fixed', left: '70px', bottom: '80px',
                  background: 'var(--bg-card)', padding: '10px', borderRadius: 8,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)', zIndex: 100, minWidth: 150,
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{fontSize: '0.85em', color: 'var(--text-muted)'}}>{t(language as Lang, 'opacity')}</span>
                    <span style={{fontSize: '0.8em', color: 'var(--accent)'}}>{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="20" max="100" 
                    value={Math.round(bgOpacity * 100)} 
                    onChange={e => updateSettings({ bgOpacity: parseInt(e.target.value) / 100 })} 
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>
              )}
            </div>
            
            <div id="nav-settings" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} style={{ flexShrink: 0 }} onClick={() => openToolOption('settings')} title={t(language as Lang, 'settings')}><SettingsIcon size={20} /></div>
          </>
        )}
      </div>

      {isCompact && (
        <div style={{
          flexShrink: 0,
          width: '100%',
          padding: '8px 0 10px',
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          background: 'transparent',
          borderTop: '1px solid var(--glass-border)'
        }}>
          <button className="win-btn" onClick={toggleCompact} title={t(language as Lang, 'expand')} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PanelRightClose size={16} />
          </button>
          <button className="win-btn minimize" onClick={() => window.electronAPI?.windowMinimize()} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Minimize">
            <Minus size={14} />
          </button>
          <button className="win-btn close" onClick={() => window.electronAPI?.windowClose()} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t(language as Lang, 'close')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
