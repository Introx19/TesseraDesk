import { useState, useEffect, useRef } from 'react';
import { Timer as TimerIcon, Hourglass, Calculator as CalculatorIcon, List, Pin, X, Minus, Square, Scissors, Palette, PanelLeftClose, PanelRightClose, Settings as SettingsIcon, Droplet, Moon, ExternalLink, StickyNote, ChevronsUp, FlaskConical, LineChart, BookOpen, FunctionSquare, Scale, Globe, ChevronDown, Terminal, MousePointerClick, Coins, LayoutGrid, Keyboard, Sparkles, Code2 } from 'lucide-react';
import Stopwatch from './components/Stopwatch';
import MiniTimer from './components/MiniTimer';
import Reminders from './components/Reminders';
import NotificationPopup from './components/NotificationPopup';
import Calculator from './components/Calculator';
import Tasks from './components/Tasks';
import Notes from './components/Notes';
import ToolWindowShell from './components/ToolWindowShell';
import ImageEditor from './components/ImageEditor';
import Settings from './components/Settings';
import Library from './components/Library';
import PeriodicTable from './components/dlc/PeriodicTable';
import Graphs from './components/dlc/Graphs';
import Formulas from './components/dlc/Formulas';
import Integrals from './components/dlc/Integrals';
import Converter from './components/dlc/Converter';
import WorldClock from './components/dlc/WorldClock';
import DevTools from './components/dlc/DevTools';
import AutoClicker from './components/dlc/AutoClicker';
import Numismatics from './components/dlc/Numismatics';
import HumanTyper from './components/dlc/HumanTyper';
import SuperHumanizer from './components/dlc/SuperHumanizer';
import CreatorStudio from './components/dlc/CreatorStudio';
import PluginShell from './components/dlc/PluginShell';
import ScreenshotSelect from './components/ScreenshotSelect';
import ScreenshotPreview from './components/ScreenshotPreview';
import Onboarding from './components/Onboarding';
import WhatsNewModal, { checkWhatsNew } from './components/WhatsNewModal';
import SplashAnimation from './components/SplashAnimation';
import { useSettings } from './contexts/SettingsContext';
import { useModal } from './contexts/ModalContext';
import { t, type Lang } from './i18n/texts';

