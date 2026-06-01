import { useState, useEffect, useRef } from 'react';
import { Trash2, Image as ImageIcon, Bold, Italic, Strikethrough, List, CheckSquare } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';
import { useModal } from '../contexts/ModalContext';

export default function Notes() {
  const { isXs, isSm } = useWindowSize();
  const { language } = useSettings();
  const modal = useModal();
  const editorRef = useRef<HTMLDivElement>(null);
  
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

  const applyFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
    if (editorRef.current) setNoteHTML(editorRef.current.innerHTML);
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
             <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', padding: '5px', background: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
          <button className="action-btn outline" style={{ padding: '4px 8px' }} onClick={() => applyFormat('bold')} title="Bold"><Bold size={16} /></button>
          <button className="action-btn outline" style={{ padding: '4px 8px' }} onClick={() => applyFormat('italic')} title="Italic"><Italic size={16} /></button>
          <button className="action-btn outline" style={{ padding: '4px 8px' }} onClick={() => applyFormat('strikeThrough')} title="Strikethrough"><Strikethrough size={16} /></button>
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>
          <button className="action-btn outline" style={{ padding: '4px 8px' }} onClick={() => applyFormat('insertUnorderedList')} title="List"><List size={16} /></button>
          <button className="action-btn outline" style={{ padding: '4px 8px' }} onClick={insertCheckbox} title="Checkbox"><CheckSquare size={16} /></button>
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
