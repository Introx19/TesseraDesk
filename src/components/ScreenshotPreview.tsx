import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Trash2, Crop, Check, EyeOff, Eye, Eraser, Type, Loader2, ZoomIn, ZoomOut, MousePointer2 } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';

export default function ScreenshotPreview() {
  const { language } = useSettings();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  // Drawing & Mode state
  const [mode, setMode] = useState<'none' | 'draw' | 'crop' | 'ocr'>('none');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [color, setColor] = useState('#ff3333');
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [, setUndoStack] = useState<string[]>([]);

  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const [cropStart, setCropStart] = useState<{ x: number, y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number, y: number } | null>(null);

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
          setCanvasSize({ width: img.width, height: img.height });
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
      x: Math.max(0, Math.min((clientX - rect.left) * scaleX, canvas.width)),
      y: Math.max(0, Math.min((clientY - rect.top) * scaleY, canvas.height))
    };
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // If middle click or left click in 'none' mode, we might want to pan
    if ('button' in e && (e.button === 1 || (e.button === 0 && mode === 'none'))) {
      if (scale > 1) {
        setIsPanning(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    if ('button' in e && e.button !== 0) return; // Ignore other buttons for drawing/cropping

    setIsDrawing(true);
    const coords = getCoords(e);
    if (mode === 'draw') {
      lastPos.current = coords;
    } else if (mode === 'crop' || mode === 'ocr') {
      setCropStart(coords);
      setCropEnd(coords);
    }
  };

  const processInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning) {
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
      }
      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastPos.current = { x: clientX, y: clientY };
      return;
    }

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
      lastPos.current = currentPos;
    } else if (mode === 'crop' || mode === 'ocr') {
      setCropEnd(currentPos);
    }
  };

  const stopInteraction = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (isDrawing && mode === 'draw' && canvasRef.current) {
      setUndoStack(prev => [...prev, canvasRef.current!.toDataURL('image/png')].slice(-50));
    }
    setIsDrawing(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyZ' || e.key === 'z' || e.key === 'я')) {
        e.preventDefault();
        setUndoStack(prev => {
          if (prev.length === 0) return prev;
          const newStack = [...prev];
          newStack.pop(); // Remove current state

          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            if (newStack.length > 0) {
              const img = new Image();
              img.src = newStack[newStack.length - 1];
              img.onload = () => {
                ctx.drawImage(img, 0, 0);
              };
            }
          }
          return newStack;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to global mouse events to support dragging outside the canvas
  useEffect(() => {
    if (!isDrawing && !isPanning) return;
    const handleGlobalMouseMove = (e: MouseEvent | TouchEvent) => {
      processInteraction(e as any);
    };
    const handleGlobalMouseUp = () => {
      stopInteraction();
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalMouseMove);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDrawing, isPanning, mode, color, isEraser, scale]); // Include dependencies used in processInteraction

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
      if (mode === 'draw') {
        setUndoStack(prev => [...prev, canvasRef.current!.toDataURL('image/png')].slice(-50));
      }
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

  const runOcr = async () => {
    let mergedData = getMergedDataUrl();
    if (!mergedData) return;

    // If we have an OCR crop area, crop the image before OCR
    if (mode === 'ocr' && cropStart && cropEnd && canvasRef.current) {
      const x = Math.min(cropStart.x, cropEnd.x);
      const y = Math.min(cropStart.y, cropEnd.y);
      const w = Math.abs(cropEnd.x - cropStart.x);
      const h = Math.abs(cropEnd.y - cropStart.y);
      if (w >= 10 && h >= 10) {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = w;
        cropCanvas.height = h;
        const ctx = cropCanvas.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.src = mergedData;
          await new Promise(resolve => { img.onload = resolve; });
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          mergedData = cropCanvas.toDataURL('image/png');
        }
      }
    }

    setIsOcrRunning(true);
    try {
      const result = await Tesseract.recognize(mergedData, 'eng+rus+ukr');

      // Clean up text: keep only letters, numbers, punctuation, spaces, and newlines.
      // This removes emojis and weird symbols.
      const cleanedText = result.data.text
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      navigator.clipboard.writeText(cleanedText);
      if (window.electronAPI) {
        window.electronAPI.showNotification('OCR', t(language as Lang, 'ocrSuccess') || 'Text copied to clipboard!');
      }
    } catch (err) {
      console.error(err);
      if (window.electronAPI) {
        window.electronAPI.showNotification('OCR Error', t(language as Lang, 'ocrError') || 'Failed to recognize text.');
      }
    }
    setIsOcrRunning(false);
    setCropStart(null);
    setCropEnd(null);
    setMode('draw');
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
        onWheel={(e) => {
          e.preventDefault();
          const zoomSpeed = 0.002;
          const newScale = Math.min(Math.max(0.2, scale - e.deltaY * zoomSpeed), 5);
          setScale(newScale);
          // Auto-center pan when zooming out completely
          if (newScale <= 1) {
            setPan({ x: 0, y: 0 });
          }
        }}
      >
        {dataUrl ? (
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '100%', maxHeight: '100%', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', borderRadius: '8px', overflow: 'hidden', transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 0.1s' }}>
            <img ref={imgRef} src={dataUrl} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Screenshot" draggable={false} />
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: mode === 'none' ? (scale > 1 ? 'grab' : 'default') : 'crosshair', touchAction: 'none' }}
              onMouseDown={startInteraction}
              onTouchStart={startInteraction}
            />

            {/* Crop/OCR Overlay */}
            {(mode === 'crop' || mode === 'ocr') && cropRect && (
              <div style={{
                position: 'absolute',
                left: 0, top: 0, right: 0, bottom: 0,
                pointerEvents: 'none'
              }}>
                {/* CSS pixels conversion: we need to scale canvas pixels back to CSS pixels */}
                <div style={{
                  position: 'absolute',
                  border: mode === 'ocr' ? '2px dashed #ff9900' : '2px dashed #00a8ff',
                  backgroundColor: mode === 'ocr' ? 'rgba(255, 153, 0, 0.2)' : 'rgba(0,0,0,0.2)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  // We must scale back based on canvas actual vs displayed size
                  left: `calc(${cropRect.left} / ${canvasSize.width} * 100%)`,
                  top: `calc(${cropRect.top} / ${canvasSize.height} * 100%)`,
                  width: `calc(${cropRect.width} / ${canvasSize.width} * 100%)`,
                  height: `calc(${cropRect.height} / ${canvasSize.height} * 100%)`,
                }}>
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
            {mode === 'draw' || mode === 'none' ? (
              <>
                <div style={{ display: 'flex', gap: '5px', borderRight: '1px solid var(--glass-border)', paddingRight: '10px', alignItems: 'center' }}>
                  {['#ff3333', '#33ff33', '#3388ff', '#ffff33', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => { setMode('draw'); setColor(c); setIsEraser(false); }}
                      style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: mode === 'draw' && !isEraser && color === c ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent', cursor: 'pointer', outline: 'none', transition: 'border 0.2s' }}
                      title={language === 'ru' ? "Цвет маркера" : "Marker Color"}
                    />
                  ))}
                </div>
                <button
                  className="win-btn"
                  onClick={() => { setMode('draw'); setIsEraser(true); }}
                  title={language === 'ru' ? "Ластик" : "Eraser"}
                  style={{ padding: '4px 8px', color: mode === 'draw' && isEraser ? 'var(--accent)' : 'var(--text-main)', background: mode === 'draw' && isEraser ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                  <Eraser size={16} />
                </button>
                <button className="win-btn" onClick={clearCanvas} title={language === 'ru' ? "Удалить все рисунки" : "Clear All Drawings"} style={{ padding: '4px 8px' }}>
                  <Trash2 size={16} />
                </button>
                <button
                  className="win-btn"
                  onClick={() => setMode('none')}
                  title={language === 'ru' ? "Курсор / Перемещение" : "Cursor / Pan"}
                  style={{ padding: '4px 8px', color: mode === 'none' ? 'var(--accent)' : 'var(--text-main)', background: mode === 'none' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                  <MousePointer2 size={16} />
                </button>
                <div style={{ width: '1px', height: '16px', background: 'var(--glass-border)', margin: '0 2px' }} />
                <button
                  className="win-btn"
                  onClick={() => setMode('crop')}
                  title={language === 'ru' ? "Обрезать" : "Crop"}
                  style={{ padding: '4px 8px', color: (mode as any) === 'crop' ? 'var(--accent)' : 'var(--text-main)', background: (mode as any) === 'crop' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                  <Crop size={16} />
                </button>
                <button
                  className="win-btn"
                  onClick={() => setMode('ocr')}
                  title={language === 'ru' ? "Распознать текст (OCR)" : "Recognize text (OCR)"}
                  style={{ padding: '4px 8px', color: (mode as any) === 'ocr' ? 'var(--accent)' : 'var(--text-main)', opacity: isOcrRunning ? 0.5 : 1, pointerEvents: isOcrRunning ? 'none' : 'auto' }}
                >
                  {isOcrRunning ? <Loader2 size={16} className="spinner" /> : <Type size={16} />}
                </button>
                <div style={{ width: '1px', height: '16px', background: 'var(--glass-border)', margin: '0 2px' }} />
                <button className="win-btn" onClick={() => setScale(s => Math.min(5, s + 0.2))} style={{ padding: '4px 8px' }} title={language === 'ru' ? "Увеличить" : "Zoom In"}><ZoomIn size={16} /></button>
                <button className="win-btn" onClick={() => setScale(s => Math.max(0.2, s - 0.2))} style={{ padding: '4px 8px' }} title={language === 'ru' ? "Уменьшить" : "Zoom Out"}><ZoomOut size={16} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: '12px', opacity: 0.8, marginRight: '5px' }}>
                  {mode === 'ocr' ? (language === 'ru' ? 'Выделите текст для OCR' : 'Select text for OCR') : (language === 'ru' ? 'Выделите область' : 'Select region')}
                </span>
                {mode === 'ocr' && (!cropRect || cropRect.width === 0) && (
                  <button
                    className="win-btn"
                    onClick={runOcr}
                    title={language === 'ru' ? "Сканировать весь экран" : "Scan full image"}
                    style={{ padding: '4px 8px', color: '#ff9900' }}
                  >
                    {isOcrRunning ? <Loader2 size={16} className="spinner" /> : <Type size={16} />}
                    <span style={{ marginLeft: '5px', fontSize: '12px' }}>{language === 'ru' ? "Весь экран" : "Full Screen"}</span>
                  </button>
                )}
                {(mode !== 'ocr' || (cropRect && cropRect.width > 0)) && (
                  <button
                    className="win-btn"
                    onClick={mode === 'ocr' ? runOcr : applyCrop}
                    title={mode === 'ocr' ? (language === 'ru' ? "Распознать" : "Recognize") : (language === 'ru' ? "Применить обрезку" : "Apply crop")}
                    style={{ padding: '4px 8px', color: mode === 'ocr' ? '#ff9900' : '#33ff33' }}
                  >
                    {mode === 'ocr' && isOcrRunning ? <Loader2 size={16} className="spinner" /> : <Check size={16} />}
                  </button>
                )}
                <button
                  className="win-btn"
                  onClick={cancelCrop}
                  title={language === 'ru' ? "Отмена" : "Cancel"}
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
