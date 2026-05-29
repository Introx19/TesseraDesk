import React, { useState, useEffect, useRef } from 'react';
import { useWindowSize } from '../../hooks/useWindowSize';
import { compile } from 'mathjs';
import { Settings2, Plus, Trash2, Maximize2, Activity } from 'lucide-react';
// @ts-ignore
import nerdamer from 'nerdamer/all.min';
import { useSettings } from '../../contexts/SettingsContext';
import { t, type Lang } from '../../i18n/texts';

interface AnalysisResult {
  yInt?: string;
  roots?: string[];
  extrema?: string[];
  error?: string;
}

interface Equation {
  id: string;
  expr: string;
  color: string;
  error?: string;
  compiled?: any;
  showAnalysis?: boolean;
  analysis?: AnalysisResult;
}

const COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'
];

export default function Graphs() {
  const { isSm, width, height } = useWindowSize();
  const { language } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [equations, setEquations] = useState<Equation[]>(() => {
    const saved = localStorage.getItem('tesseradesk-graphs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: '1', expr: 'x^2 - 4', color: '#ef4444' }];
  });
  const [scale, setScale] = useState(50); // pixels per unit
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [showPanel, setShowPanel] = useState(!isSm);
  const [hoverPos, setHoverPos] = useState<{px: number, py: number, text: string, color: string} | null>(null);

  useEffect(() => {
    const toSave = equations.map(eq => ({ id: eq.id, expr: eq.expr, color: eq.color, showAnalysis: eq.showAnalysis }));
    localStorage.setItem('tesseradesk-graphs', JSON.stringify(toSave));
  }, [equations]);

  // Compile equations when they change
  useEffect(() => {
    setEquations(prev => prev.map((eq, idx) => {
      if (!eq.expr.trim()) return { ...eq, compiled: null, error: undefined, analysis: undefined };
      try {
        let lowerExpr = eq.expr.toLowerCase();
        
        // Derivative feature
        if (lowerExpr === "'" && idx > 0) {
          const prevEq = prev[idx - 1];
          if (prevEq && prevEq.expr && prevEq.expr !== "'") {
             lowerExpr = nerdamer(`diff(${prevEq.expr.toLowerCase()}, x)`).text();
          } else {
             return { ...eq, compiled: null, error: 'Нет функции сверху для взятия производной' };
          }
        }

        const compiled = compile(lowerExpr);
        // Test it
        compiled.evaluate({ x: 0, e: Math.E, pi: Math.PI });
        
        let analysis: AnalysisResult | undefined = undefined;
        if (eq.showAnalysis) {
           try {
             const yIntRaw = nerdamer(lowerExpr, { x: 0 }).text();
             let rootsRaw = nerdamer(`solve(${lowerExpr}, x)`).toString();
             let diffExpr = nerdamer(`diff(${lowerExpr}, x)`).text();
             let extremaRaw = nerdamer(`solve(${diffExpr}, x)`).toString();
             
             // Extract arrays from "[...]" string output
             const parseRoots = (raw: string) => {
               if (raw.startsWith('[') && raw.endsWith(']')) {
                 return raw.slice(1, -1).split(',').filter(r => r && !r.includes('i'));
               }
               return [];
             };
             
             analysis = {
               yInt: yIntRaw,
               roots: parseRoots(rootsRaw),
               extrema: parseRoots(extremaRaw).map(ex => {
                   const yVal = nerdamer(lowerExpr, { x: ex }).text();
                   return `(${ex}, ${yVal})`;
               })
             };
           } catch (e) {
             analysis = { error: 'Не удается анализировать' };
           }
        }
        
        return { ...eq, compiled, error: undefined, analysis };
      } catch (e: any) {
        return { ...eq, compiled: null, error: 'Ошибка синтаксиса' };
      }
    }));
  }, [equations.map(e => e.expr).join('||'), equations.map(e => e.showAnalysis).join('||')]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width;
    let h = canvas.height;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
         canvas.width = w * dpr;
         canvas.height = h * dpr;
      }
      ctx.scale(dpr, dpr);
    }

    const centerX = w / 2 + offsetX;
    const centerY = h / 2 + offsetY;

    // Clear background
    ctx.fillStyle = '#111'; // var(--bg-card) dark theme approx
    ctx.fillRect(0, 0, w, h);

    // Draw Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Vertical grid lines
    const startX = -Math.ceil(centerX / scale);
    const endX = Math.ceil((w - centerX) / scale);
    for (let i = startX; i <= endX; i++) {
        const x = centerX + i * scale;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }

    // Horizontal grid lines
    const startY = -Math.ceil(centerY / scale);
    const endY = Math.ceil((h - centerY) / scale);
    for (let i = startY; i <= endY; i++) {
        const y = centerY + i * scale;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Draw Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // X Axis
    if (centerY >= 0 && centerY <= h) {
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
    }
    // Y Axis
    if (centerX >= 0 && centerX <= w) {
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, h);
    }
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    // Draw x numbers
    for (let i = startX; i <= endX; i++) {
      if (i === 0) continue;
      const x = centerX + i * scale;
      const drawY = Math.max(15, Math.min(centerY + 15, h - 5));
      ctx.fillText(i.toString(), x + 3, drawY);
    }
    // Draw y numbers
    for (let i = startY; i <= endY; i++) {
      if (i === 0) continue;
      const y = centerY + i * scale;
      const drawX = Math.max(5, Math.min(centerX + 5, w - 20));
      ctx.fillText((-i).toString(), drawX, y - 3);
    }

    // Draw Equations
    equations.forEach(eq => {
      if (!eq.compiled) return;
      ctx.beginPath();
      ctx.strokeStyle = eq.color;
      ctx.lineWidth = 2.5;

      let first = true;
      // Evaluate every N pixels for speed (1 is highest quality)
      const step = 2; 
      
      for (let px = 0; px <= w; px += step) {
        // Pixel X to Mathematical X
        const mathX = (px - centerX) / scale;
        try {
          const mathY = eq.compiled.evaluate({ x: mathX, e: Math.E, pi: Math.PI });
          if (typeof mathY === 'number' && !isNaN(mathY) && isFinite(mathY)) {
            // Mathematical Y to Pixel Y
            const py = centerY - (mathY * scale);
            if (first) {
              ctx.moveTo(px, py);
              first = false;
            } else {
              ctx.lineTo(px, py);
            }
          } else {
            first = true;
          }
        } catch {
          first = true;
        }
      }
      ctx.stroke();
    });

  }, [equations, scale, offsetX, offsetY, width, height]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setOffsetX(prev => prev + dx);
      setOffsetY(prev => prev + dy);
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    // Hover tooltip tracking
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let closestX = 0;
    let closestY = 0;
    let minDist = 30; // maximum visual hover distance
    let found = false;
    let fText = '';
    let fColor = '';

    const centerX = rect.width / 2 + offsetX;
    const centerY = rect.height / 2 + offsetY;
    const mathX = (mouseX - centerX) / scale;
    
    equations.forEach(eq => {
      if (!eq.compiled) return;
      try {
        const mathY = eq.compiled.evaluate({ x: mathX, e: Math.E, pi: Math.PI });
        if (typeof mathY === 'number' && !isNaN(mathY)) {
          const py = centerY - (mathY * scale);
          const dist = Math.abs(mouseY - py);
          if (dist < minDist) {
            minDist = dist;
            closestX = mouseX; // Lock rigidly to X axis of mouse
            closestY = py;
            fText = `(${mathX.toFixed(2)}, ${mathY.toFixed(2)})`;
            fColor = eq.color;
            found = true;
          }
        }
      } catch (err) {}
    });

    if (found) {
      setHoverPos({ px: closestX, py: closestY, text: fText, color: fColor });
    } else {
      setHoverPos(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom in/out based on wheel delta
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    // Zoom towards center of screen (simple approach) or mouse cursor
    // For mouse cursor, we need to adjust offset:
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const w = rect.width;
      const h = rect.height;
      const centerX = w / 2 + offsetX;
      const centerY = h / 2 + offsetY;
      
      // mathematical coord of mouse
      const mathX = (mouseX - centerX) / scale;
      const mathY = (centerY - mouseY) / scale;
      
      const newScale = Math.max(5, Math.min(1000, scale * zoomFactor));
      
      // new center point relative to mouse
      const newOffsetX = mouseX - w/2 - mathX * newScale;
      const newOffsetY = mouseY - h/2 + mathY * newScale;
      
      setScale(newScale);
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
    }
  };

  const addEq = () => {
    const id = Date.now().toString();
    const color = COLORS[equations.length % COLORS.length];
    setEquations([...equations, { id, expr: '', color }]);
  };

  const removeEq = (id: string) => {
    setEquations(equations.filter(e => e.id !== id));
  };

  const updateEq = (id: string, expr: string) => {
    setEquations(equations.map(e => e.id === id ? { ...e, expr } : e));
  };
  
  const toggleAnalysis = (id: string) => {
    setEquations(equations.map(e => e.id === id ? { ...e, showAnalysis: !e.showAnalysis } : e));
  };

  return (
    <div className="panel" style={{ height: '100%', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!isSm && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px 10px' }}>
          <h2 style={{ margin: 0 }}>{t(language as Lang, 'graphsTitle')}</h2>
          <button className="btn" onClick={() => setShowPanel(!showPanel)}>
            {showPanel ? <Maximize2 size={16} /> : <Settings2 size={16} />}
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: isSm ? 'column' : 'row', overflow: 'hidden', position: 'relative' }}>
        
        {/* Editor Panel */}
        {(showPanel || isSm) && (
          <div style={{ 
            width: isSm ? '100%' : '300px', 
            background: 'var(--bg-card)', 
            borderRight: isSm ? 'none' : '1px solid var(--glass-border)',
            borderBottom: isSm ? '1px solid var(--glass-border)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
          }}>
            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', flex: 1 }}>
              {equations.map((eq) => (
                <div key={eq.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: eq.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>y = </span>
                    <input 
                      className="input" 
                      value={eq.expr} 
                      onChange={e => updateEq(eq.id, e.target.value)} 
                      placeholder="x^2 - 4"
                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.9em' }}
                    />
                    <button className={`win-btn ${eq.showAnalysis ? 'active' : ''}`} onClick={() => toggleAnalysis(eq.id)} title="G-Solve Аналитика" style={{ padding: '0', width: '24px', height: '24px', color: eq.showAnalysis ? 'var(--accent)' : 'inherit' }}>
                      <Activity size={14} />
                    </button>
                    {equations.length > 1 && (
                      <button className="win-btn" onClick={() => removeEq(eq.id)} style={{ padding: '0', width: '24px', height: '24px' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  {eq.error && <div style={{ fontSize: '0.75em', color: '#ef4444', paddingLeft: '35px' }}>{eq.error}</div>}
                  
                  {eq.showAnalysis && eq.analysis && (
                    <div style={{ marginLeft: '35px', marginRight: '6px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8em', color: 'var(--text-muted)' }}>
                      {eq.analysis.error ? (
                        <div style={{ color: '#f59e0b' }}>Невозможно выполнить G-Solve для данной функции.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ color: 'var(--text-main)', marginBottom: '2px' }}>{t(language as Lang, 'gsolveAnalysis')}</strong>
                          <div><span style={{ color: '#3b82f6' }}>{t(language as Lang, 'gsolveYint')}</span> {eq.analysis.yInt}</div>
                          <div><span style={{ color: '#10b981' }}>{t(language as Lang, 'gsolveRoots')}</span> {eq.analysis.roots?.length ? eq.analysis.roots.join(', ') : t(language as Lang, 'gsolveNone')}</div>
                          <div><span style={{ color: '#8b5cf6' }}>{t(language as Lang, 'gsolveExtrema')}</span> {eq.analysis.extrema?.length ? eq.analysis.extrema.join(', ') : t(language as Lang, 'gsolveNone')}</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                </div>
              ))}
              
              <button className="action-btn outline" onClick={addEq} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '6px', marginTop: '5px' }}>
                <Plus size={16} /> {t(language as Lang, 'graphsAdd')}
              </button>
            </div>
            <div style={{ padding: '15px', fontSize: '0.8em', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>
               {t(language as Lang, 'graphsHelp')}
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div 
          ref={wrapperRef}
          style={{ flex: 1, position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          <canvas 
            ref={canvasRef} 
            style={{ width: '100%', height: '100%', display: 'block' }} 
          />
          {hoverPos && (
            <div style={{
              position: 'absolute',
              left: hoverPos.px,
              top: hoverPos.py - 30, // Show above
              transform: 'translateX(-50%)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${hoverPos.color}`,
              pointerEvents: 'none',
              fontSize: '0.85em',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 10px ${hoverPos.color}44`,
              zIndex: 20
            }}>
              {hoverPos.text}
            </div>
          )}
        </div>

        {/* Reset View Button */}
        <button 
           className="action-btn"
           style={{ position: 'absolute', bottom: '15px', right: '15px', zIndex: 10, background: 'var(--bg-main)', opacity: 0.8 }}
           onClick={() => { setOffsetX(0); setOffsetY(0); setScale(50); }}
        >
          {t(language as Lang, 'graphsRecenter')}
        </button>

      </div>
    </div>
  );
}
