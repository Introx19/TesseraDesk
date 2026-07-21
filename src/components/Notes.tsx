import { useState, useEffect, useRef } from 'react';
import { Trash2, Image as ImageIcon, Bold, Italic, Strikethrough, List, CheckSquare, Download, Upload, Highlighter, Eraser } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';
import { useModal } from '../contexts/ModalContext';

export default function Notes() {
  const { isXs, isSm } = useWindowSize();
  const { language } = useSettings();
  const modal = useModal();
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strikeThrough: false,
    insertUnorderedList: false
  });
  
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tesseradesk-recent-colors') || '[]');
    } catch {
      return ['#fef08a', '#bbf7d0', '#fbcfe8', '#bfdbfe', '#e9d5ff'];
    }
  });
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  
  const [noteHTML, setNoteHTML] = useState(() => {
    // Migrate old plain text to HTML gracefully
    const oldHtml = localStorage.getItem('tesseradesk-note-html');
    if (oldHtml !== null) return oldHtml;
    
    // Fallback if old plain-text notes exist
    const oldText = localStorage.getItem('tesseradesk-note') || '';
    return oldText; 
  });
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !initialLoadRef.current) {
      editorRef.current.innerHTML = noteHTML;
      initialLoadRef.current = true;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tesseradesk-note-html', noteHTML);
  }, [noteHTML]);

  useEffect(() => {
    if (recentColors.length > 0) {
      localStorage.setItem('tesseradesk-recent-colors', JSON.stringify(recentColors));
    }
  }, [recentColors]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        setActiveFormats({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          insertUnorderedList: document.queryCommandState('insertUnorderedList')
        });
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setNoteHTML(e.currentTarget.innerHTML);
  };

  const clearNote = async () => {
    if (await modal.confirm(t(language as Lang, 'clearNoteConfirm'))) {
      setNoteHTML('');
      if (editorRef.current) {
         editorRef.current.innerHTML = '';
      }
    }
  };

  const applyFormat = (e: React.MouseEvent, command: string, value: string = '') => {
    e.preventDefault(); // Prevent losing focus from the editor
    document.execCommand(command, false, value);
    if (editorRef.current) setNoteHTML(editorRef.current.innerHTML);
    if (command !== 'hiliteColor') {
      setActiveFormats(prev => ({ ...prev, [command]: document.queryCommandState(command) }));
    }
  };

  const applyHighlight = (e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>, color: string, closePicker: boolean = false) => {
    e.preventDefault();
    document.execCommand('hiliteColor', false, color);
    
    // Add to recent colors if not already there, keep max 5
    if (color !== 'transparent') {
      setRecentColors(prev => {
        const filtered = prev.filter(c => c !== color);
        return [color, ...filtered].slice(0, 5);
      });
    }
    if (closePicker) setShowColorPicker(false);
  };

  const exportNotes = () => {
    const blob = new Blob([noteHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TesseraDesk_Notes_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importNotes = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setNoteHTML(content);
          if (editorRef.current) editorRef.current.innerHTML = content;
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const insertCheckbox = () => {
    const html = `<input type="checkbox" style="margin-right: 8px; cursor: pointer;">&nbsp;`;
    document.execCommand('insertHTML', false, html);
    editorRef.current?.focus();
    if (editorRef.current) setNoteHTML(editorRef.current.innerHTML);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      if (checkbox.checked) {
        checkbox.setAttribute('checked', 'checked');
      } else {
        checkbox.removeAttribute('checked');
      }
      setTimeout(() => {
        if (editorRef.current) setNoteHTML(editorRef.current.innerHTML);
      }, 0);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 800; // Limit size so it doesn't break localStorage
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No context');
          
          ctx.drawImage(img, 0, 0, width, height);
          // Compress significantly so localstorage doesn't crash 
          resolve(canvas.toDataURL('image/jpeg', 0.6)); 
        };
        img.onerror = reject;
        if (e.target?.result) {
            img.src = e.target.result as string;
        } else {
            reject('No result');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const insertCompressedImage = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) return;
      const base64 = await compressImage(file);
      
      // Focus if needed
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.focus();
      }
      
      document.execCommand('insertImage', false, base64);
      if (editorRef.current) {
        setNoteHTML(editorRef.current.innerHTML);
      }
    } catch (err) {
      console.error('Image compression failed', err);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      Array.from(e.clipboardData.files).forEach(file => {
        insertCompressedImage(file);
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    editorRef.current?.focus();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        insertCompressedImage(file);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: isXs || isSm ? '4px' : undefined }}>
      {!isXs && !isSm && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>{t(language as Lang, 'notes')}</h2>
           <div style={{ display: 'flex', gap: '8px' }}>
             <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '5px' }}>
                 <ImageIcon size={14} /> {t(language as Lang, 'supportsImages')}
             </div>
             {noteHTML.trim() && (
               <button 
                 className="win-btn close" 
                 onClick={clearNote}
                 title={t(language as Lang, 'clear')}
               >
                 <Trash2 size={16} />
               </button>
             )}
          </div>
        </div>
      )}
      
      {!isXs && !isSm && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', padding: '5px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', position: 'relative' }}>
          <button className="action-btn" style={{ padding: '4px 8px', background: activeFormats.bold ? 'var(--accent)' : 'transparent', color: activeFormats.bold ? '#000' : 'var(--text-main)', border: activeFormats.bold ? '1px solid var(--accent)' : '1px solid var(--glass-border)' }} onMouseDown={(e) => applyFormat(e, 'bold')} title="Bold"><Bold size={16} /></button>
          <button className="action-btn" style={{ padding: '4px 8px', background: activeFormats.italic ? 'var(--accent)' : 'transparent', color: activeFormats.italic ? '#000' : 'var(--text-main)', border: activeFormats.italic ? '1px solid var(--accent)' : '1px solid var(--glass-border)' }} onMouseDown={(e) => applyFormat(e, 'italic')} title="Italic"><Italic size={16} /></button>
          <button className="action-btn" style={{ padding: '4px 8px', background: activeFormats.strikeThrough ? 'var(--accent)' : 'transparent', color: activeFormats.strikeThrough ? '#000' : 'var(--text-main)', border: activeFormats.strikeThrough ? '1px solid var(--accent)' : '1px solid var(--glass-border)' }} onMouseDown={(e) => applyFormat(e, 'strikeThrough')} title="Strikethrough"><Strikethrough size={16} /></button>
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>
          <button className="action-btn" style={{ padding: '4px 8px', background: activeFormats.insertUnorderedList ? 'var(--accent)' : 'transparent', color: activeFormats.insertUnorderedList ? '#000' : 'var(--text-main)', border: activeFormats.insertUnorderedList ? '1px solid var(--accent)' : '1px solid var(--glass-border)' }} onMouseDown={(e) => applyFormat(e, 'insertUnorderedList')} title="List"><List size={16} /></button>
          <button className="action-btn" style={{ padding: '4px 8px', border: '1px solid var(--glass-border)', background: 'transparent' }} onClick={insertCheckbox} title="Checkbox"><CheckSquare size={16} /></button>
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>
          <div style={{ position: 'relative' }}>
            <button 
              className="action-btn" 
              style={{ padding: '4px 8px', border: showColorPicker ? '1px solid var(--accent)' : '1px solid var(--glass-border)', background: showColorPicker ? 'rgba(255,255,255,0.05)' : 'transparent' }} 
              onClick={() => setShowColorPicker(!showColorPicker)} 
              title="Highlight"
            >
              <Highlighter size={16} />
            </button>
            
            {showColorPicker && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 100, 
                background: 'var(--bg-card)', border: '1px solid var(--glass-border)', 
                borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {recentColors.map((color, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => applyHighlight(e, color, true)}
                      style={{
                        width: '24px', height: '24px', borderRadius: '4px', background: color, 
                        border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer'
                      }}
                      title={color}
                    />
                  ))}
                  <button
                    onMouseDown={(e) => applyHighlight(e, 'transparent', true)}
                    style={{
                      width: '24px', height: '24px', borderRadius: '4px', background: 'transparent', 
                      border: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'
                    }}
                    title="Remove Highlight"
                  >
                    <Eraser size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                   <input 
                     ref={colorInputRef}
                     type="color" 
                     onChange={(e) => applyHighlight(e, e.target.value, false)}
                     onBlur={() => setShowColorPicker(false)}
                     style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} 
                   />
                   <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Custom</span>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>
          <button className="action-btn" style={{ padding: '4px 8px', border: '1px solid var(--glass-border)', background: 'transparent' }} onClick={importNotes} title={t(language as Lang, 'import' as any) || 'Import'}><Upload size={16} /></button>
          <button className="action-btn" style={{ padding: '4px 8px', border: '1px solid var(--glass-border)', background: 'transparent' }} onClick={exportNotes} title={t(language as Lang, 'export' as any) || 'Export'}><Download size={16} /></button>
        </div>
      )}

      <div
        ref={editorRef}
        className="task-input rich-editor custom-scrollbar"
        contentEditable
        onInput={handleInput}
        onClick={handleEditorClick}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        suppressContentEditableWarning={true}
        style={{
          flex: 1,
          padding: '15px',
          fontFamily: 'inherit',
          fontSize: '1em',
          lineHeight: '1.5',
          background: 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '1px solid var(--glass-border)',
          borderRadius: '8px',
          outline: 'none',
          overflowY: 'auto',
          wordWrap: 'break-word'
        }}
        data-placeholder={t(language as Lang, 'notesPlaceholder')}
      />
    </div>
  );
}
