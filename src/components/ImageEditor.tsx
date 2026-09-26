import { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { t, type Lang } from '../i18n/texts';
import * as fabric from 'fabric';
import {
  MousePointer2, Pen, Eraser, Square, Circle,
  Minus, ArrowRight, Type, Download, Trash2, X, Save,
  Hash, Undo2, Redo2, ArrowUpToLine, ArrowDownToLine,
  Highlighter, PaintBucket, Pipette,
  Eye, EyeOff, Plus, Layers as LayersIcon, Triangle,
  Wind, Bold, Italic, Underline, GripVertical, Star,
  Diamond, Pentagon, AlignCenter, ChevronRight,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────
type DrawMode =
  | 'select' | 'draw' | 'marker' | 'spray' | 'chalk' | 'eraser'
  | 'rect' | 'roundrect' | 'circle' | 'triangle' | 'diamond' | 'pentagon' | 'star'
  | 'line' | 'arrow'
  | 'text' | 'step' | 'pipette' | 'fill';

interface Layer { id: string; name: string; visible: boolean; }

// ─── 80-colour palette ─────────────────────────────────────────────────
const PALETTE: string[] = [
  '#000000','#1c1c1c','#383838','#555555','#717171','#8e8e8e','#aaaaaa','#c6c6c6','#e2e2e2','#ffffff',
  '#3d0000','#7a0000','#b80000','#e53935','#ef5350','#ef9a9a','#ffcdd2','#ff8a80','#ff5252','#dd2c00',
  '#3e2100','#7c4300','#bf6900','#f57c00','#ff9800','#ffb74d','#ffe0b2','#ff6d00','#ff9100','#ffab40',
  '#3d3800','#7a7100','#b8aa00','#fdd835','#ffee58','#fff176','#fff9c4','#f9a825','#f57f17','#ffca28',
  '#003d00','#007a00','#00b800','#43a047','#66bb6a','#a5d6a7','#c8e6c9','#00c853','#2e7d32','#1b5e20',
  '#003d3d','#007a7a','#00b8b8','#00838f','#26c6da','#80deea','#b2ebf2','#00e5ff','#006064','#00b8d4',
  '#00003d','#00007a','#0000b8','#1565c0','#42a5f5','#90caf9','#bbdefb','#2962ff','#0091ea','#448aff',
  '#3d003d','#7a007a','#b800b8','#7b1fa2','#ab47bc','#ce93d8','#e1bee7','#aa00ff','#6200ea','#d500f9',
];

const FONTS = [
  { label: 'Inter',   value: 'Inter, sans-serif' },
  { label: 'Arial',   value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
  { label: 'Impact',  value: 'Impact, sans-serif' },
];

const PAPER_W = 1642;
const PAPER_H = 855;
const SIDEBAR_W = 194;


function starPoints(outerR: number, innerR: number): {x:number;y:number}[] {
  return Array.from({length:10},(_,i) => {
    const a = (i*Math.PI)/5 - Math.PI/2;
    const r = i%2===0 ? outerR : innerR;
    return { x: outerR + r*Math.cos(a), y: outerR + r*Math.sin(a) };
  });
}
function polygonPoints(sides: number, rx: number, ry: number): {x:number;y:number}[] {
  return Array.from({length:sides},(_,i)=>{
    const a = (i*2*Math.PI)/sides - Math.PI/2;
    return { x: rx + rx*Math.cos(a), y: ry + ry*Math.sin(a) };
  });
}

// ─── Main Component ────────────────────────────────────────────────────
export default function ImageEditor() {
  const { language } = useSettings();
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const fabricRef        = useRef<fabric.Canvas|null>(null);
  const naturalSizeRef   = useRef({ w: PAPER_W, h: PAPER_H });
  const canvasScrollRef  = useRef<HTMLDivElement>(null);
  const canvasCenteringRef = useRef<HTMLDivElement>(null);
  const resizeStateRef   = useRef<{ active: boolean, type: string, startX: number, startY: number, startW: number, startH: number, objs: {obj: fabric.Object, left: number, top: number}[] } | null>(null);

  const isDrawingShape = useRef(false);
  const startPos       = useRef({ x:0, y:0 });
  const activeShape    = useRef<fabric.Object|null>(null);

  const isSprayingRef  = useRef(false);
  const sprayDotsRef   = useRef<fabric.Circle[]>([]);

  const isSpaceDownRef = useRef(false);
  const isDraggingRef  = useRef(false);
  const lastPosRef     = useRef({ x:0, y:0 });

  const historyRef      = useRef<string[]>([]);
  const historyIdxRef   = useRef(-1);
  const isUndoingRef    = useRef(false);

  const [mode,       setMode]       = useState<DrawMode>('draw');
  const [color,      setColor]      = useState('#ff3333');
  const [strokeW,    setStrokeW]    = useState(5);
  const [stepCnt,    setStepCnt]    = useState(1);
  const [zoom,       setZoom]       = useState(1);
  const [canvasSize, setCanvasSize] = useState({ w:PAPER_W, h:PAPER_H });

  const [layers,        setLayers]        = useState<Layer[]>([
    { id:'bg',      name:'Background', visible:true },
    { id:'layer-1', name:'Layer 1',    visible:true },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');
  const [showLayers,    setShowLayers]    = useState(false);
  const dragLayerIdRef  = useRef<string|null>(null);

  const [textFont,      setTextFont]      = useState('Inter, sans-serif');
  const [textSize,      setTextSize]      = useState(32);
  const [textBold,      setTextBold]      = useState(false);
  const [textItalic,    setTextItalic]    = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [selIsText,     setSelIsText]     = useState(false);
  const [showClose,     setShowClose]     = useState(false);

  const stateRef = useRef({ mode, color, strokeW, stepCnt, activeLayerId });
  useEffect(() => {
    stateRef.current = { mode, color, strokeW, stepCnt, activeLayerId };
  }, [mode, color, strokeW, stepCnt, activeLayerId]);

  // ─── History ─────────────────────────────────────────────────────────
  const saveHistory = useCallback(() => {
    if (isUndoingRef.current || !fabricRef.current) return;
    try {
      const json = JSON.stringify(fabricRef.current.toJSON());
      const next = historyRef.current.slice(0, historyIdxRef.current+1);
      next.push(json);
      if (next.length > 50) next.shift();
      historyRef.current = next;
      historyIdxRef.current = next.length-1;
    } catch(e) { console.error(e); }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    isUndoingRef.current = true;
    historyIdxRef.current--;
    fabricRef.current?.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current])).then(()=>{
      fabricRef.current?.renderAll(); isUndoingRef.current = false;
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length-1) return;
    isUndoingRef.current = true;
    historyIdxRef.current++;
    fabricRef.current?.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current])).then(()=>{
      fabricRef.current?.renderAll(); isUndoingRef.current = false;
    });
  }, []);

  // ─── Electron / Paste ─────────────────────────────────────────────────
  useEffect(() => {
    const addImageLayer = (src: string) => {
      // If fabric is not ready, try again shortly
      if (!fabricRef.current) {
        setTimeout(() => addImageLayer(src), 50);
        return;
      }
      
      const ImageClass = (fabric as any).FabricImage || (fabric as any).Image;
      if (!ImageClass) {
        console.error("No Fabric Image class available");
        return;
      }

      ImageClass.fromURL(src).then((img: any) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        (img as any).layerId = stateRef.current.activeLayerId;
        
        const imgW = img.width || 0;
        const imgH = img.height || 0;
        
        let left = 0;
        let top = 0;
        const currentZoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;
        
        if (vpt) {
          const centerX = (canvas.getWidth() / 2 - vpt[4]) / currentZoom;
          const centerY = (canvas.getHeight() / 2 - vpt[5]) / currentZoom;
          left = centerX - imgW / 2;
          top = centerY - imgH / 2;
        }

        // Clamp to avoid negative coordinates (clipping on top/left)
        if (left < 0) left = 0;
        if (top < 0) top = 0;

        img.set({ left, top, originX: 'left', originY: 'top' });

        // Check if we need to expand the canvas right/bottom
        const neededW = Math.ceil(left + imgW);
        const neededH = Math.ceil(top + imgH);
        let currentW = naturalSizeRef.current.w;
        let currentH = naturalSizeRef.current.h;
        let expanded = false;

        if (neededW > currentW) { currentW = neededW; expanded = true; }
        if (neededH > currentH) { currentH = neededH; expanded = true; }

        if (expanded) {
          naturalSizeRef.current = { w: currentW, h: currentH };
          setCanvasSize({ w: currentW, h: currentH });
          const displayW = Math.round(currentW * currentZoom);
          const displayH = Math.round(currentH * currentZoom);
          canvas.setDimensions({ width: displayW, height: displayH });

          const centerEl = canvasCenteringRef.current;
          if (centerEl) {
            const PADDING = 80;
            const cont = canvasScrollRef.current;
            const cW = cont ? cont.clientWidth : 0;
            const cH = cont ? cont.clientHeight : 0;
            const wrapperW = Math.max(cW, displayW + PADDING * 2);
            const wrapperH = Math.max(cH, displayH + PADDING * 2);
            centerEl.style.width = wrapperW + 'px';
            centerEl.style.height = wrapperH + 'px';
          }
        }
        
        const isFirstImage = canvas.getObjects().length === 0;
        canvas.add(img); canvas.setActiveObject(img);
        
        if (isFirstImage) {
          const fitImage = () => {
            const cont = canvasScrollRef.current;
            if (cont && fabricRef.current) {
              const PADDING = 30;
              const cW = cont.clientWidth;
              const cH = cont.clientHeight;
              if (cW > 10 && cH > 10) {
                const currentW = naturalSizeRef.current.w;
                const currentH = naturalSizeRef.current.h;
                const fitZ = Math.min((cW - PADDING * 2) / currentW, (cH - PADDING * 2) / currentH, 1.0);
                const finalZ = Math.max(fitZ, 0.05);
                fabricRef.current.setZoom(finalZ);
                setZoom(finalZ);
                const displayW = Math.round(currentW * finalZ);
                const displayH = Math.round(currentH * finalZ);
                fabricRef.current.setDimensions({ width: displayW, height: displayH });
                
                const centerEl = canvasCenteringRef.current;
                if (centerEl) {
                  const wrapperW = Math.max(cW, displayW + PADDING * 2);
                  const wrapperH = Math.max(cH, displayH + PADDING * 2);
                  centerEl.style.width = wrapperW + 'px';
                  centerEl.style.height = wrapperH + 'px';
                }
                fabricRef.current.renderAll();
              }
            }
          };
          fitImage();
          setTimeout(fitImage, 200);
        }

        canvas.renderAll(); saveHistory();

        // Scroll to the exact center of the pasted image
        setTimeout(() => {
          const cont = canvasScrollRef.current;
          if (!cont) return;
          const cW = cont.clientWidth;
          const cH = cont.clientHeight;
          
          const z = canvas.getZoom();
          const displayW = Math.round(naturalSizeRef.current.w * z);
          const displayH = Math.round(naturalSizeRef.current.h * z);
          
          const centerEl = canvasCenteringRef.current;
          const wrapperW = centerEl ? parseInt(centerEl.style.width || '0', 10) : 0;
          const wrapperH = centerEl ? parseInt(centerEl.style.height || '0', 10) : 0;
          
          const canvasOffsetLeft = (wrapperW - displayW) / 2;
          const canvasOffsetTop = (wrapperH - displayH) / 2;
          
          const imgCenterX = canvasOffsetLeft + (left + imgW / 2) * z;
          const imgCenterY = canvasOffsetTop + (top + imgH / 2) * z;
          
          cont.scrollLeft = Math.round(imgCenterX - cW / 2);
          cont.scrollTop  = Math.round(imgCenterY - cH / 2);
        }, 0);
      });
    };

    let cleanupScreenshot: (() => void) | undefined;
    let cleanupAddLayer: (() => void) | undefined;
    if (window.electronAPI) {
      cleanupScreenshot = window.electronAPI.onScreenshotData(dataUrl => {
        if (dataUrl) addImageLayer(dataUrl);
      });
      cleanupAddLayer = window.electronAPI.onAddScreenshotLayer(dataUrl => {
        if (dataUrl) addImageLayer(dataUrl);
      });
      window.electronAPI.requestScreenshotData?.();
    }

    const onPaste = (e: ClipboardEvent) => {
      if (!fabricRef.current || !e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile(); if (!blob) continue;
          const reader = new FileReader();
          reader.onload = ev => {
            const src = ev.target?.result as string; if (!src) return;
            addImageLayer(src);
          };
          reader.readAsDataURL(blob); break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
      if (cleanupScreenshot) cleanupScreenshot();
      if (cleanupAddLayer) cleanupAddLayer();
    };
  }, [saveHistory]);

  // ─── Canvas init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }

    let canvas: fabric.Canvas;

    const init = () => {
      let w = PAPER_W, h = PAPER_H;

      naturalSizeRef.current = { w, h };
      setCanvasSize({ w, h });

      canvas = new fabric.Canvas(canvasRef.current!, {
        width: w, height: h,
        backgroundColor: 'white',
        isDrawingMode: true,
        selection: false,         // start with selection disabled (draw mode)
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;


      canvas.renderAll();
      saveHistory();

      if (window.electronAPI?.requestScreenshotData) {
        setTimeout(() => {
          window.electronAPI?.requestScreenshotData?.();
        }, 100);
      }

      // ── Auto-fit + center on start ──────────────────────────────────
      const PADDING = 30;
      const attemptAutoFit = (attempts: number) => {
        if (canvas.getObjects().length > 0) return;
        const cont = canvasScrollRef.current;
        if (!cont || !fabricRef.current) return;          // ← only block on essentials
        const cW = cont.clientWidth;
        const cH = cont.clientHeight;
        if (cW < 10 || cH < 10) {
          if (attempts < 20) setTimeout(() => attemptAutoFit(attempts + 1), 100);
          return;
        }
        const currW = naturalSizeRef.current.w;
        const currH = naturalSizeRef.current.h;
        // Fit canvas to available container, leaving PADDING on each side
        const fitZ = Math.min((cW - PADDING * 2) / currW, (cH - PADDING * 2) / currH, 1.0);
        const finalZ = Math.max(fitZ, 0.05);
        canvas.setZoom(finalZ);
        const displayW = Math.round(currW * finalZ);
        const displayH = Math.round(currH * finalZ);
        canvas.setDimensions({ width: displayW, height: displayH });
        setZoom(finalZ);

        const centerEl = canvasCenteringRef.current;
        if (centerEl) {
          const wrapperW = Math.max(cW, displayW + PADDING * 2);
          const wrapperH = Math.max(cH, displayH + PADDING * 2);
          centerEl.style.width = wrapperW + 'px';
          centerEl.style.height = wrapperH + 'px';

          // Center the scroll - MUST BE DELAYED TO ALLOW REFLOW!
          setTimeout(() => {
            if (cont) {
              cont.scrollLeft = Math.round((wrapperW - cW) / 2);
              cont.scrollTop  = Math.round((wrapperH - cH) / 2);
            }
          }, 0);
        }
      };
      setTimeout(() => attemptAutoFit(0), 100);

      // ── History listeners ────────────────────────────────────────────
      canvas.on('object:modified', saveHistory);
      canvas.on('object:removed',  saveHistory);
      canvas.on('object:added',    () => { if (!isDrawingShape.current) saveHistory(); });
      canvas.on('path:created',    (e:any) => {
        if (e.path) (e.path as any).layerId = stateRef.current.activeLayerId;
      });

      // ── Object boundary constraint ───────────────────────────────────
      canvas.on('object:moving', (e: any) => {
        const obj = e.target; if (!obj) return;
        const { w: W, h: H } = naturalSizeRef.current;
        const width = obj.getScaledWidth();
        const height = obj.getScaledHeight();
        let l = obj.left ?? 0;
        let t = obj.top  ?? 0;
        if (l < 0) l = 0;
        if (t < 0) t = 0;
        if (l + width > W) l = W - width;
        if (t + height > H) t = H - height;
        obj.set({ left: l, top: t });
        obj.setCoords();
      });

      // ── Shape Helper ─────────────────────────────────────────────────
      (canvas as any)._createShape = (m:string, sx:number, sy:number, px:number, py:number, c:string, sw:number, isSelect:boolean) => {
        const pl = Math.min(sx, px), pt = Math.min(sy, py);
        const pw = Math.abs(sx - px), ph = Math.abs(sy - py);
        const strokeProps = { stroke:c, strokeWidth:sw, fill:'transparent', selectable:isSelect, evented:isSelect };
        
        switch(m) {
          case 'rect': return new fabric.Rect({left:pl,top:pt,width:pw,height:ph,...strokeProps});
          case 'roundrect': return new fabric.Rect({left:pl,top:pt,width:pw,height:ph,...strokeProps,rx:14,ry:14});
          case 'circle': return new fabric.Ellipse({left:pl,top:pt,rx:pw/2,ry:ph/2,...strokeProps});
          case 'triangle': return new fabric.Triangle({left:pl,top:pt,width:pw,height:ph,...strokeProps});
          case 'diamond': {
            const pts=[{x:pw/2,y:0},{x:pw,y:ph/2},{x:pw/2,y:ph},{x:0,y:ph/2}];
            return new fabric.Polygon(pts,{left:pl,top:pt,...strokeProps});
          }
          case 'pentagon': {
            const pts=polygonPoints(5,pw/2,ph/2);
            return new fabric.Polygon(pts,{left:pl,top:pt,...strokeProps});
          }
          case 'star': {
            const outerR=Math.min(pw,ph)/2;
            const pts=starPoints(outerR,outerR*0.4);
            return new fabric.Polygon(pts,{left:pl,top:pt,...strokeProps});
          }
          case 'line': return new fabric.Line([sx,sy,px,py], strokeProps);
          case 'arrow': {
            const angle=Math.atan2(py-sy,px-sx);
            const hl=Math.max(sw*5,12);
            const head=new fabric.Triangle({width:hl,height:hl,fill:c,left:px,top:py,originX:'center',originY:'center',selectable:false,evented:false,angle:(angle*180/Math.PI)+90});
            const line2=new fabric.Line([sx,sy,px,py],{stroke:c,strokeWidth:sw,selectable:false,evented:false});
            return new fabric.Group([line2,head], {selectable:isSelect,evented:isSelect});
          }
        }
        return null;
      };

      // ── Hover animation (only in select mode) ───────────────────────
      canvas.on('mouse:over', (e: any) => {
        const obj = e.target;
        if (!obj || (obj as any).layerId === 'bg' || stateRef.current.mode !== 'select') return;
        obj.set('shadow', new fabric.Shadow({ color:'rgba(59,130,246,0.5)', blur:16, offsetX:0, offsetY:0 }));
        canvas.renderAll();
      });
      canvas.on('mouse:out', (e: any) => {
        const obj = e.target; if (!obj) return;
        obj.set('shadow', undefined);
        canvas.renderAll();
      });

      // ── Selection: sync text options ─────────────────────────────────
      canvas.on('selection:created', (e:any) => {
        const obj = e.selected?.[0];
        if (obj?.type === 'i-text') {
          const t = obj as fabric.IText;
          setSelIsText(true);
          setTextFont((t as any).fontFamily || 'Inter, sans-serif');
          setTextSize((t as any).fontSize   || 32);
          setTextBold((t as any).fontWeight === 'bold');
          setTextItalic((t as any).fontStyle === 'italic');
          setTextUnderline(!!(t as any).underline);
          setColor(t.fill as string || '#000000');
        } else setSelIsText(false);
      });
      canvas.on('selection:cleared', () => setSelIsText(false));

      // ── Zoom with Ctrl+Wheel ─────────────────────────────────────────
      canvas.on('mouse:wheel', opt => {
        if (!opt.e.ctrlKey) return;
        opt.e.preventDefault(); opt.e.stopPropagation();
        let z = canvas.getZoom() * (0.999 ** opt.e.deltaY);
        z = Math.max(0.05, Math.min(20, z));
        const { w: nW, h: nH } = naturalSizeRef.current;
        canvas.setZoom(z);
        canvas.setDimensions({ width: Math.round(nW*z), height: Math.round(nH*z) });
        setZoom(z);
      });

      // ── Mouse down ──────────────────────────────────────────────────
      canvas.on('mouse:down', o => {
        // Space → pan
        if (isSpaceDownRef.current) {
          isDraggingRef.current = true;
          canvas.selection = false;
          canvas.defaultCursor = 'grabbing';
          lastPosRef.current = { x:(o.e as MouseEvent).clientX, y:(o.e as MouseEvent).clientY };
          return;
        }

        const { mode:m, color:c, strokeW:sw, stepCnt:sc, activeLayerId:al } = stateRef.current;
        const pointer = o.scenePoint; if (!pointer) return;
        const { w: nW, h: nH } = naturalSizeRef.current;

        // ── Pipette ──────────────────────────────────────────────────
        if (m === 'pipette') {
          const mult = nW / (canvas.width || nW);
          const exportUrl = canvas.toDataURL({ format:'png', multiplier: mult });
          const img = new Image(); img.src = exportUrl;
          img.onload = () => {
            const tmp = document.createElement('canvas');
            tmp.width = nW; tmp.height = nH;
            const tc = tmp.getContext('2d')!;
            tc.drawImage(img, 0, 0);
            const px = Math.floor(pointer.x); const py = Math.floor(pointer.y);
            const d = tc.getImageData(px, py, 1, 1).data;
            setColor('#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join(''));
            setMode('draw');
          };
          return;
        }

        // ── Fill (vector fill) ─────────────────────
        if (m === 'fill') {
          const target = o.target;
          if (target && target.type !== 'image' && target.type !== 'group') {
            target.set('fill', c);
          } else {
            canvas.backgroundColor = c;
          }
          canvas.renderAll();
          saveHistory();
          setMode('select');
          return;
        }

        // ── Text ─────────────────────────────────────────────────────
        if (m === 'text') {
          const ts = (window as any).__editorTextState || { textFont:'Inter,sans-serif', textSize:32, textBold:false, textItalic:false, textUnderline:false };
          const text = new fabric.IText('Текст', {
            left:pointer.x, top:pointer.y, fill:c,
            fontFamily: ts.textFont, fontSize: ts.textSize,
            fontWeight: ts.textBold  ? 'bold'   : 'normal',
            fontStyle:  ts.textItalic ? 'italic' : 'normal',
            underline:  ts.textUnderline,
            selectable: true, evented: true,
          });
          (text as any).layerId = al;
          canvas.add(text); canvas.setActiveObject(text);
          text.enterEditing(); text.selectAll();
          setMode('select'); return;
        }

        // ── Step ─────────────────────────────────────────────────────
        if (m === 'step') {
          const circ = new fabric.Circle({radius:20,fill:c,originX:'center',originY:'center'});
          const lbl  = new fabric.Text(sc.toString(),{fontSize:22,fill:'white',originX:'center',originY:'center',fontWeight:'bold',fontFamily:'Inter,sans-serif'});
          const grp  = new fabric.Group([circ,lbl],{left:pointer.x-20,top:pointer.y-20,selectable:false,evented:false});
          (grp as any).layerId=al; canvas.add(grp); setStepCnt(p=>p+1); saveHistory(); return;
        }

        // ── Spray ──── (no selection rect)
        if (m === 'spray') {
          canvas.selection = false;
          isSprayingRef.current=true; sprayDotsRef.current=[]; return;
        }

        // ── Shape placeholder (rect, circle, triangle, etc.) ─────────
        if (['rect','roundrect','circle','triangle','diamond','pentagon','star','line','arrow'].includes(m)){
          isDrawingShape.current = true;
          canvas.selection = false;
          startPos.current = { x:pointer.x, y:pointer.y };
          activeShape.current = (canvas as any)._createShape(m, pointer.x, pointer.y, pointer.x, pointer.y, c, sw, false);
          if (activeShape.current) canvas.add(activeShape.current);
          return;
        }
      });

      // ── Mouse move ─────────────────────────────────────────────────
      canvas.on('mouse:move', o => {
        // Pan
        if (isDraggingRef.current && isSpaceDownRef.current) {
          const e = o.e as MouseEvent;
          const wrapper = canvasScrollRef.current;
          if (wrapper) {
            wrapper.scrollLeft -= e.clientX - lastPosRef.current.x;
            wrapper.scrollTop  -= e.clientY - lastPosRef.current.y;
          }
          lastPosRef.current = { x:e.clientX, y:e.clientY }; return;
        }

        const { mode:m, color:c, strokeW:sw, activeLayerId:al } = stateRef.current;
        const { w: nW, h: nH } = naturalSizeRef.current;

        // Spray dots
        if (m === 'spray' && isSprayingRef.current) {
          const pointer = o.scenePoint; if (!pointer) return;
          // Clamp to canvas bounds
          if (pointer.x<0||pointer.x>nW||pointer.y<0||pointer.y>nH) return;
          for (let i=0;i<10;i++) {
            const spread=sw*6;
            const dx=(Math.random()-.5)*spread, dy=(Math.random()-.5)*spread;
            const ex=pointer.x+dx, ey=pointer.y+dy;
            if (ex<0||ex>nW||ey<0||ey>nH) continue;
            const dot = new fabric.Circle({
              left:ex, top:ey, radius:Math.random()*1.5+0.5,
              fill:c, selectable:false, evented:false,
            });
            (dot as any).layerId=al; canvas.add(dot); sprayDotsRef.current.push(dot);
          }
          canvas.renderAll(); return;
        }

        if (!isDrawingShape.current||!activeShape.current) return;
        const pointer = o.scenePoint; if (!pointer) return;
        const {x:sx, y:sy}=startPos.current;

        canvas.remove(activeShape.current);
        activeShape.current = (canvas as any)._createShape(m, sx, sy, pointer.x, pointer.y, c, sw, false);
        if (activeShape.current) {
          (activeShape.current as any).layerId = al;
          canvas.add(activeShape.current);
        }
        canvas.renderAll();
      });

      // ── Mouse up ───────────────────────────────────────────────────
      canvas.on('mouse:up', async (o: any) => {
        if (isSpaceDownRef.current) {
          isDraggingRef.current=false;
          canvas.defaultCursor = 'grab'; return;
        }

        const { mode:m, activeLayerId:al } = stateRef.current;
        const isSelect = m === 'select';
        canvas.selection = isSelect;

        // Finish spray → group dots
        if (m === 'spray') {
          if (sprayDotsRef.current.length > 0) {
            isSprayingRef.current = false;
            const grp = new fabric.Group(sprayDotsRef.current, { selectable:isSelect, evented:isSelect });
            (grp as any).layerId = al;
            sprayDotsRef.current.forEach(d=>canvas.remove(d));
            canvas.add(grp); canvas.renderAll(); saveHistory();
            sprayDotsRef.current = [];
          } return;
        }

        if (!isDrawingShape.current||!activeShape.current) return;

        const placeholder = activeShape.current;
        const pointer = o.scenePoint || { x: startPos.current.x, y: startPos.current.y };
        const pw = Math.abs(startPos.current.x - pointer.x);
        const ph = Math.abs(startPos.current.y - pointer.y);

        // Guard tiny drag
        if ((m!=='line'&&m!=='arrow') && (pw<5||ph<5)) {
          canvas.remove(placeholder);
          isDrawingShape.current=false; activeShape.current=null; return;
        }

        // It's a shape, it's already on the canvas!
        // Just set its selectability and animate it.
        placeholder.set({ selectable: isSelect, evented: isSelect });
        
        // Animate fade-in
        placeholder.set({ opacity: 0 });
        canvas.renderAll();
        const startTime = performance.now();
        const animate = (time: number) => {
          const t = Math.min((time - startTime) / 250, 1);
          placeholder.set({ opacity: t });
          canvas.renderAll();
          if (t < 1) requestAnimationFrame(animate);
          else saveHistory();
        };
        requestAnimationFrame(animate);

        isDrawingShape.current=false; activeShape.current=null;
        setMode('select');
      });
    };

    init();
    
    // Auto-update wrapper size on window resize (e.g. maximize)
    const ro = new ResizeObserver(() => {
      const cont = canvasScrollRef.current;
      const centerEl = canvasCenteringRef.current;
      const canvas = fabricRef.current;
      if (!cont || !centerEl || !canvas) return;
      
      const cW = cont.clientWidth;
      const cH = cont.clientHeight;
      const displayW = canvas.getWidth();
      const displayH = canvas.getHeight();
      const PADDING = 80;
      
      const wrapperW = Math.max(cW, displayW + PADDING * 2);
      const wrapperH = Math.max(cH, displayH + PADDING * 2);
      centerEl.style.width = wrapperW + 'px';
      centerEl.style.height = wrapperH + 'px';
    });
    if (canvasScrollRef.current) ro.observe(canvasScrollRef.current);

    return () => { 
      ro.disconnect();
      fabricRef.current?.dispose(); 
      fabricRef.current=null; 
    };
  }, [saveHistory]);

  // ─── Mode / Brush effect ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current; if (!canvas) return;
    const isSelect   = mode === 'select';
    const isFreeDraw = ['draw','marker','chalk','eraser'].includes(mode);

    // Toggle selection globally
    canvas.isDrawingMode = isFreeDraw;
    canvas.selection     = isSelect;

    const isFill     = mode === 'fill';

    // Toggle selectability on all objects
    canvas.getObjects().forEach(o => {
      if ((o as any).layerId === 'bg') return;
      o.selectable = isSelect;
      o.evented    = isSelect || isFill;
    });

    // Setup free-drawing brush
    if (isFreeDraw) {
      const brush = new fabric.PencilBrush(canvas);
      switch(mode) {
        case 'marker':
          brush.color  = color + '99';
          brush.width  = strokeW * 3;
          break;
        case 'chalk':
          brush.color  = color;
          brush.width  = strokeW;
          (brush as any).shadow = new fabric.Shadow({ color:color+'55', blur:strokeW*3, offsetX:1, offsetY:1 });
          break;
        case 'eraser':
          brush.color  = 'white';
          brush.width  = strokeW * 3;
          break;
        default: // 'draw' = pencil
          brush.color  = color;
          brush.width  = strokeW;
      }
      canvas.freeDrawingBrush = brush;
    }

    // Cursor
    if      (isSelect)               canvas.defaultCursor = 'default';
    else if (isFreeDraw)             canvas.defaultCursor = 'crosshair';
    else if (mode === 'pipette')     canvas.defaultCursor = 'crosshair';
    else if (mode === 'fill')        canvas.defaultCursor = 'cell';
    else if (mode === 'spray')       canvas.defaultCursor = 'crosshair';
    else                             canvas.defaultCursor = 'crosshair';

    canvas.requestRenderAll();
  }, [mode, color, strokeW]);

  // ─── Text options → apply to selected text ─────────────────────────────
  useEffect(() => {
    (window as any).__editorTextState = { textFont, textSize, textBold, textItalic, textUnderline };
    const canvas = fabricRef.current; if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj?.type === 'i-text') {
      (obj as fabric.IText).set({
        fontFamily: textFont, fontSize: textSize,
        fontWeight: textBold    ? 'bold'   : 'normal',
        fontStyle:  textItalic  ? 'italic' : 'normal',
        underline:  textUnderline,
      });
      canvas.renderAll();
    }
  }, [textFont, textSize, textBold, textItalic, textUnderline]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault(); isSpaceDownRef.current = true;
        if (fabricRef.current) { fabricRef.current.defaultCursor='grab'; fabricRef.current.requestRenderAll(); }
        return;
      }
      if ((e.ctrlKey||e.metaKey) && e.code==='KeyZ') { handleUndo(); return; }
      if ((e.ctrlKey||e.metaKey) && e.code==='KeyY') { handleRedo(); return; }
      if ((e.ctrlKey||e.metaKey) && e.code==='KeyC') {
        const a = fabricRef.current?.getActiveObject();
        if (!a || (a as fabric.IText).type !== 'i-text') copyToClipboard();
        return;
      }
      if (e.key==='Delete'||e.key==='Backspace') {
        const a=fabricRef.current?.getActiveObject();
        if (a && (a as fabric.IText).isEditing) return;
        deleteSelected();
      }
      // Keyboard mode shortcuts
      const keyMap: Record<string,DrawMode> = {
        KeyV:'select', KeyP:'draw', KeyH:'marker', KeyE:'eraser',
        KeyR:'rect', KeyC:'circle', KeyL:'line', KeyA:'arrow', KeyT:'text',
      };
      if (keyMap[e.code] && !e.ctrlKey && !e.metaKey) setMode(keyMap[e.code]);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDownRef.current = false; isDraggingRef.current = false;
        if (fabricRef.current) { fabricRef.current.defaultCursor='default'; fabricRef.current.requestRenderAll(); }
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const rs = resizeStateRef.current;
      if (!rs || !rs.active || !fabricRef.current) return;
      const rawDx = (e.clientX - rs.startX) / zoom;
      const rawDy = (e.clientY - rs.startY) / zoom;
      let newW = rs.startW;
      let newH = rs.startH;
      let shiftX = 0;
      let shiftY = 0;
      
      if (rs.type.includes('w')) {
        newW = Math.max(10, Math.round(rs.startW - rawDx));
        shiftX = rs.startW - newW;
      } else if (rs.type.includes('e')) {
        newW = Math.max(10, Math.round(rs.startW + rawDx));
      }
      
      if (rs.type.includes('n')) {
        newH = Math.max(10, Math.round(rs.startH - rawDy));
        shiftY = rs.startH - newH;
      } else if (rs.type.includes('s')) {
        newH = Math.max(10, Math.round(rs.startH + rawDy));
      }
      
      const c = fabricRef.current;
      if (shiftX !== 0 || shiftY !== 0) {
        rs.objs.forEach(({ obj, left, top }) => {
          if (left !== undefined) obj.set('left', left - shiftX);
          if (top !== undefined) obj.set('top', top - shiftY);
          obj.setCoords();
        });
      }
      
      naturalSizeRef.current = { w: newW, h: newH };
      setCanvasSize({ w: newW, h: newH });
      c.setDimensions({ width: Math.round(newW * zoom), height: Math.round(newH * zoom) });
    };
    const onPointerUp = () => {
      if (resizeStateRef.current?.active) {
        resizeStateRef.current.active = false;
        saveHistory();
      }
    };
    window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp);
    window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp);
      window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp);
    };
  }, [handleUndo, handleRedo, zoom, saveHistory]);

  // ─── Actions ──────────────────────────────────────────────────────────
  const deleteSelected = () => {
    const c=fabricRef.current; if(!c) return;
    const objs=c.getActiveObjects(); if(!objs.length) return;
    objs.forEach(o=>c.remove(o)); c.discardActiveObject(); c.renderAll(); saveHistory();
  };
  const clearCanvas = () => {
    const c=fabricRef.current; if(!c) return;
    const bg=c.getObjects().filter(o=>(o as any).layerId==='bg');
    c.clear(); c.backgroundColor='white'; bg.forEach(o=>c.add(o));
    setStepCnt(1); c.renderAll(); saveHistory();
  };
  const getExportDataUrl = () => {
    const c = fabricRef.current;
    if (!c) return '';
    const { w: nW, h: nH } = naturalSizeRef.current;
    
    // Save current view state
    const currentZ = c.getZoom();
    const currentW = c.getWidth();
    const currentH = c.getHeight();
    
    // Reset to full natural size for perfect 1:1 export
    c.setZoom(1);
    c.setDimensions({ width: nW, height: nH });
    
    // Export the data (fabric naturally exports the full logical canvas)
    const data = c.toDataURL({ format: 'png', multiplier: 1 });
    
    // Restore view state (happens synchronously, so no visual flicker)
    c.setZoom(currentZ);
    c.setDimensions({ width: currentW, height: currentH });
    
    return data;
  };

  const saveToDisk = () => {
    const data = getExportDataUrl();
    if (!data) return;
    const a = document.createElement('a'); a.href = data;
    a.download = `TesseraDesk_${Date.now()}.png`; a.click();
  };

  const copyToClipboard = async () => {
    const data = getExportDataUrl();
    if (!data) return;
    try {
      const blob = await (await fetch(data)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch(e) { console.error(e); }
  };
  const bringForward = () => {
    const c=fabricRef.current; if(!c) return;
    c.getActiveObjects().forEach(o=>c.bringObjectForward(o));
    c.discardActiveObject(); c.renderAll(); saveHistory();
  };
  const sendBackward = () => {
    const c=fabricRef.current; if(!c) return;
    c.getActiveObjects().forEach(o=>c.sendObjectBackwards(o));
    c.discardActiveObject(); c.renderAll(); saveHistory();
  };
  const closeEditor = () => setShowClose(true);
  const doSaveAndClose = async () => { await saveToDisk(); window.electronAPI?.closePreviewWindow(); window.close(); };
  const doCloseNoSave  = () => { window.electronAPI?.closePreviewWindow(); window.close(); };

  // ─── Layer management ─────────────────────────────────────────────────
  const addLayer = () => {
    const id=`layer-${Date.now()}`;
    setLayers(p=>[...p,{id,name:`Layer ${p.length}`,visible:true}]);
    setActiveLayerId(id);
  };
  const delLayer = (id: string) => {
    if (id==='bg') return;
    const c=fabricRef.current;
    if (c) { c.getObjects().filter(o=>(o as any).layerId===id).forEach(o=>c.remove(o)); c.renderAll(); saveHistory(); }
    setLayers(p=>{ const n=p.filter(l=>l.id!==id); setActiveLayerId(n[n.length-1]?.id??'bg'); return n; });
  };
  const toggleVisible = (id: string) => {
    const c=fabricRef.current;
    setLayers(p=>p.map(l=>{
      if (l.id!==id) return l;
      const nv=!l.visible;
      if (c) { c.getObjects().filter(o=>(o as any).layerId===id).forEach(o=>{o.visible=nv;}); c.renderAll(); }
      return {...l,visible:nv};
    }));
  };
  const renameLayer = (id: string, name: string) => setLayers(p=>p.map(l=>l.id===id?{...l,name}:l));
  const onLayerDragStart = (id: string) => { dragLayerIdRef.current=id; };
  const onLayerDrop = (targetId: string) => {
    const fromId=dragLayerIdRef.current; if(!fromId||fromId===targetId) return;
    setLayers(p=>{
      const n=[...p]; const fi=n.findIndex(l=>l.id===fromId); const ti=n.findIndex(l=>l.id===targetId);
      [n[fi],n[ti]]=[n[ti],n[fi]]; return n;
    });
    dragLayerIdRef.current=null;
  };

  const zoomPct = Math.round(zoom*100);
  const showTextBar = mode==='text' || selIsText;

  const toolGroups = [
    { label:'', tools:[
      { id:'select',   icon:<MousePointer2 size={16}/>,  title: t(language as Lang, 'toolSelect') },
    ]},
    { label: t(language as Lang, 'groupBrushes'), tools:[
      { id:'draw',     icon:<Pen size={16}/>,            title: t(language as Lang, 'toolPen') },
      { id:'marker',   icon:<Highlighter size={16}/>,    title: t(language as Lang, 'toolMarker') },
      { id:'chalk',    icon:<AlignCenter size={16}/>,    title: t(language as Lang, 'toolChalk') },
      { id:'spray',    icon:<Wind size={16}/>,           title: t(language as Lang, 'toolSpray') },
      { id:'eraser',   icon:<Eraser size={16}/>,         title: t(language as Lang, 'toolEraser') },
    ]},
    { label: t(language as Lang, 'groupShapes'), tools:[
      { id:'rect',     icon:<Square size={16}/>,         title: t(language as Lang, 'toolRect') },
      { id:'roundrect',icon:<ChevronRight size={16}/>,   title: t(language as Lang, 'toolRoundRect') },
      { id:'circle',   icon:<Circle size={16}/>,         title: t(language as Lang, 'toolCircle') },
      { id:'triangle', icon:<Triangle size={16}/>,       title: t(language as Lang, 'toolTriangle') },
      { id:'diamond',  icon:<Diamond size={16}/>,        title: t(language as Lang, 'toolDiamond') },
      { id:'pentagon', icon:<Pentagon size={16}/>,       title: t(language as Lang, 'toolPentagon') },
      { id:'star',     icon:<Star size={16}/>,           title: t(language as Lang, 'toolStar') },
      { id:'line',     icon:<Minus size={16}/>,          title: t(language as Lang, 'toolLine') },
      { id:'arrow',    icon:<ArrowRight size={16}/>,     title: t(language as Lang, 'toolArrow') },
    ]},
    { label: t(language as Lang, 'groupText'), tools:[
      { id:'text',     icon:<Type size={16}/>,           title: t(language as Lang, 'toolText') },
      { id:'step',     icon:<Hash size={16}/>,           title: t(language as Lang, 'toolStep') },
    ]},
    { label: t(language as Lang, 'groupTools'), tools:[
      { id:'pipette',  icon:<Pipette size={16}/>,        title: t(language as Lang, 'toolPipette') },
      { id:'fill',     icon:<PaintBucket size={16}/>,    title: t(language as Lang, 'toolFill') },
    ]},
  ];
  const handleResizeStart = (type: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    const c = fabricRef.current;
    const objs = c ? c.getObjects().map(o => ({ obj: o, left: o.left ?? 0, top: o.top ?? 0 })) : [];
    resizeStateRef.current = { active: true, type, startX: e.clientX, startY: e.clientY, startW: canvasSize.w, startH: canvasSize.h, objs };
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ width:'100vw', height:'100vh', display:'flex', flexDirection:'column',
      backgroundColor:'var(--bg-main)', overflow:'hidden', fontFamily:'Inter, sans-serif' }}>

      {/* ── Close dialog ── */}
      {showClose && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)',
            borderRadius:16, padding:'28px 32px', width:360, boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--text-main)', marginBottom:8 }}>{t(language as Lang, 'editorSaveWork')}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:24 }}>{t(language as Lang, 'editorSaveDesc')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn" onClick={doSaveAndClose} style={{ flex:1, padding:'9px 0', 
                background:'var(--accent,#eab308)', border:'none', color:'#000', fontWeight:700, fontSize:13 }}>{t(language as Lang, 'editorSaveBtn')}</button>
              <button className="btn" onClick={doCloseNoSave} style={{ flex:1, padding:'9px 0', 
                fontWeight:600, fontSize:13 }}>{t(language as Lang, 'editorDontSaveBtn')}</button>
              <button onClick={()=>setShowClose(false)} style={{ padding:'9px 14px', borderRadius:8,
                background:'transparent', border:'1px solid var(--glass-border)', color:'var(--text-muted)', cursor:'pointer', fontSize:13 }}>{t(language as Lang, 'editorCancelBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Text options bar ── */}
      {showTextBar && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
          background:'var(--bg-card)', borderBottom:'1px solid var(--glass-border)',
          zIndex:900, flexShrink:0 }}>
          <select value={textFont} onChange={e=>setTextFont(e.target.value)} style={{ background:'var(--bg-main)',
            border:'1px solid var(--glass-border)', color:'var(--text-main)', borderRadius:6, padding:'4px 8px', fontSize:12 }}>
            {FONTS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <input type="number" min={8} max={200} value={textSize} onChange={e=>setTextSize(Number(e.target.value))}
            style={{ width:52, background:'var(--bg-main)', border:'1px solid var(--glass-border)',
              color:'var(--text-main)', borderRadius:6, padding:'4px 8px', fontSize:12 }}/>
          {([['B',textBold,setTextBold,<Bold size={14}/>], ['I',textItalic,setTextItalic,<Italic size={14}/>],
            ['U',textUnderline,setTextUnderline,<Underline size={14}/>]] as any[]).map(([,on,set,icon],i)=>(
            <button key={i} onClick={()=>set((p:boolean)=>!p)} style={{ padding:'4px 8px', borderRadius:6,
              background:on?'rgba(234,179,8,0.3)':'transparent',
              border:on?'1px solid rgba(234,179,8,0.4)':'1px solid var(--glass-border)',
              color:'var(--text-main)', cursor:'pointer' }}>{icon}</button>
          ))}
          <div style={{ width:1, height:20, background:'var(--glass-border)', margin:'0 4px' }}/>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>{t(language as Lang, 'editorColor')}:</span>
          <input type="color" value={color} onChange={e=>setColor(e.target.value)}
            style={{ width:26, height:26, border:'none', borderRadius:4, background:'transparent', cursor:'pointer' }}/>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── Left sidebar ── */}
        <div style={{ width:SIDEBAR_W, background:'var(--bg-card)', zIndex:100,
          borderRight:'1px solid var(--glass-border)', display:'flex',
          flexDirection:'column', overflowY:'auto', flexShrink:0 }}>

          <div style={{ padding:'10px 8px 4px' }}>
            {toolGroups.map(group=>(
              <div key={group.label} style={{ marginBottom:6 }}>
                {group.label && <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)',
                  letterSpacing:1, textTransform:'uppercase', margin:'6px 0 4px 2px' }}>{group.label}</div>}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
                  {group.tools.map(t=>(
                    <button key={t.id} onClick={()=>setMode(t.id as DrawMode)} title={t.title}
                      style={{ display:'flex', alignItems:'center', justifyContent:'center',
                        padding:'7px', borderRadius:7, border:'none', cursor:'pointer', transition:'all 0.15s',
                        background: mode===t.id ? 'rgba(234,179,8,0.22)' : 'transparent',
                        boxShadow: mode===t.id ? 'inset 0 0 0 1px rgba(234,179,8,0.45)' : 'none',
                        color: mode===t.id ? '#eab308' : 'var(--text-muted)',
                      }}>{t.icon}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height:1, background:'var(--glass-border)', margin:'4px 0' }}/>

          {/* Arrange / Utility */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:3, padding:'4px 8px' }}>
            {[
              [<ArrowUpToLine size={14}/>,   bringForward, 'Поднять вперёд'],
              [<ArrowDownToLine size={14}/>, sendBackward, 'Опустить назад'],
              [<Undo2 size={14}/>, handleUndo, 'Отменить (Ctrl+Z)'],
              [<Redo2 size={14}/>, handleRedo, 'Повторить (Ctrl+Y)'],
            ].map(([icon, fn, title]: any, i) => (
              <button key={i} className="icon-btn" onClick={fn} title={title} style={{ padding:'6px', background:'transparent', color:'var(--text-muted)' }}>{icon}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, padding:'2px 8px 4px' }}>
            <button className="icon-btn" onClick={deleteSelected} title={t(language as Lang, 'editorDelTooltip')} style={{ padding:'6px', background:'transparent', color:'rgba(255,150,150,0.7)' }}><Trash2 size={14}/></button>
            <button className="icon-btn" onClick={clearCanvas}   title={t(language as Lang, 'editorClearTooltip')}    style={{ padding:'6px', background:'transparent', color:'rgba(255,70,70,0.6)' }}><Trash2 size={14}/></button>
          </div>

          <div style={{ height:1, background:'var(--glass-border)', margin:'2px 0 6px' }}/>

          {/* Brush size */}
          <div style={{ padding:'0 10px 8px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:5, fontWeight:600, letterSpacing:0.5 }}>{t(language as Lang, 'editorSize')} {strokeW}px</div>
            <input type="range" min={1} max={80} value={strokeW} onChange={e=>setStrokeW(Number(e.target.value))}
              style={{ width:'100%', accentColor:'#eab308', cursor:'pointer' }}/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginTop:6 }}>
              <div style={{ width:Math.min(strokeW,60), height:Math.min(strokeW,60), borderRadius:'50%',
                background:color, boxShadow:`0 0 6px ${color}66`, transition:'all 0.1s' }}/>
            </div>
          </div>

          <div style={{ height:1, background:'var(--glass-border)', margin:'2px 0 6px' }}/>

          {/* Active color */}
          <div style={{ padding:'0 10px 8px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:8, background:color,
              border:'2px solid var(--glass-border)', flexShrink:0, boxShadow:`0 0 10px ${color}55` }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:3 }}>{t(language as Lang, 'editorColor')}</div>
              <input type="color" value={color} onChange={e=>setColor(e.target.value)}
                style={{ width:'100%', height:20, border:'none', borderRadius:4, background:'transparent', cursor:'pointer' }}/>
            </div>
          </div>

          <div style={{ height:1, background:'var(--glass-border)', margin:'0 0 6px' }}/>

          {/* Color palette */}
          <div style={{ padding:'0 8px 10px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)',
              letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>ПАЛИТРА</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:2 }}>
              {PALETTE.map((c,i)=>(
                <div key={i} onClick={()=>setColor(c)} title={c}
                  style={{ width:'100%', aspectRatio:'1', borderRadius:3, background:c, cursor:'pointer',
                    border: color===c ? '2px solid white' : '1px solid var(--glass-border)',
                    boxShadow: color===c ? `0 0 6px ${c}` : 'none',
                    transition:'transform 0.1s',
                  }}
                  onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.3)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Canvas area (scrollable, properly centered) ── */}
        {/* Outer wrapper: takes up remaining flex space, clipping container */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', background:'var(--bg-main)' }}>
        {/* Inner scroll container: absolute fill, so min-height:100% on child resolves correctly */}
        <div ref={canvasScrollRef} style={{ position:'absolute', inset:0, overflow:'auto',
          scrollbarColor:'var(--glass-border) transparent' }}>

          {/* Sticky toolbar — always visible at top right */}
          <div style={{ position:'sticky', top:0, zIndex:500, display:'flex',
            justifyContent:'flex-end', padding:'10px', pointerEvents:'none' }}>
            <div style={{ pointerEvents:'all', display:'flex', gap:5, padding:'7px 10px',
              background:'var(--bg-card)', backdropFilter:'blur(12px)',
              borderRadius:12, border:'1px solid var(--glass-border)',
              boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', alignSelf:'center', padding:'0 5px' }}>{zoomPct}%</span>
              <button className={`icon-btn ${showLayers ? 'active' : ''}`} onClick={()=>setShowLayers(p=>!p)} title={t(language as Lang, 'editorLayersTitle')} style={{ width:30, height:30, padding:0, background:showLayers?'rgba(234,179,8,0.2)':'transparent', color:showLayers?'#eab308':'var(--text-muted)' }}><LayersIcon size={16}/></button>
              <button className="icon-btn" onClick={copyToClipboard} title={t(language as Lang, 'editorCopyTitle')} style={{ width:30, height:30, padding:0, background:'transparent', color:'var(--text-muted)' }}><Save size={16}/></button>
              <button className="icon-btn" onClick={saveToDisk} title={t(language as Lang, 'editorSavePngTitle')} style={{ width:30, height:30, padding:0, background:'transparent', color:'var(--text-muted)' }}><Download size={16}/></button>
              <button className="icon-btn" onClick={() => window.electronAPI?.windowMinimize()} title={t(language as Lang, 'editorMinimizeTitle')} style={{ width:30, height:30, padding:0, background:'transparent', color:'var(--text-muted)' }}><Minus size={16}/></button>
              <button className="icon-btn" onClick={closeEditor} title={t(language as Lang, 'editorCloseTitle')} style={{ width:30, height:30, padding:0, background:'transparent', color:'rgba(255,80,80,0.9)' }}><X size={16}/></button>
            </div>
          </div>

          {/* Canvas centered — dimensions and scroll set by JS in attemptAutoFit */}
          <div ref={canvasCenteringRef} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ position:'relative', boxShadow:'0 16px 70px rgba(0,0,0,0.85)', borderRadius:2, background:'var(--bg-main)', flexShrink:0 }}>
              <canvas ref={canvasRef} style={{ display:'block' }}/>
              
              {/* Omni-directional Resize Handles */}
              <div onPointerDown={handleResizeStart('n')} style={{ position:'absolute', top:-4, left:'50%', width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'ns-resize', transform:'translateX(-50%)', zIndex:10 }}/>
              <div onPointerDown={handleResizeStart('s')} style={{ position:'absolute', bottom:-4, left:'50%', width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'ns-resize', transform:'translateX(-50%)', zIndex:10 }}/>
              <div onPointerDown={handleResizeStart('w')} style={{ position:'absolute', top:'50%', left:-4, width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'ew-resize', transform:'translateY(-50%)', zIndex:10 }}/>
              <div onPointerDown={handleResizeStart('e')} style={{ position:'absolute', top:'50%', right:-4, width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'ew-resize', transform:'translateY(-50%)', zIndex:10 }}/>
              <div onPointerDown={handleResizeStart('nw')} style={{ position:'absolute', top:-4, left:-4, width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'nwse-resize', zIndex:10 }}/>
              <div onPointerDown={handleResizeStart('ne')} style={{ position:'absolute', top:-4, right:-4, width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'nesw-resize', zIndex:10 }}/>
              <div onPointerDown={handleResizeStart('sw')} style={{ position:'absolute', bottom:-4, left:-4, width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'nesw-resize', zIndex:10 }}/>
              <div onPointerDown={handleResizeStart('se')} style={{ position:'absolute', bottom:-4, right:-4, width:8, height:8, background:'var(--bg-main)', border:'1px solid var(--text-main)', cursor:'nwse-resize', zIndex:10 }}/>
            </div>
          </div>
        </div>
        </div>

        {/* ── Layers panel ── */}
        {showLayers && (
          <div style={{ width:210, background:'var(--bg-card)', borderLeft:'1px solid var(--glass-border)', zIndex:100,
            display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'12px 12px 8px', borderBottom:'1px solid var(--glass-border)' }}>
              <span style={{ fontWeight:700, fontSize:12, color:'var(--text-main)' }}>{t(language as Lang, 'editorLayers')}</span>
              <button className="icon-btn" onClick={addLayer} title={t(language as Lang, 'editorAddLayerTitle')} style={{ width:24, height:24, padding:0, background:'transparent', color:'var(--text-muted)' }}><Plus size={13}/></button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:4 }}>
              {[...layers].reverse().map(layer=>(
                <div key={layer.id}
                  draggable onDragStart={()=>onLayerDragStart(layer.id)}
                  onDragOver={e=>e.preventDefault()} onDrop={()=>onLayerDrop(layer.id)}
                  onClick={()=>setActiveLayerId(layer.id)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 7px',
                    borderRadius:8, cursor:'pointer', userSelect:'none',
                    background: activeLayerId===layer.id ? 'rgba(234,179,8,0.16)' : 'transparent',
                    border:`1px solid ${activeLayerId===layer.id?'rgba(234,179,8,0.35)':'transparent'}`,
                    transition:'all 0.15s',
                  }}>
                  <GripVertical size={11} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                  <button className="icon-btn" onClick={e=>{e.stopPropagation();toggleVisible(layer.id);}} style={{ padding:2, background:'transparent', color:layer.visible?'#eab308':'var(--text-muted)', flexShrink:0 }}>
                    {layer.visible ? <Eye size={12}/> : <EyeOff size={12}/>}
                  </button>
                  <input value={layer.name} onChange={e=>renameLayer(layer.id,e.target.value)}
                    onClick={e=>e.stopPropagation()}
                    style={{ flex:1, background:'transparent', border:'none', outline:'none',
                      color:'var(--text-main)', fontSize:12, fontFamily:'inherit', minWidth:0 }}/>
                  {layer.id!=='bg' && (
                    <button className="icon-btn" onClick={e=>{e.stopPropagation();delLayer(layer.id);}} style={{ padding:2, background:'transparent', color:'rgba(255,70,70,0.5)', flexShrink:0 }}><X size={11}/></button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding:'8px 12px', borderTop:'1px solid var(--glass-border)',
              fontSize:10, color:'var(--text-muted)', textAlign:'center', lineHeight:1.5 }}>
              {t(language as Lang, 'editorLayerHint1')}<br/>{t(language as Lang, 'editorLayerHint2')}
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ height:22, display:'flex', alignItems:'center', justifyContent:'center', gap:16,
        fontSize:10, color:'var(--text-muted)', background:'var(--bg-card)',
        borderTop:'1px solid var(--glass-border)', flexShrink:0 }}>
        <span>{canvasSize.w}×{canvasSize.h}px</span>
        <span>·</span>
        <span>Зум: {zoomPct}%</span>
        <span>·</span>
        <span>{t(language as Lang, 'editorStatusLayer')}: {layers.find(l=>l.id===activeLayerId)?.name ?? '—'}</span>
        <span>·</span>
        <span>{t(language as Lang, 'editorStatusHint')}</span>
        <span>·</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
