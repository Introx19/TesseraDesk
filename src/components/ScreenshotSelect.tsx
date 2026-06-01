import React, { useState, useEffect } from 'react';
import { Square, Maximize, X } from 'lucide-react';

const ScreenshotSelect: React.FC = () => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [mode, setMode] = useState<'rectangle' | 'fullscreen'>('rectangle');

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    
    if (window.electronAPI) {
      window.electronAPI.onScreenshotData((data) => {
        setDataUrl(data);
      });
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI?.closePreviewWindow();
        window.close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dataUrl) return;
    if ((e.target as HTMLElement).closest('.screenshot-toolbar')) return;

    if (mode === 'fullscreen') {
      captureFullScreen();
      return;
    }

    setIsDrawing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const captureFullScreen = () => {
    if (!dataUrl) return;
    const settingsStr = localStorage.getItem('tesseradesk-settings');
    let multiMode = false;
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        multiMode = !!settings.multiScreenshot;
      } catch (e) {}
    }
    window.electronAPI?.sendCroppedScreenshot(dataUrl, multiMode);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !dataUrl) return;
    setIsDrawing(false);
    
    const cssX = Math.min(startPos.x, currentPos.x);
    const cssY = Math.min(startPos.y, currentPos.y);
    const cssWidth = Math.abs(currentPos.x - startPos.x);
    const cssHeight = Math.abs(currentPos.y - startPos.y);

    if (cssWidth < 5 || cssHeight < 5) {
      // Too small, probably a click, just cancel
      window.electronAPI?.closePreviewWindow();
      return;
    }

    const scale = window.devicePixelRatio || 1;
    const x = cssX * scale;
    const y = cssY * scale;
    const width = cssWidth * scale;
    const height = cssHeight * scale;

    const img = new Image();
    img.src = dataUrl;
    await new Promise(resolve => img.onload = resolve);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      const croppedDataUrl = canvas.toDataURL('image/png');
      
      const settingsStr = localStorage.getItem('tesseradesk-settings');
      let multiMode = false;
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr);
          multiMode = !!settings.multiScreenshot;
        } catch (e) {}
      }
      
      window.electronAPI?.sendCroppedScreenshot(croppedDataUrl, multiMode);
    }
  };

  if (!dataUrl) return null;

  const rectLeft = Math.min(startPos.x, currentPos.x);
  const rectTop = Math.min(startPos.y, currentPos.y);
  const rectWidth = Math.abs(currentPos.x - startPos.x);
  const rectHeight = Math.abs(currentPos.y - startPos.y);

  return (
    <div 
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'crosshair',
        backgroundImage: `url(${dataUrl})`,
        backgroundSize: '100vw 100vh',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Dim overlay using borders to leave a transparent hole */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        borderStyle: 'solid',
        borderColor: 'rgba(0,0,0,0.5)',
        borderTopWidth: isDrawing ? rectTop : (mode === 'rectangle' ? windowSize.height : 0),
        borderBottomWidth: isDrawing ? windowSize.height - rectTop - rectHeight : 0,
        borderLeftWidth: isDrawing ? rectLeft : 0,
        borderRightWidth: isDrawing ? windowSize.width - rectLeft - rectWidth : 0,
        boxSizing: 'border-box',
        pointerEvents: 'none',
        transition: isDrawing ? 'none' : 'border-width 0.2s'
      }}>
        {isDrawing && (
          <div style={{ width: '100%', height: '100%', border: '1px solid #00a8ff', boxSizing: 'border-box', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              bottom: '-25px',
              right: '-1px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}>
              {Math.round(rectWidth)} x {Math.round(rectHeight)}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toolbar */}
      <div className="screenshot-toolbar" style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        background: 'rgba(30, 30, 30, 0.8)',
        backdropFilter: 'blur(10px)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        zIndex: 100
      }}>
        <button 
          style={{ background: mode === 'rectangle' ? 'rgba(255,255,255,0.2)' : 'transparent', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={(e) => { e.stopPropagation(); setMode('rectangle'); }}
          title="Прямоугольник"
        >
          <Square size={16} />
        </button>
        <button 
          style={{ background: mode === 'fullscreen' ? 'rgba(255,255,255,0.2)' : 'transparent', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={(e) => { e.stopPropagation(); setMode('fullscreen'); }}
          title="Весь экран"
        >
          <Maximize size={16} />
        </button>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
        <button 
          style={{ background: 'transparent', border: 'none', color: '#ff4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={(e) => { e.stopPropagation(); window.electronAPI?.closePreviewWindow(); window.close(); }}
          title="Отмена"
        >
          <X size={16} />
        </button>
      </div>

    </div>
  );
};

export default ScreenshotSelect;
