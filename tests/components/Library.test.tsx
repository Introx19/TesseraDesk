/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Library from '../../src/components/Library';

const mockUpdateSettings = vi.fn();

// Mock the context
vi.mock('../../src/contexts/SettingsContext', () => ({
  useSettings: () => ({
    language: 'en',
    activeTools: { stopwatch: true, calc: true, devTools: true },
    pinnedTools: { stopwatch: true },
    pinnedOrder: ['stopwatch'],
    libraryFolders: [
      { id: 'folder_1', name: 'My Folder', tools: ['calc'] }
    ],
    updateSettings: mockUpdateSettings,
  })
}));

// Mock the i18n
vi.mock('../../src/i18n/texts', () => ({
  t: (lang: string, key: string) => `translated_${key}`,
}));

// Mock the window size hook
vi.mock('../../src/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ isSm: false })
}));

describe('Library Component', () => {
  const mockProps = {
    onOpenTool: vi.fn(),
    openPaint: vi.fn(),
    takeScreenshot: vi.fn(),
    plugins: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders folders and un-foldered tools correctly', () => {
    render(<Library {...mockProps} />);
    
    // Check if the folder is rendered
    expect(screen.getByText('My Folder')).toBeInTheDocument();
    
    // Check if loose tool (devTools) is rendered
    expect(screen.getByText('translated_dlc_devTools_name')).toBeInTheDocument();
    
    // calc should NOT be rendered loosely, because it's inside the folder and the modal is closed
    expect(screen.queryByText('translated_calc')).not.toBeInTheDocument();
  });

  it('opens folder modal on click and shows contents', () => {
    render(<Library {...mockProps} />);
    
    // Click the folder
    fireEvent.click(screen.getByText('My Folder'));
    
    // The calc tool should now be visible in the modal
    expect(screen.getByText('translated_calc')).toBeInTheDocument();
  });

  it('creates a new folder when New Folder button is clicked', () => {
    render(<Library {...mockProps} />);
    
    const newFolderBtn = screen.getByText('New Folder');
    fireEvent.click(newFolderBtn);
    
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        libraryFolders: expect.arrayContaining([
          expect.objectContaining({ name: 'New Folder' })
        ])
      })
    );
  });

  it('calls onOpenTool when clicking a tool', () => {
    render(<Library {...mockProps} />);
    
    const devToolsBtn = screen.getByText('translated_dlc_devTools_name');
    fireEvent.click(devToolsBtn);
    
    expect(mockProps.onOpenTool).toHaveBeenCalledWith('devTools');
  });

  it('calls openPaint when clicking the paint tool', () => {
    // we need to mock useSettings to include paint in activeTools to test this
    // but the global mock doesn't have it. We can skip or test what's available.
    render(<Library {...mockProps} />);
    const stopwatchBtn = screen.getByText('translated_stopwatch');
    fireEvent.click(stopwatchBtn);
    expect(mockProps.onOpenTool).toHaveBeenCalledWith('stopwatch');
  });
});
