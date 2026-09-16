import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, CheckCircle, AlertTriangle, Code, ShieldCheck, ShieldAlert, Download, Send } from 'lucide-react';
import '../../index.css';
import { t, type Lang } from '../../i18n/texts';
import { useSettings } from '../../contexts/SettingsContext';
import { useModal } from '../../contexts/ModalContext';

interface CreatorStudioProps {
  onPluginsChange?: () => void;
}

export default function CreatorStudio({ onPluginsChange }: CreatorStudioProps = {}) {
  const { language } = useSettings();
  const modal = useModal();
  const tr = (key: any) => t(language as Lang, key);

  const [activeTab, setActiveTab] = useState<'plugins' | 'dev'>('plugins');
  const [plugins, setPlugins] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [showContactInput, setShowContactInput] = useState(false);
  const [contactText, setContactText] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const loadPlugins = async () => {
    try {
      const list = await window.electronAPI.getPlugins();
      setPlugins(list);
      onPluginsChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleInstall = async () => {
    try {
      setError(null);
      const filePath = await window.electronAPI.selectFile([{ name: 'ZIP Archive', extensions: ['zip'] }]);
      if (filePath) {
        const res = await window.electronAPI.installPlugin(filePath);
        if (res.success) {
          await loadPlugins();
        } else {
          setError(res.error || 'Installation failed');
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUninstall = async (folderName: string) => {
    if (await modal.confirm(tr('dlcUninstallConfirm'))) {
      const res = await window.electronAPI.uninstallPlugin(folderName);
      if (res.success) {
        await loadPlugins();
      }
    }
  };

  const downloadDocs = () => {
    const docsText = `TesseraDesk Plugin (DLC) Development Guide

1. ARCHIVE STRUCTURE
A plugin is installed from a .zip archive. The root of the archive (NOT inside a subfolder) MUST contain:
- manifest.json (required)
- index.js (required, must be an ES Module)
- style.css (optional, automatically injected)
- icon.png (optional, used in the library UI)

2. MANIFEST.JSON
{
  "id": "my-cool-widget",         // Unique ID (lowercase letters and dashes only)
  "name": "Cool Widget",          // Display name in the library
  "version": "1.0.0",             // Plugin version
  "author": "Your Name",          // Developer name
  "description": "Description",   // Short description of the plugin
  "main": "index.js",             // Entry point script
  "icon": "icon.png"              // Icon filename (if included)
}

3. WIDGET SCRIPT (index.js) & API
CRITICAL RULES FOR AI AND DEVELOPERS:
- NO NATIVE JSX: The file is executed directly in a browser environment. Standard browsers do NOT support JSX syntax. You MUST either use 'React.createElement' or transpile your code before zipping.
- NO REACT IMPORTS: Do NOT use "import React from 'react';". React and its hooks (useState, useEffect) are already injected into the global window scope.
- NO NODE.JS: Do NOT use Node.js modules (fs, path). The plugin runs in a sandboxed renderer.
- MODULE FORMAT: You must use standard ES Module syntax and export your React component as default.

CONTEXT API TYPE DEFINITION:
type PluginContext = {
  theme: 'light' | 'dark';
  language: 'ru' | 'en';
  writeTextToClipboard: (text: string) => Promise<boolean>;
  readTextFromClipboard: () => Promise<string>;
  openExternal: (url: string) => void;
  t: (key: string) => string;
};

// Example index.js (Without JSX, safe for direct execution):
export default function MyWidget({ context }) {
  const { useState, createElement } = React;
  const [count, setCount] = useState(0);

  return createElement('div', { 
      className: \`p-4 h-full \${context.theme === 'dark' ? 'text-white' : 'text-black'}\`
    },
    createElement('h2', { className: 'text-xl font-bold mb-2' }, 'My Widget'),
    createElement('p', { className: 'mb-4' }, \`Current language: \${context.language}\`),
    createElement('button', {
      onClick: () => setCount(c => c + 1),
      className: 'px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg mb-2 transition-colors'
    }, \`Count: \${count}\`),
    createElement('br'),
    createElement('button', {
      onClick: () => context.writeTextToClipboard('Text from plugin!'),
      className: 'px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors'
    }, 'Copy Text to Clipboard')
  );
}

4. STYLING (style.css & Tailwind)
- Tailwind CSS is pre-installed in TesseraDesk. You can use standard Tailwind classes (like 'p-4', 'bg-blue-500', 'rounded-lg') directly.
- If you need custom CSS, create a 'style.css' file in the archive root. It will be automatically injected.

5. VERIFICATION & CERTIFICATION
By default, plugins are considered "Unverified". To remove the warning screen:
1. Ensure your plugin works perfectly.
2. Zip your plugin files.
3. Use the "Send for Verification" button in the Creator Studio or contact the developers.
4. After security audit, you will receive a signed 'signature' hash to add to your manifest.json.
`;
    const blob = new Blob([docsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TesseraDesk_Plugin_Docs.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendForVerification = async () => {
    try {
      setWebhookStatus(null);
      const filePath = await window.electronAPI.selectFile([{ name: 'ZIP Archive', extensions: ['zip'] }]);
      if (filePath) {
        const verifyRes = await window.electronAPI.verifyPluginZip(filePath);
        if (!verifyRes.valid) {
          setWebhookStatus({ type: 'error', msg: verifyRes.error || 'Invalid ZIP' });
          return;
        }
        setSelectedFile(filePath);
        setShowContactInput(true);
      }
    } catch (e: any) {
      setWebhookStatus({ type: 'error', msg: e.message });
    }
  };

  const confirmSend = async () => {
    if (!selectedFile) return;
    if (!contactText.trim()) {
      setWebhookStatus({ type: 'error', msg: tr('dlcContactEmptyError') as string });
      return;
    }
    
    try {
      setShowContactInput(false);
      // PROXY URL: Замените 'tesseradesk-backend' на название вашего проекта в Vercel, если оно будет другим
      const PROXY_URL = 'https://tesseradesk-backend.vercel.app/api/plugin-submit';
      setWebhookStatus({ type: 'success', msg: tr('webhookSending') });
      
      const res = await window.electronAPI.sendWebhook(PROXY_URL, selectedFile, contactText);
      
      if (res.success) {
        setWebhookStatus({ type: 'success', msg: tr('webhookSuccess') });
        setContactText('');
        setSelectedFile(null);
      } else {
        setWebhookStatus({ type: 'error', msg: tr('webhookError') + (res.error || `HTTP ${res.status} ${res.text}`) });
      }
    } catch (e: any) {
      setWebhookStatus({ type: 'error', msg: e.message });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main)', padding: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('plugins')}
          className={`action-btn ${activeTab === 'plugins' ? 'active' : 'outline'}`}
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}
        >
          <Package size={18}/> {tr('dlcMyPlugins')}
        </button>
        <button 
          onClick={() => setActiveTab('dev')}
          className={`action-btn ${activeTab === 'dev' ? 'active' : 'outline'}`}
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'center' }}
        >
          <Code size={18}/> {tr('dlcDevTab')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {error && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {activeTab === 'plugins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button 
              onClick={handleInstall}
              className="action-btn outline"
              style={{ width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', borderStyle: 'dashed', borderWidth: '2px', borderRadius: '8px' }}
            >
              <Plus size={24} />
              <span style={{ fontWeight: 500 }}>{tr('dlcInstallBtn')}</span>
            </button>

            {plugins.map(p => (
              <div key={p.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {p.icon ? (
                    <img src={`plugin://${p.absolutePath}/${p.icon}`} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} alt="icon"/>
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={24} className="text-gray-400"/>
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.1em', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
                      {p.name}
                      {p.isVerified ? (
                        <span style={{ fontSize: '0.7em', padding: '2px 8px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'normal' }} title={tr('dlcVerifiedBadge')}>
                          <ShieldCheck size={12}/> Verified
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7em', padding: '2px 8px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'normal' }} title={tr('dlcUnverifiedBadge')}>
                          <ShieldAlert size={12}/> Unverified
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', margin: '0' }}>v{p.version} | by {p.author}</p>
                    <p style={{ fontSize: '0.9em', marginTop: '4px', marginBottom: '0' }}>{p.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUninstall(p.folderName)}
                  className="icon-btn"
                  style={{ color: '#ef4444', borderColor: 'transparent', background: 'transparent' }}
                  title={tr('dlcDeleteTitle')}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            
            {plugins.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <Package size={48} style={{ margin: '0 auto 15px auto', opacity: 0.2 }}/>
                <p>{tr('dlcEmptyState')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dev' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {webhookStatus && (
              <div style={{ padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', background: webhookStatus.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: webhookStatus.type === 'error' ? '#ef4444' : '#22c55e' }}>
                {webhookStatus.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                {webhookStatus.msg}
              </div>
            )}

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '20px' }}>
              <h2 style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code className="text-blue-500"/> {tr('dlcDocsTitle')}
              </h2>
              <p style={{ margin: '0 0 20px 0', opacity: 0.8, fontSize: '0.95em', lineHeight: '1.5' }}>
                {tr('dlcDocsDesc')}
              </p>
              
              {showContactInput ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{tr('dlcContactPrompt')}</p>
                  <input 
                    type="text" 
                    className="task-input" 
                    placeholder={tr('dlcContactPlaceholder') as string}
                    value={contactText} 
                    onChange={e => setContactText(e.target.value)} 
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button className="action-btn outline" style={{ flex: 1 }} onClick={() => setShowContactInput(false)}>{tr('dlcCancelBtn')}</button>
                    <button className="action-btn active" style={{ flex: 1 }} onClick={confirmSend}>{tr('dlcSendFileBtn')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={downloadDocs}
                    className="w-full px-4 py-3 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-medium flex items-center justify-center gap-2 transition-all border border-blue-500/20"
                  >
                    <Download size={20}/> {tr('dlcDownloadDocs')}
                  </button>
  
                  <button 
                    onClick={sendForVerification}
                    className="w-full px-4 py-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 font-medium flex items-center justify-center gap-2 transition-all border border-green-500/20"
                  >
                    <Send size={20}/> {tr('dlcSendVerify')}
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '20px' }}>
              <h2 style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle className="text-green-500"/> {tr('dlcVerifiedTitle')}
              </h2>
              <p style={{ margin: '0 0 15px 0', opacity: 0.8, fontSize: '0.9em', lineHeight: '1.5' }}>
                {tr('dlcVerifiedDesc')}
              </p>
              <ol style={{ paddingLeft: '20px', margin: '0 0 15px 0', opacity: 0.8, fontSize: '0.9em', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>{tr('dlcVerifiedStep1')}</li>
                <li>{tr('dlcVerifiedStep2')}</li>
                <li>{tr('dlcVerifiedStep3')}</li>
                <li>{tr('dlcVerifiedStep4')}</li>
                <li>{tr('dlcVerifiedStep5')}</li>
                <li>{tr('dlcVerifiedStep6')}</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
