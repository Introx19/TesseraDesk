import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Palette, Volume2, Keyboard, PenTool, Package, Info, Database } from 'lucide-react';
import { t, type Lang } from '../i18n/texts';

import SettingsInterfaceTab from './settings/SettingsInterfaceTab';
import SettingsSoundTab from './settings/SettingsSoundTab';
import SettingsHotkeysTab from './settings/SettingsHotkeysTab';
import SettingsToolsTab from './settings/SettingsToolsTab';
import SettingsDLCTab from './settings/SettingsDLCTab';
import SettingsDataTab from './settings/SettingsDataTab';
import SettingsAboutTab from './settings/SettingsAboutTab';

const Settings: React.FC = () => {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState<'interface' | 'sound' | 'hotkeys' | 'tools' | 'dlc' | 'data' | 'about'>('interface');

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.resizeWindow) {
      window.electronAPI.resizeWindow(650, 650);
    }
  }, []);

  return (
    <div className="settings-container">
      <div className="settings-sidebar">
        <div className={`settings-tab ${activeTab === 'interface' ? 'active' : ''}`} onClick={() => setActiveTab('interface')}>
          <Palette size={18} /> {t(language as Lang, 'general')}
        </div>
        <div className={`settings-tab ${activeTab === 'sound' ? 'active' : ''}`} onClick={() => setActiveTab('sound')}>
          <Volume2 size={18} /> {t(language as Lang, 'menuSounds')}
        </div>
        <div className={`settings-tab ${activeTab === 'hotkeys' ? 'active' : ''}`} onClick={() => setActiveTab('hotkeys')}>
          <Keyboard size={18} /> {t(language as Lang, 'shortcuts')}
        </div>
        <div className={`settings-tab ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>
          <PenTool size={18} /> {t(language as Lang, 'menuTools')}
        </div>
        <div className={`settings-tab ${activeTab === 'dlc' ? 'active' : ''}`} onClick={() => setActiveTab('dlc')}>
          <Package size={18} /> {t(language as Lang, 'tools')}
        </div>
        <div className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>
          <Database size={18} /> {language === 'ru' ? 'Данные' : 'Data'}
        </div>
        <div className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
          <Info size={18} /> {t(language as Lang, 'tabAbout')}
        </div>
      </div>
      <div className="settings-content">
        <h2>
          {activeTab === 'interface' && t(language as Lang, 'tabInterface')}
          {activeTab === 'sound' && t(language as Lang, 'tabSound')}
          {activeTab === 'hotkeys' && t(language as Lang, 'tabHotkeys')}
          {activeTab === 'tools' && t(language as Lang, 'tabTools')}
          {activeTab === 'dlc' && t(language as Lang, 'tabDlc')}
          {activeTab === 'data' && (language === 'ru' ? 'Резервное копирование' : 'Data Backup')}
          {activeTab === 'about' && t(language as Lang, 'tabAbout')}
        </h2>
        {activeTab === 'interface' && <SettingsInterfaceTab />}
        {activeTab === 'sound' && <SettingsSoundTab />}
        {activeTab === 'hotkeys' && <SettingsHotkeysTab />}
        {activeTab === 'tools' && <SettingsToolsTab />}
        {activeTab === 'dlc' && <SettingsDLCTab />}
        {activeTab === 'data' && <SettingsDataTab />}
        {activeTab === 'about' && <SettingsAboutTab />}
      </div>
    </div>
  );
};

export default Settings;
