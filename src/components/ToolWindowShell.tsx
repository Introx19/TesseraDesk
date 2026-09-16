import type { ReactNode } from 'react';
import { X, Minus } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

/** Wrapper used for detached floating tool windows.
 * Hides the titlebar when the window is too small so the content
 * gets maximum space, but keeps the close button accessible. */
export default function ToolWindowShell({ children }: { children: ReactNode }) {
  const { isXs, isSm } = useWindowSize();

  if (isXs) {
    // Absolute minimal: content fills 100%, tiny drag region at top
    return (
      <div className="app-container" style={{ flexDirection: 'column' }}>
        {/* 8px drag strip at top, invisible but draggable */}
        <div className="titlebar-drag-region" style={{ height: '8px' }} />
        <div style={{ flex: 1, overflow: 'hidden', padding: '8px 6px 6px' }}>
          {children}
        </div>
      </div>
    );
  }

  if (isSm) {
    // Small: thin bar with just the close button
    return (
      <div className="app-container" style={{ flexDirection: 'column' }}>
        <div className="titlebar-drag-region" style={{ height: '24px' }}>
          <div className="titlebar-controls" style={{ marginLeft: 'auto', height: '24px' }}>
            <button
              className="win-btn hide"
              style={{ height: '24px', width: '24px' }}
              onClick={() => window.electronAPI?.windowMinimize()}
            >
              <Minus size={12} />
            </button>
            <button
              className="win-btn close"
              style={{ height: '24px', width: '24px' }}
              onClick={() => window.electronAPI?.windowClose()}
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '4px 8px 8px' }}>
          {children}
        </div>
      </div>
    );
  }

  // Normal: regular titlebar with close button
  return (
    <div className="app-container" style={{ flexDirection: 'column' }}>
      <div className="titlebar-drag-region">
        <div className="titlebar-controls" style={{ marginLeft: 'auto' }}>
          <button className="win-btn hide" onClick={() => window.electronAPI?.windowMinimize()}>
            <Minus size={14} />
          </button>
          <button className="win-btn close" onClick={() => window.electronAPI?.windowClose()}>
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="main-content" style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
