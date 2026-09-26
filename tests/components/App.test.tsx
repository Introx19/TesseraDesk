/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../src/App';

// Mock contexts
vi.mock('../../src/contexts/SettingsContext', () => ({
  useSettings: () => ({
    language: 'en',
    activeTools: { stopwatch: true, calc: true, library: true },
    pinnedTools: { stopwatch: true },
    pinnedOrder: ['stopwatch'],
    updateSettings: vi.fn(),
  })
}));

vi.mock('../../src/contexts/ModalContext', () => ({
  useModal: () => ({
    showModal: vi.fn(),
  })
}));

// Mock hooks
vi.mock('../../src/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ isSm: false })
}));

// Mock child components
vi.mock('../../src/components/Sidebar', () => ({
  default: ({ activeTab, openToolOption, toggleCompact }: any) => (
    <div data-testid="sidebar">
      Sidebar
      <button data-testid="btn-library" onClick={() => openToolOption('library')}>Library</button>
      <button data-testid="btn-compact" onClick={() => toggleCompact()}>Compact</button>
    </div>
  )
}));

vi.mock('../../src/components/Stopwatch', () => ({ default: () => <div data-testid="stopwatch">Stopwatch Content</div> }));
vi.mock('../../src/components/Library', () => ({ default: () => <div data-testid="library">Library Content</div> }));
vi.mock('../../src/components/WhatsNewModal', () => ({ 
  default: () => <div data-testid="whatsnew">WhatsNew</div>,
  checkWhatsNew: () => false
}));
vi.mock('../../src/components/Onboarding', () => ({ default: () => <div data-testid="onboarding">Onboarding</div> }));
vi.mock('../../src/components/SplashAnimation', () => ({ default: () => null })); // skip splash

// Define missing globals
beforeEach(() => {
  vi.clearAllMocks();
  (window as any).electronAPI = {
    getPlugins: vi.fn().mockResolvedValue([]),
    setCompactMode: vi.fn(),
    setMiniMode: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    windowMinimize: vi.fn(),
    windowClose: vi.fn(),
    windowToggleMaximize: vi.fn(),
    ensureMinimumSize: vi.fn(),
    onUpdateAvailable: vi.fn().mockReturnValue(vi.fn()),
    onUpdateDownloaded: vi.fn().mockReturnValue(vi.fn()),
    onUpdateStatus: vi.fn().mockReturnValue(vi.fn()),
    onUpdaterError: vi.fn().mockReturnValue(vi.fn()),
  };
});

describe('App Shell Component', () => {
  it('renders Sidebar and Stopwatch by default', async () => {
    render(<App />);
    
    // Sidebar should be in the document
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    
    // Default active tab is stopwatch
    expect(screen.getByTestId('stopwatch')).toBeInTheDocument();
    
    // Library content should not be present initially
    expect(screen.queryByTestId('library')).not.toBeInTheDocument();
  });

  it('switches to Library tab when clicked in Sidebar', async () => {
    render(<App />);
    
    // Click library button in the mocked sidebar
    fireEvent.click(screen.getByTestId('btn-library'));
    
    // Library should now be rendered
    await waitFor(() => {
      expect(screen.getByTestId('library')).toBeInTheDocument();
    });
    
    // Stopwatch should no longer be rendered
    expect(screen.queryByTestId('stopwatch')).not.toBeInTheDocument();
  });

  it('toggles compact mode and calls electronAPI', async () => {
    render(<App />);
    
    // It should not be in compact mode initially
    // If it's not in compact mode, we see main-content
    expect(document.querySelector('.main-content')).toBeInTheDocument();
    
    // Click compact toggle
    fireEvent.click(screen.getByTestId('btn-compact'));
    
    // Compact mode is toggled
    await waitFor(() => {
      expect((window as any).electronAPI.setCompactMode).toHaveBeenCalledWith(true, expect.any(Number));
    });
    
    // When compact, main-content is unmounted!
    expect(document.querySelector('.main-content')).not.toBeInTheDocument();
  });
});
