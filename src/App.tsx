import { useState, useEffect, useRef } from 'react';
import { Pin, X, Minus, Square, PanelLeftClose, PanelRightClose, ExternalLink } from 'lucide-react';
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
import Sidebar from './components/Sidebar';
import { useSettings } from './contexts/SettingsContext';
import { useModal } from './contexts/ModalContext';
import { getToolConfig } from './config/toolsRegistry';

function App() {


  const [activeTab, setActiveTab] = useState<'stopwatch' | 'minitimer' | 'reminders' | 'calc' | 'tasks' | 'notes' | 'settings' | 'store' | 'periodicTable' | 'desmos' | 'formulas' | 'integrals' | 'converter' | 'worldClock' | 'devTools' | 'autoclicker' | 'numismatics' | 'humanTyper' | 'superHumanizer' | 'creatorStudio' | 'library'>('stopwatch');
  const [isPinned, setIsPinned] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [miniAnimating, setMiniAnimating] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const [plugins, setPlugins] = useState<any[]>([]);

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

  const { language, activeTools, pinnedTools, pinnedOrder, multiScreenshot, fastScreenshot, screenshotDelay, saveFastScreenshotDisk, volume, oledProtection, customScreenshotFolder } = useSettings();

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

    const size = getToolConfig(activeTab)?.minSize;
    if (size && window.electronAPI?.ensureMinimumSize && !isCompact) {
      window.electronAPI.ensureMinimumSize(size.width, size.height);
    }
  }, [activeTab, activeTools, isCompact]);

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
    let cleanupFn: (() => void) | undefined;
    if (window.electronAPI?.onWindowMaximized) {
      cleanupFn = window.electronAPI.onWindowMaximized((maximized) => {
        setIsMaximized(maximized);
      });
    }
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, []);



  const [isOpaque, setIsOpaque] = useState(() => {
    return localStorage.getItem('tesseradesk-opaque') === 'true';
  });


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
    let cleanupFn: (() => void) | undefined;
    if (window.electronAPI && window.electronAPI.onFastScreenshotDone) {
      cleanupFn = window.electronAPI.onFastScreenshotDone((dataUrl: string) => {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
          audio.volume = volumeRef.current ? volumeRef.current / 100 : 0.5;
          audio.play().catch(e => console.log('Audio error', e));
        } catch(e) {}
        window.electronAPI.showNotification('Скриншот сделан', 'Скриншот сохранен и скопирован в буфер обмена', dataUrl);
      });
    }
    return () => {
      if (cleanupFn) cleanupFn();
    };
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
      const toolId = hash.replace('#', '').replace(/^\//, ''); // Handle both #/tool and #tool
      let size = getToolConfig(toolId)?.minSize;
      if (!size && toolId.startsWith('plugin-')) {
        size = { width: 400, height: 500 };
      }
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
    const height = Math.max(380, 20 + 16 + (Math.max(pinnedCount, 4) * 38) + 160);

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

    <div className="app-container" style={{ 
      flexDirection: isCompact ? 'column' : 'row', 
      height: '100vh',
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
        <Sidebar 
          isCompact={isCompact} 
          isMini={isMini} 
          miniAnimating={miniAnimating} 
          activeTab={activeTab} 
          plugins={plugins} 
          openToolOption={openToolOption} 
          toggleMini={toggleMini} 
          toggleCompact={toggleCompact} 
          takeScreenshot={takeScreenshot} 
          openPaint={openPaint} 
          isOpaque={isOpaque} 
          setIsOpaque={setIsOpaque} 
        />
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
