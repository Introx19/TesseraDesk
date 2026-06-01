import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Trash2, Crop, Check, EyeOff, Eye, Eraser } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';

export default function ScreenshotPreview() {
  const { language } = useSettings();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  
  // Drawing & Mode state
  const [mode, setMode] = useState<'draw' | 'crop'>('draw');
  const [showToolbar, setShowToolbar] = useState(true);
  const [color, setColor] = useState('#ff3333');
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
  const [cropEnd, setCropEnd] = useState<{x: number, y: number} | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onScreenshotData((data) => {
        setDataUrl(data);
      });
    }
  }, []);

  useEffect(() => {
    if (dataUrl && canvasRef.current) {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
         if (canvasRef.current) {
           canvasRef.current.width = img.width;
           canvasRef.current.height = img.height;
           const ctx = canvasRef.current.getContext('2d');
           if (ctx) {
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
           }
         }
      };
    }
  }, [dataUrl]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const coords = getCoords(e);
    if (mode === 'draw') {
      lastPos.current = coords;
    } else if (mode === 'crop') {
      setCropStart(coords);
      setCropEnd(coords);
    }
  };

  const processInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const currentPos = getCoords(e);
    
    if (mode === 'draw') {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;
      
      ctx.beginPath();
      ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : color;
      ctx.lineWidth = isEraser ? Math.max(15, 15 * (canvasRef.current.width / 800)) : Math.max(4, 4 * (canvasRef.current.width / 800));
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; // reset
      
      lastPos.current = currentPos;
    } else if (mode === 'crop') {
      setCropEnd(currentPos);
    }
  };

  const stopInteraction = () => {
    setIsDrawing(false);
  };
  
  const applyCrop = () => {
    if (!cropStart || !cropEnd || !canvasRef.current || !dataUrl) {
      setMode('draw');
      return;
    }
    
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);

    if (w < 10 || h < 10) {
      setCropStart(null);
      setCropEnd(null);
      setMode('draw');
      return;
    }

    const mergedData = getMergedDataUrl();
    if (!mergedData) {
      setCropStart(null);
      setCropEnd(null);
      setMode('draw');
      return;
    }
    const img = new Image();
    img.src = mergedData;
    img.onload = () => {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = w;
      cropCanvas.height = h;
      const ctx = cropCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        const newDataUrl = cropCanvas.toDataURL('image/png');
        setDataUrl(newDataUrl);
        
        // Reset crop state
        setCropStart(null);
        setCropEnd(null);
        setMode('draw');
      }
    };
  };

  const cancelCrop = () => {
    setCropStart(null);
    setCropEnd(null);
    setMode('draw');
  };

  const clearCanvas = () => {
     const ctx = canvasRef.current?.getContext('2d');
     if (ctx && canvasRef.current) {
         ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
     }
  };

  const getMergedDataUrl = () => {
    if (!dataUrl || !canvasRef.current) return dataUrl;
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = canvasRef.current.width;
    mergedCanvas.height = canvasRef.current.height;
    const ctx = mergedCanvas.getContext('2d');
    if (ctx) {
       const img = new Image();
       img.src = dataUrl;
       ctx.drawImage(img, 0, 0);
       ctx.drawImage(canvasRef.current, 0, 0);
       return mergedCanvas.toDataURL('image/png');
    }
    return dataUrl;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (dataUrl && window.electronAPI) {
      const merged = getMergedDataUrl();
      if (merged) {
        window.electronAPI.showScreenshotMenu(merged, {
          saveAs: t(language as Lang, 'saveAs'),
          copy: t(language as Lang, 'copy'),
          openPaint: t(language as Lang, 'openPaint')
        });
      }
    }
  };

  const closeWindow = () => {
    if (window.electronAPI) {
      window.electronAPI.closePreviewWindow();
    }
  };

  const minimizeWindow = () => {
    if (window.electronAPI) {
      window.electronAPI.windowMinimize();
    }
  };

  const cropRect = cropStart && cropEnd ? {
    left: Math.min(cropStart.x, cropEnd.x),
    top: Math.min(cropStart.y, cropEnd.y),
    width: Math.abs(cropEnd.x - cropStart.x),
    height: Math.abs(cropEnd.y - cropStart.y),
  } : null;

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="titlebar-drag-region">
        <div className="titlebar-controls" style={{ marginLeft: 'auto' }}>
          <button className="win-btn" onClick={minimizeWindow}>
            <Minus size={14} />
          </button>
          <button className="win-btn close" onClick={closeWindow}>
            <X size={14} />
          </button>
        </div>
      </div>
      <div 
         style={{ flex: 1, padding: showToolbar ? '30px 20px 60px 20px' : '30px 20px 20px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', transition: 'padding 0.3s' }}
         onContextMenu={handleContextMenu}
         title={t(language as Lang, 'screenshotPreviewHint')}
      >
        {dataUrl ? (
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '100%', maxHeight: '100%', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden' }}>
             <img ref={imgRef} src={dataUrl} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Screenshot" draggable={false} />
             <canvas 
                ref={canvasRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: mode === 'crop' ? 'crosshair' : 'crosshair', touchAction: 'none' }}
                onMouseDown={startInteraction}
                onMouseMove={processInteraction}
                onMouseUp={stopInteraction}
                onMouseOut={stopInteraction}
                onTouchStart={startInteraction}
                onTouchMove={processInteraction}
                onTouchEnd={stopInteraction}
             />
             
             {/* Crop Overlay */}
             {mode === 'crop' && cropRect && (
               <div style={{
                 position: 'absolute',
                 left: 0, top: 0, right: 0, bottom: 0,
                 pointerEvents: 'none'
               }}>
                 {/* CSS pixels conversion: we need to scale canvas pixels back to CSS pixels */}
                 <div style={{
                    position: 'absolute',
                    border: '2px dashed #00a8ff',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                    // We must scale back based on canvas actual vs displayed size
                    left: `calc(${cropRect.left} / ${canvasRef.current?.width || 1} * 100%)`,
                    top: `calc(${cropRect.top} / ${canvasRef.current?.height || 1} * 100%)`,
                    width: `calc(${cropRect.width} / ${canvasRef.current?.width || 1} * 100%)`,
                    height: `calc(${cropRect.height} / ${canvasRef.current?.height || 1} * 100%)`,
                 }}>
                   {/* Sizes info */}
                   <div style={{
                      position: 'absolute',
                      bottom: '-25px',
                      right: 0,
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                   }}>
                      {Math.round(cropRect.width)} x {Math.round(cropRect.height)}
                   </div>
                 </div>
               </div>
             )}
          </div>
        ) : (
          <p>{t(language as Lang, 'screenshotPreviewLoading')}</p>
        )}
      </div>
      
      {dataUrl && (
        <>
          {/* Toggle Toolbar Button */}
          <button 
            style={{ 
              position: 'absolute', 
              bottom: showToolbar ? '60px' : '15px', 
              left: '20px', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--glass-border)', 
              color: 'var(--text-main)',
              padding: '6px', 
              borderRadius: '50%', 
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              zIndex: 20,
              transition: 'bottom 0.3s'
            }}
            onClick={() => setShowToolbar(!showToolbar)}
            title={showToolbar ? "Скрыть панель" : "Показать панель"}
          >
            {showToolbar ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          {/* Main Toolbar */}
          <div style={{ 
            position: 'absolute', 
            bottom: showToolbar ? '15px' : '-60px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            display: 'flex', 
            gap: '10px', 
            background: 'var(--bg-card)', 
            padding: '8px 15px', 
            borderRadius: '20px', 
            border: '1px solid var(--glass-border)', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)', 
            zIndex: 10,
            transition: 'bottom 0.3s',
            alignItems: 'center'
          }}>
             {mode === 'draw' ? (
               <>
                 <div style={{ display: 'flex', gap: '5px', borderRight: '1px solid var(--glass-border)', paddingRight: '10px', alignItems: 'center' }}>
                    {['#ff3333', '#33ff33', '#3388ff', '#ffff33', '#ffffff'].map(c => (
                      <button 
                        key={c}
                        onClick={() => { setColor(c); setIsEraser(false); }}
                        style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: !isEraser && color === c ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent', cursor: 'pointer', outline: 'none', transition: 'border 0.2s' }}
                        title="Цвет маркера"
                      />
                    ))}
                 </div>
                 <button 
                   className="win-btn" 
                   onClick={() => setIsEraser(!isEraser)} 
                   title="Ластик" 
                   style={{ padding: '4px 8px', color: isEraser ? 'var(--accent)' : 'var(--text-main)', background: isEraser ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                 >
                   <Eraser size={16} />
                 </button>
                 <button className="win-btn" onClick={clearCanvas} title="Удалить все рисунки" style={{ padding: '4px 8px' }}>
                   <Trash2 size={16} />
                 </button>
                 <div style={{ width: '1px', height: '16px', background: 'var(--glass-border)', margin: '0 2px' }} />
                 <button 
                   className="win-btn" 
                   onClick={() => setMode('crop')} 
                   title="Обрезать" 
                   style={{ padding: '4px 8px', color: 'var(--text-main)' }}
                 >
                   <Crop size={16} />
                 </button>
               </>
             ) : (
               <>
                 <span style={{ fontSize: '12px', opacity: 0.8, marginRight: '5px' }}>Выделите область</span>
                 <button 
                   className="win-btn" 
                   onClick={applyCrop} 
                   title="Применить обрезку" 
                   style={{ padding: '4px 8px', color: '#33ff33' }}
                 >
                   <Check size={16} />
                 </button>
                 <button 
                   className="win-btn" 
                   onClick={cancelCrop} 
                   title="Отмена" 
                   style={{ padding: '4px 8px', color: '#ff3333' }}
                 >
                   <X size={16} />
                 </button>
               </>
             )}
          </div>
        </>
      )}
    </div>
  );
}
