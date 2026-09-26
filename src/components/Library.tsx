import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';
import { Code, 
  Timer as TimerIcon, Hourglass, Pin, Calculator as CalculatorIcon, List, 
  StickyNote, FlaskConical, LineChart, BookOpen, FunctionSquare, Scale, 
  Globe, Terminal, MousePointerClick, Coins, LayoutGrid, Palette, Scissors, Keyboard, Sparkles, RefreshCcw, FolderPlus, X, Edit2, Trash2
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { TOOLS_REGISTRY } from '../config/toolsRegistry';

interface LibraryProps {
  onOpenTool: (toolId: string) => void;
  openPaint: () => void;
  takeScreenshot: () => void;
  plugins?: any[];
}

const ICONS: Record<string, any> = {
  stopwatch: TimerIcon,
  minitimer: Hourglass,
  reminders: Pin,
  calc: CalculatorIcon,
  tasks: List,
  notes: StickyNote,
  periodicTable: FlaskConical,
  desmos: LineChart,
  formulas: BookOpen,
  integrals: FunctionSquare,
  converter: Scale,
  worldClock: Globe,
  devTools: Terminal,
  autoclicker: MousePointerClick,
  numismatics: Coins,
  humanTyper: Keyboard,
  superHumanizer: Sparkles,
  creatorStudio: Code,
  screenshot: Scissors,
  paint: Palette,
};

export default function Library({ onOpenTool, openPaint, takeScreenshot, plugins = [] }: LibraryProps) {
  const { language, activeTools, pinnedTools, pinnedOrder, updateSettings, libraryFolders } = useSettings();
  const { isSm } = useWindowSize();

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const allTools = TOOLS_REGISTRY
    .filter(t => !['library', 'settings', 'image-editor'].includes(t.id))
    .map(tool => ({
      id: tool.id,
      icon: ICONS[tool.id] || LayoutGrid,
      name: tool.nameKey ? (t(language as Lang, tool.nameKey as any) || tool.defaultName) : tool.defaultName,
      customAction: tool.id === 'paint' ? openPaint : tool.id === 'screenshot' ? takeScreenshot : undefined
    }));

  const coreTools = allTools.filter(t => (activeTools as any)[t.id]);
  
  const pluginTools = plugins.map(p => {
    let IconComp = LayoutGrid;
    if (p.icon === 'Box') IconComp = LayoutGrid;
    return {
      id: `plugin-${p.id}`,
      icon: IconComp,
      name: p.name || 'Unknown Plugin',
      isPlugin: true
    };
  });

  const availableTools = [...coreTools, ...pluginTools];
  const folders = libraryFolders || [];
  const toolsInFolders = new Set(folders.flatMap(f => f.tools));
  const looseTools = availableTools.filter(t => !toolsInFolders.has(t.id));

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isNowPinned = !pinnedTools[id];
    let newOrder = [...pinnedOrder];
    
    if (isNowPinned && !newOrder.includes(id)) {
      newOrder.push(id);
    } else if (!isNowPinned) {
      newOrder = newOrder.filter(item => item !== id);
    }

    updateSettings({
      pinnedTools: { ...pinnedTools, [id]: isNowPinned },
      pinnedOrder: newOrder
    });
  };

  const resetToCore = () => {
    updateSettings({
      pinnedTools: { stopwatch: true, minitimer: true, reminders: true, calc: true, tasks: true, notes: true, screenshot: true, paint: true },
      pinnedOrder: ['stopwatch', 'minitimer', 'reminders', 'calc', 'tasks', 'notes', 'screenshot', 'paint']
    });
  };

  const createFolder = () => {
    const newFolder = {
      id: 'folder_' + Date.now(),
      name: language === 'ru' ? 'Новая папка' : 'New Folder',
      tools: []
    };
    updateSettings({ libraryFolders: [...folders, newFolder] });
  };

  const deleteFolder = (id: string) => {
    updateSettings({ libraryFolders: folders.filter(f => f.id !== id) });
    if (activeFolderId === id) setActiveFolderId(null);
  };

  const saveFolderName = () => {
    if (!editingFolderId) return;
    updateSettings({
      libraryFolders: folders.map(f => f.id === editingFolderId ? { ...f, name: folderNameInput } : f)
    });
    setEditingFolderId(null);
  };

  const onDragStart = (e: React.DragEvent, toolId: string) => {
    e.dataTransfer.setData('text/plain', toolId);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const onDropToFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    const toolId = e.dataTransfer.getData('text/plain');
    if (!toolId || toolId.startsWith('folder_')) return;

    const targetFolder = folders.find(f => f.id === targetFolderId);
    if (targetFolder && targetFolder.tools.includes(toolId)) return;

    const updatedFolders = folders.map(f => {
      if (f.id === targetFolderId) return { ...f, tools: [...f.tools, toolId] };
      return { ...f, tools: f.tools.filter(t => t !== toolId) };
    });
    updateSettings({ libraryFolders: updatedFolders });
  };

  const onDropToRoot = (e: React.DragEvent) => {
    e.preventDefault();
    const toolId = e.dataTransfer.getData('text/plain');
    if (!toolId || toolId.startsWith('folder_')) return;
    
    const updatedFolders = folders.map(f => ({ ...f, tools: f.tools.filter(t => t !== toolId) }));
    updateSettings({ libraryFolders: updatedFolders });
  };

  const renderTool = (tool: any) => {
    const isPinned = pinnedTools[tool.id];
    return (
      <div 
        key={tool.id}
        onClick={() => tool.customAction ? tool.customAction() : onOpenTool(tool.id)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          padding: '15px 10px', borderRadius: '16px', background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)', cursor: 'pointer', transition: 'all 0.2s',
          position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
          e.currentTarget.style.borderColor = 'var(--glass-border)';
        }}
        title={language === 'ru' ? 'Нажмите чтобы открыть. ПКМ чтобы закрепить.' : 'Click to open. Right click to pin.'}
        onContextMenu={(e) => { e.preventDefault(); togglePin(e, tool.id); }}
        draggable
        onDragStart={(e) => onDragStart(e, tool.id)}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <tool.icon size={24} />
        </div>
        <div style={{ fontSize: '0.85em', fontWeight: 500, textAlign: 'center', color: 'var(--text-main)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tool.name}
          {tool.isPlugin && <div style={{ position: 'absolute', top: '-25px', right: '-5px', fontSize: '0.65em', background: 'var(--accent)', color: '#fff', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>DLC</div>}
        </div>
        <button
          onClick={(e) => togglePin(e, tool.id)}
          style={{ position: 'absolute', top: '5px', right: '5px', background: isPinned ? 'var(--accent)' : 'rgba(128, 128, 128, 0.25)', color: isPinned ? '#000' : 'var(--text-muted)', border: isPinned ? 'none' : '1px solid var(--glass-border)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isPinned ? 1 : 0.6, transition: 'all 0.2s' }}
          title={isPinned ? (language === 'ru' ? 'Открепить' : 'Unpin') : (language === 'ru' ? 'Закрепить на панели' : 'Pin to sidebar')}
        >
          <Pin size={12} />
        </button>
      </div>
    );
  };

  const renderFolder = (folder: any) => {
    const toolsInside = folder.tools.map((id: string) => availableTools.find(t => t.id === id)).filter(Boolean);
    const miniTools = toolsInside.slice(0, 4);

    return (
      <div 
        key={folder.id}
        onClick={() => setActiveFolderId(folder.id)}
        onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder.id); }}
        onDragLeave={() => setDragOverFolder(null)}
        onDrop={(e) => onDropToFolder(e, folder.id)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          padding: '15px 10px', borderRadius: '16px', background: 'var(--bg-card)',
          border: `1px solid ${dragOverFolder === folder.id ? 'var(--accent)' : 'var(--glass-border)'}`, 
          cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
        }}
      >
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--glass-border)', display: 'grid',
          gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', padding: '4px'
        }}>
          {miniTools.map((t: any, i: number) => (
            <div key={i} style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <t.icon size={14} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.85em', fontWeight: 500, color: 'var(--text-main)', width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
           {folder.name}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', color: 'var(--text-main)' }}>
      {!isSm && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px 0 25px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
            <LayoutGrid size={16} style={{ marginRight: '8px' }} />
            {language === 'ru' ? 'Библиотека' : 'Library'}
          </h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={createFolder}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              <FolderPlus size={14} />
              {language === 'ru' ? 'Новая папка' : 'New Folder'}
            </button>
            <button 
              onClick={resetToCore}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '12px' }}
            >
              <RefreshCcw size={14} />
              {language === 'ru' ? 'Сброс' : 'Reset'}
            </button>
          </div>
        </div>
      )}
      
      <div 
        className="custom-scrollbar" 
        style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '20px', alignContent: 'start' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropToRoot}
      >
        {folders.map(renderFolder)}
        {looseTools.map(renderTool)}
      </div>

      {activeFolderId && (() => {
        const folder = folders.find(f => f.id === activeFolderId);
        if (!folder) return null;
        const toolsInside = folder.tools.map(id => availableTools.find(t => t.id === id)).filter(Boolean);
        
        return (
          <div 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
            onClick={() => setActiveFolderId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropToRoot}
          >
             <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', background: 'var(--bg-panel)', borderRadius: '24px', padding: '30px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                   {editingFolderId === folder.id ? (
                     <input 
                       autoFocus 
                       value={folderNameInput} 
                       onChange={e => setFolderNameInput(e.target.value)} 
                       onBlur={saveFolderName} 
                       onKeyDown={e => e.key === 'Enter' && saveFolderName()} 
                       style={{ background: 'var(--bg-input)', border: '1px solid var(--accent)', color: 'var(--text-main)', padding: '5px 10px', borderRadius: '8px', outline: 'none', fontSize: '18px', fontWeight: 'bold' }} 
                     />
                   ) : (
                     <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
                       {folder.name} 
                       <button onClick={() => { setEditingFolderId(folder.id); setFolderNameInput(folder.name); }} className="win-btn" title={language === 'ru' ? 'Переименовать' : 'Rename'}><Edit2 size={14}/></button>
                     </h2>
                   )}
                   <div style={{ display: 'flex', gap: '10px' }}>
                     <button className="win-btn" onClick={() => deleteFolder(folder.id)} title={language === 'ru' ? 'Удалить папку' : 'Delete folder'}><Trash2 size={16}/></button>
                     <button className="win-btn" onClick={() => setActiveFolderId(null)}><X size={20}/></button>
                   </div>
                </div>
                
                <div 
                  className="custom-scrollbar" 
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px', maxHeight: '50vh', overflowY: 'auto', padding: '10px' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropToFolder(e, folder.id)}
                >
                   {toolsInside.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>{language === 'ru' ? 'Папка пуста. Перетащите сюда плагины.' : 'Folder is empty. Drag plugins here.'}</div>}
                   {toolsInside.map(renderTool)}
                </div>
             </div>
          </div>
        );
      })()}
    </div>
  );
}