function App() {
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


  const [activeTab, setActiveTab] = useState<'stopwatch' | 'minitimer' | 'reminders' | 'calc' | 'tasks' | 'notes' | 'settings' | 'store' | 'periodicTable' | 'desmos' | 'formulas' | 'integrals' | 'converter' | 'worldClock' | 'devTools' | 'autoclicker' | 'numismatics' | 'humanTyper' | 'superHumanizer' | 'creatorStudio' | 'library'>('stopwatch');
  const [isPinned, setIsPinned] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [miniAnimating, setMiniAnimating] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [updateReadyInfo, setUpdateReadyInfo] = useState<{ version: string } | null>(null);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStarted = useRef<boolean>(false);

  const refreshPlugins = () => {
    if (window.electronAPI?.getPlugins) {
      window.electronAPI.getPlugins().then(list => {
        setPlugins(list);
      }).catch(e => console.error('FAILED TO LOAD PLUGINS:', e));
    }
  };

  useEffect(() => {
    refreshPlugins();
  }, []);
  
  const [showSplash, setShowSplash] = useState(() => {
    if (window.location.hash) return false;
    return !sessionStorage.getItem('splashPlayed');
  });
  const [appVisible, setAppVisible] = useState(() => {
    if (window.location.hash) return true;
    return !!sessionStorage.getItem('splashPlayed');
  });

  const { language, activeTools, pinnedTools, pinnedOrder, dndMode, bgOpacity, multiScreenshot, fastScreenshot, screenshotDelay, saveFastScreenshotDisk, volume, updateSettings, oledProtection, customScreenshotFolder } = useSettings();

  useEffect(() => {
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
    if (activeTools.devTools) itemCount++;
    if (activeTools.autoclicker) itemCount++;
    if (activeTools.numismatics) itemCount++;
    if (activeTools.screenshot) itemCount++;
    if (activeTools.paint) itemCount++;

    const toolMinSizes: Record<string, {width: number, height: number}> = {
      periodicTable: { width: 1000, height: 700 },
      superHumanizer: { width: 800, height: 500 },
      desmos: { width: 600, height: 500 },
      humanTyper: { width: 500, height: 400 },
      paint: { width: 800, height: 600 },
      'image-editor': { width: 800, height: 600 },
      notes: { width: 400, height: 300 },
      tasks: { width: 400, height: 400 },
      library: { width: 600, height: 500 },
      settings: { width: 500, height: 500 },
      converter: { width: 400, height: 500 },
      formulas: { width: 600, height: 500 },
      integrals: { width: 600, height: 500 },
      worldClock: { width: 500, height: 400 },
      devTools: { width: 1000, height: 700 },
      autoclicker: { width: 400, height: 500 },
      numismatics: { width: 600, height: 500 },
      reminders: { width: 400, height: 400 },
      calc: { width: 350, height: 450 },
    };
    const size = toolMinSizes[activeTab];
    if (size && window.electronAPI?.ensureMinimumSize) {
      window.electronAPI.ensureMinimumSize(size.width, size.height);
    }
  }, [activeTab, activeTools]);

  useEffect(() => {
    if (!window.location.hash && checkWhatsNew()) {
      if (!sessionStorage.getItem('splashPlayed')) {
        setTimeout(() => setShowWhatsNew(true), 2800); // Wait for splash (2200ms) + 600ms delay
      } else {
        setShowWhatsNew(true);
      }
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onWindowMaximized) {
      window.electronAPI.onWindowMaximized((maximized) => {
        setIsMaximized(maximized);
      });
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onUpdateDownloaded) {
      const unsub = window.electronAPI.onUpdateDownloaded((info: any) => {
        setUpdateReadyInfo(info);
      });
      return () => {
        if (unsub) unsub();
      };
    }
  }, []);

  const [isOpaque, setIsOpaque] = useState(() => {
    return localStorage.getItem('tesseradesk-opaque') === 'true';
  });

  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [oledOffset, setOledOffset] = useState({ x: 0, y: 0 });



  useEffect(() => {
    if (!oledProtection) {
      setOledOffset({ x: 0, y: 0 });
      return;
    }
    const interval = setInterval(() => {
      const x = Math.floor(Math.random() * 5) - 2;
      const y = Math.floor(Math.random() * 5) - 2;
      setOledOffset({ x, y });
    }, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [oledProtection]);

  const volumeRef = useRef(volume);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onFastScreenshotDone) {
      window.electronAPI.onFastScreenshotDone((dataUrl: string) => {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
          audio.volume = volumeRef.current ? volumeRef.current / 100 : 0.5;
          audio.play().catch(e => console.log('Audio error', e));
        } catch(e) {}
        window.electronAPI.showNotification('Скриншот сделан', 'Скриншот сохранен и скопирован в буфер обмена', dataUrl);
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tesseradesk-opaque', String(isOpaque));
    if (isOpaque) document.body.classList.add('opaque-bg');
    else document.body.classList.remove('opaque-bg');
  }, [isOpaque]);

  const hash = window.location.hash;
  const isPreview = hash.includes('preview');

  useEffect(() => {
    if (hash) {
      const toolId = hash.replace('#', '');
      const toolMinSizes: Record<string, {width: number, height: number}> = {
        periodicTable: { width: 1000, height: 700 },
        superHumanizer: { width: 800, height: 500 },
        desmos: { width: 600, height: 500 },
        humanTyper: { width: 500, height: 400 },
        paint: { width: 800, height: 600 },
        'image-editor': { width: 800, height: 600 },
        notes: { width: 400, height: 300 },
        tasks: { width: 400, height: 400 },
        library: { width: 600, height: 500 },
        settings: { width: 500, height: 500 },
        converter: { width: 400, height: 500 },
        formulas: { width: 600, height: 500 },
        integrals: { width: 600, height: 500 },
        worldClock: { width: 500, height: 400 },
        devTools: { width: 1000, height: 700 },
        autoclicker: { width: 400, height: 500 },
        numismatics: { width: 600, height: 500 },
        reminders: { width: 400, height: 400 },
        calc: { width: 350, height: 450 },
      };
      const size = toolMinSizes[toolId];
      if (size && window.electronAPI?.ensureMinimumSize) {
        window.electronAPI.ensureMinimumSize(size.width, size.height);
      }
    }
  }, [hash]);
  
  // Render Popups / specific tools if launched via hash
  if (hash.includes('notification')) return <NotificationPopup />;
  if (isPreview) return <ScreenshotPreview />;
  if (hash.includes('image-editor')) return <ImageEditor />;

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
  if (hash.includes('devTools')) return <ToolWindowShell><DevTools /></ToolWindowShell>;
  if (hash.includes('autoclicker')) return <ToolWindowShell><AutoClicker /></ToolWindowShell>;
  if (hash.includes('numismatics')) return <ToolWindowShell><Numismatics /></ToolWindowShell>;
  if (hash.includes('humanTyper')) return <ToolWindowShell><HumanTyper /></ToolWindowShell>;
  if (hash.includes('superHumanizer')) return <ToolWindowShell><SuperHumanizer /></ToolWindowShell>;
  if (hash.includes('creatorStudio')) return <ToolWindowShell><CreatorStudio onPluginsChange={refreshPlugins} /></ToolWindowShell>;
  
  if (hash.includes('/plugin-')) {
    const pluginId = hash.split('/plugin-')[1];
    const plugin = plugins.find(p => p.id === pluginId);
    if (plugin) {
      return <ToolWindowShell><PluginShell plugin={plugin} /></ToolWindowShell>;
    } else {
      return <ToolWindowShell><div className="p-4 text-red-500">Plugin not found or loading... ({pluginId})</div></ToolWindowShell>;
    }
  }
  if (hash.includes('library')) return (
    <ToolWindowShell>
      <Library 
        plugins={plugins}
        onOpenTool={(tool) => {
          window.electronAPI?.openToolWindow(tool);
          window.electronAPI?.windowClose();
        }}
        openPaint={() => {
          window.electronAPI?.openPaint();
          window.electronAPI?.windowClose();
        }}
        takeScreenshot={() => {
          window.electronAPI?.takeScreenshot(multiScreenshot, fastScreenshot, screenshotDelay, saveFastScreenshotDisk, customScreenshotFolder);
          window.electronAPI?.windowClose();
        }}
      />
    </ToolWindowShell>
  );

  if (hash && hash !== '#/') {
    return (
      <div style={{ color: 'white', padding: 20, background: '#111', height: '100vh' }}>
        <h2>Unhandled route:</h2>
        <p>{hash}</p>
      </div>
    );
  }

  const modal = useModal();

  useEffect(() => {
    if (window.electronAPI) {
      const unsub1 = window.electronAPI.onUpdateAvailable(async () => {
        if (await modal.confirm({
          title: language === 'ru' ? 'Новая версия' : 'New version',
          message: language === 'ru' ? 'Найдена новая версия. Скачать и обновить сейчас?' : 'A new version is available. Download and update now?',
          okText: language === 'ru' ? 'Обновить' : 'Update',
          cancelText: language === 'ru' ? 'Позже' : 'Later'
        })) {
          window.electronAPI?.downloadUpdate();
        }
      });
      const unsub2 = window.electronAPI.onUpdateDownloaded(async () => {
        if (await modal.confirm({
           title: language === 'ru' ? 'Обновление готово' : 'Update ready',
           message: language === 'ru' ? 'Новая версия скачана и готова к установке.\nПерезапустить приложение сейчас?' : 'New version downloaded and ready to install.\nRestart app now?',
           okText: language === 'ru' ? 'Перезапустить' : 'Restart',
           cancelText: language === 'ru' ? 'Позже' : 'Later'
        })) {
           window.electronAPI?.installUpdate();
        }
      });
      return () => {
        unsub1();
        unsub2();
      };
    }
  }, [language, modal]);

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
    
    const pinnedCount = pinnedOrder ? pinnedOrder.filter(id => pinnedTools?.[id]).length : 0;
    const height = Math.max(380, 20 + 16 + (Math.max(pinnedCount, 4) * 38) + 120);

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
    if (tool === 'superHumanizer' && window.electronAPI) {
      window.electronAPI.openToolWindow(tool);
      return;
    }
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
    if (window.electronAPI) window.electronAPI.takeScreenshot(multiScreenshot, fastScreenshot, screenshotDelay, saveFastScreenshotDisk, customScreenshotFolder);
  };

  return (
    <>
    {showSplash && (
      <SplashAnimation 
        onExpandStart={() => setAppVisible(true)}
        onComplete={() => {
          sessionStorage.setItem('splashPlayed', 'true');
          setShowSplash(false);
        }} 
      />
    )}
    <Onboarding />
    {showWhatsNew && !showSplash && <WhatsNewModal onClose={() => setShowWhatsNew(false)} />}
    {updateReadyInfo && (
      <div style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: 'var(--bg-card)',
        border: '1px solid var(--accent)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 12px var(--accent-glow)',
        borderRadius: '10px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.3s ease'
      }}>
        <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: 'var(--text-main)' }}>
          🚀 {language === 'ru' ? `Доступно обновление v${updateReadyInfo.version}!` : `TesseraDesk v${updateReadyInfo.version} is ready!`}
        </span>
        <button 
          className="btn btn-primary" 
          style={{ padding: '4px 12px', fontSize: '0.85em' }}
          onClick={() => window.electronAPI?.installUpdate()}
        >
          {language === 'ru' ? 'Перезапустить' : 'Restart now'}
        </button>
        <button 
          className="win-btn close" 
          style={{ padding: '2px', cursor: 'pointer' }}
          onClick={() => setUpdateReadyInfo(null)}
        >
          <X size={14} />
        </button>
      </div>
    )}
    <div className="app-container" style={{ 
      flexDirection: isCompact ? 'column' : 'row', 
      height: (isCompact && !isMini) ? 'auto' : '100vh',
      borderRadius: isMaximized ? '0px' : (isCompact && isMini) ? '20px' : '12px',
      transform: `translate(${oledOffset.x}px, ${oledOffset.y}px)`,
      transition: 'transform 1s ease',
      opacity: appVisible ? 1 : 0,
      pointerEvents: appVisible ? 'auto' : 'none'
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
            <div className="titlebar-controls" style={{ marginLeft: 'auto' }}>
            {window.electronAPI?.windowMinimize && (
              <button className="win-btn minimize" onClick={() => window.electronAPI?.windowMinimize()}>
                <Minus size={14} />
              </button>
            )}
            {window.electronAPI?.windowToggleMaximize && (
              <button className="win-btn maximize" onClick={() => window.electronAPI?.windowToggleMaximize?.()}>
                {isMaximized ? <Square size={12} style={{transform: 'scale(0.8)'}} /> : <Square size={12} />}
              </button>
            )}
            <button className="win-btn close" onClick={() => window.electronAPI?.windowClose()}><X size={14} /></button>
          </div>
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
        <div 
          className={`sidebar ${isCompact ? 'compact-sidebar' : ''} ${miniAnimating ? 'mini-animating' : ''}`} 
          style={{ 
            width: isCompact ? '100%' : '60px', 
            height: isCompact ? 'auto' : '100vh', 
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
            if (toolId && activeTools[toolId as keyof typeof activeTools]) {
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
              // Plugin tools (plugin-xxx) are tracked by plugins array, not activeTools
              // creatorStudio is also a DLC tool
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
                      // Transparent ghost image
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
                      if (sourceId && sourceId !== toolId && activeTools[sourceId as keyof typeof activeTools]) {
                        const newOrder = [...pinnedOrder];
                        
                        // If it's not pinned yet, add it
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
                          // Reordering
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
            {/* Utility Tools separated by a line */}
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
                
                <div id="nav-settings" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} style={{ flexShrink: 0 }} onClick={() => setActiveTab('settings')} title={t(language as Lang, 'settings')}><SettingsIcon size={20} /></div>
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
          {activeTab === 'devTools' && <DevTools />}
          {activeTab === 'autoclicker' && <AutoClicker />}
          {activeTab === 'numismatics' && <Numismatics />}
          {activeTab === 'humanTyper' && <HumanTyper />}
          {activeTab === 'superHumanizer' && <SuperHumanizer />}
          {activeTab === 'creatorStudio' && <CreatorStudio onPluginsChange={refreshPlugins} />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'library' && <Library onOpenTool={openToolOption} openPaint={openPaint} takeScreenshot={takeScreenshot} plugins={plugins} />}
          {activeTab.startsWith('plugin-') && (
            plugins.find(p => p.id === activeTab.replace('plugin-', '')) ? (
              <PluginShell plugin={plugins.find(p => p.id === activeTab.replace('plugin-', ''))} />
            ) : (
              <div className="p-4 text-red-500">Plugin not found or loading... ({activeTab})</div>
            )
          )}
        </div>
      )}
    </div>
    </>
  );
}

export default App;
