/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Sidebar from '../../src/components/Sidebar';

// Mock the context
vi.mock('../../src/contexts/SettingsContext', () => ({
  useSettings: () => ({
    language: 'en',
    activeTools: { stopwatch: true, calc: true },
    pinnedTools: { stopwatch: true, calc: true },
    pinnedOrder: ['stopwatch', 'calc'],
    updateSettings: vi.fn(),
    dndMode: false,
    bgOpacity: 0.9,
  })
}));

// Mock the i18n
vi.mock('../../src/i18n/texts', () => ({
  t: (lang: string, key: string) => `translated_${key}`,
}));

describe('Sidebar Component', () => {
  const mockProps = {
    isCompact: false,
    isMini: false,
    miniAnimating: false,
    activeTab: 'stopwatch',
    plugins: [],
    openToolOption: vi.fn(),
    toggleMini: vi.fn(),
    toggleCompact: vi.fn(),
    takeScreenshot: vi.fn(),
    openPaint: vi.fn(),
    isOpaque: false,
    setIsOpaque: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pinned tools based on SettingsContext', () => {
    render(<Sidebar {...mockProps} />);
    
    // Check if tools exist by ID
    const stopwatchBtn = document.getElementById('nav-stopwatch');
    expect(stopwatchBtn).not.toBeNull();
    
    const calcBtn = document.getElementById('nav-calc');
    expect(calcBtn).not.toBeNull();
  });

  it('calls openToolOption when a tool is clicked', () => {
    render(<Sidebar {...mockProps} />);
    const calcBtn = document.getElementById('nav-calc');
    expect(calcBtn).not.toBeNull();
    
    fireEvent.click(calcBtn!);
    expect(mockProps.openToolOption).toHaveBeenCalledWith('calc');
  });

  it('hides non-pinned tools', () => {
    render(<Sidebar {...mockProps} />);
    const tasksBtn = document.getElementById('nav-tasks');
    expect(tasksBtn).toBeNull(); // Should not be rendered because it's not in mocked pinnedOrder
  });

  it('renders compact mode specific buttons when isCompact is true', () => {
    render(<Sidebar {...mockProps} isCompact={true} />);
    
    // Expand button should have the translated title
    const expandBtn = screen.getByTitle('translated_expand');
    expect(expandBtn).toBeInTheDocument();
    
    fireEvent.click(expandBtn);
    expect(mockProps.toggleCompact).toHaveBeenCalled();
  });
});
