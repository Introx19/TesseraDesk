/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Settings from '../../src/components/Settings';

// Mock contexts
vi.mock('../../src/contexts/SettingsContext', () => ({
  useSettings: () => ({
    language: 'en',
  })
}));

// Mock i18n
vi.mock('../../src/i18n/texts', () => ({
  t: (lang: string, key: string) => `translated_${key}`,
}));

// Mock the sub-tabs so we don't need to mount the whole application logic
vi.mock('../../src/components/settings/SettingsInterfaceTab', () => ({ default: () => <div data-testid="tab-interface">Interface Tab</div> }));
vi.mock('../../src/components/settings/SettingsSoundTab', () => ({ default: () => <div data-testid="tab-sound">Sound Tab</div> }));
vi.mock('../../src/components/settings/SettingsHotkeysTab', () => ({ default: () => <div data-testid="tab-hotkeys">Hotkeys Tab</div> }));
vi.mock('../../src/components/settings/SettingsToolsTab', () => ({ default: () => <div data-testid="tab-tools">Tools Tab</div> }));
vi.mock('../../src/components/settings/SettingsDLCTab', () => ({ default: () => <div data-testid="tab-dlc">DLC Tab</div> }));
vi.mock('../../src/components/settings/SettingsDataTab', () => ({ default: () => <div data-testid="tab-data">Data Tab</div> }));
vi.mock('../../src/components/settings/SettingsAboutTab', () => ({ default: () => <div data-testid="tab-about">About Tab</div> }));

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the window.electronAPI
    (window as any).electronAPI = {
      resizeWindow: vi.fn(),
    };
  });

  it('calls window.electronAPI.resizeWindow on mount', () => {
    render(<Settings />);
    expect((window as any).electronAPI.resizeWindow).toHaveBeenCalledWith(650, 650);
  });

  it('renders all tab buttons in the sidebar', () => {
    render(<Settings />);
    
    const sidebar = document.querySelector('.settings-sidebar');
    expect(sidebar).not.toBeNull();
    
    // Check if the 7 tab buttons exist
    const tabs = document.querySelectorAll('.settings-tab');
    expect(tabs.length).toBe(7);
  });

  it('renders Interface tab by default', () => {
    render(<Settings />);
    
    const interfaceTab = screen.getByTestId('tab-interface');
    expect(interfaceTab).toBeInTheDocument();
    
    // Sound tab should not be rendered initially
    const soundTab = screen.queryByTestId('tab-sound');
    expect(soundTab).toBeNull();
  });

  it('switches to Sound tab when clicked', () => {
    render(<Settings />);
    
    // The second tab is Sound (index 1)
    const tabs = document.querySelectorAll('.settings-tab');
    fireEvent.click(tabs[1]);
    
    // Sound tab should now be rendered
    const soundTab = screen.getByTestId('tab-sound');
    expect(soundTab).toBeInTheDocument();
    
    // Interface tab should be unmounted
    const interfaceTab = screen.queryByTestId('tab-interface');
    expect(interfaceTab).toBeNull();
  });

  it('switches to Data tab and renders correct content', () => {
    render(<Settings />);
    
    // Find the data tab
    const tabs = document.querySelectorAll('.settings-tab');
    fireEvent.click(tabs[5]); // Data tab is at index 5
    
    const dataTab = screen.getByTestId('tab-data');
    expect(dataTab).toBeInTheDocument();
  });
});
