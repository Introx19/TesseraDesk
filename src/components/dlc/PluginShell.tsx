import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { AlertCircle, Loader2 } from 'lucide-react';
import { t, type Lang } from '../../i18n/texts';

interface PluginShellProps {
  plugin: any;
}

const AGREED_PLUGINS_KEY = 'tesseradesk-agreed-unverified-plugins';

function getAgreedPlugins(): Set<string> {
  try {
    const raw = localStorage.getItem(AGREED_PLUGINS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveAgreedPlugin(id: string) {
  const set = getAgreedPlugins();
  set.add(id);
  localStorage.setItem(AGREED_PLUGINS_KEY, JSON.stringify([...set]));
}

/**
 * Builds the HTML document that runs inside the sandboxed <iframe>.
 * This document is loaded via `srcDoc`, never has access to the host page,
 * and communicates with PluginShell exclusively through postMessage.
 *
 * Plugin contract (see PLUGIN_GUIDE.md):
 *   export function mount(container: HTMLElement, context: PluginContext): (() => void) | void
 * Plugins must bundle their own React/React-DOM (no more "external" build) since
 * they no longer share the host's React instance.
 */
function buildPluginBootstrapHtml(scriptUrl: string, cssUrl: string | null): string {
  // scriptUrl / cssUrl are plugin://localhost/... URLs, safe to inline: they are built
  // from an absolute filesystem path resolved by the main process, not from user input.
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
${cssUrl ? `<link rel="stylesheet" href="${cssUrl}" />` : ''}
<style>html,body,#plugin-root{height:100%;margin:0;padding:0;}</style>
</head>
<body>
<div id="plugin-root"></div>
<script type="module">
  let msgId = 0;
  const pending = new Map();

  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data) return;
    if (data.__tesseraReply && pending.has(data.id)) {
      const entry = pending.get(data.id);
      pending.delete(data.id);
      entry(data.result);
    }
    if (data.__tesseraContext) {
      context.theme = data.context.theme;
      context.language = data.context.language;
      try { mod && typeof mod.onContextUpdate === 'function' && mod.onContextUpdate(data.context); } catch (err) {}
    }
  });

  function callHost(type, payload) {
    return new Promise((resolve) => {
      const id = ++msgId;
      pending.set(id, resolve);
      parent.postMessage({ __tesseraCall: true, id, type, payload }, '*');
    });
  }

  const context = {
    theme: null,
    language: null,
    writeTextToClipboard: (text) => callHost('clipboard-write', text),
    readTextFromClipboard: () => callHost('clipboard-read'),
    openExternal: (url) => callHost('open-external', url),
  };

  let mod = null;

  (async () => {
    try {
      parent.postMessage({ __tesseraReady: true }, '*');
      // Wait for the host to send the initial theme/language before mounting.
      await new Promise((resolve) => {
        const onInit = (e) => {
          if (e.data && e.data.__tesseraInit) {
            context.theme = e.data.context.theme;
            context.language = e.data.context.language;
            window.removeEventListener('message', onInit);
            resolve();
          }
        };
        window.addEventListener('message', onInit);
      });

      mod = await import(${JSON.stringify(scriptUrl)});
      if (typeof mod.mount !== 'function') {
        throw new Error('Plugin does not export a mount(container, context) function.');
      }
      const container = document.getElementById('plugin-root');
      mod.mount(container, context);
      parent.postMessage({ __tesseraMounted: true }, '*');
    } catch (err) {
      parent.postMessage({ __tesseraError: true, message: (err && err.message) || String(err) }, '*');
    }
  })();
</script>
</body>
</html>`;
}

export default function PluginShell({ plugin }: PluginShellProps) {
  const [status, setStatus] = useState<'loading' | 'mounted' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const { theme, language } = useSettings();
  const tr = (key: any) => t(language as Lang, key);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // A plugin is "trusted" if it's verified by signature OR user already agreed to it before
  const isVerified = plugin.isVerified === true;
  const wasAgreed = getAgreedPlugins().has(plugin.id);
  const [agreedToRisk, setAgreedToRisk] = useState(isVerified || wasAgreed);

  const handleAgree = () => {
    saveAgreedPlugin(plugin.id);
    setAgreedToRisk(true);
  };

  // Bridge: respond to calls coming from inside the sandboxed iframe.
  useEffect(() => {
    if (!agreedToRisk) return;

    const onMessage = async (event: MessageEvent) => {
      // Only accept messages from this plugin's own iframe, never from anywhere else.
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data) return;

      if (data.__tesseraReady) {
        // Plugin's bootstrap doc has attached its listener; safe to send initial context now.
        iframeRef.current.contentWindow?.postMessage(
          { __tesseraInit: true, context: { theme, language } },
          '*'
        );
        return;
      }

      if (data.__tesseraMounted) {
        setStatus('mounted');
        return;
      }

      if (data.__tesseraError) {
        setStatus('error');
        setError(data.message || 'Failed to load plugin');
        return;
      }

      if (data.__tesseraCall) {
        let result: any = null;
        try {
          switch (data.type) {
            case 'clipboard-write':
              await navigator.clipboard.writeText(data.payload);
              result = true;
              break;
            case 'clipboard-read':
              result = await navigator.clipboard.readText();
              break;
            case 'open-external':
              window.electronAPI?.openExternal(data.payload);
              result = true;
              break;
            default:
              result = null;
          }
        } catch {
          result = null;
        }
        iframeRef.current.contentWindow?.postMessage(
          { __tesseraReply: true, id: data.id, result },
          '*'
        );
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // theme/language are intentionally not in deps beyond the init handshake;
    // live updates are pushed by the separate effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreedToRisk, plugin.id]);

  // Push live theme/language updates into the running plugin.
  useEffect(() => {
    if (status !== 'mounted' || !iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage(
      { __tesseraContext: true, context: { theme, language } },
      '*'
    );
  }, [theme, language, status]);

  if (!agreedToRisk) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-red-500">{tr('dlcUnverifiedWarning')}</h2>
        <p className="text-sm opacity-70">
          {tr('dlcUnverifiedDesc1')} <strong>{plugin.name}</strong> {tr('dlcUnverifiedDesc2')} ({plugin.author || tr('dlcUnknownAuthor')}).{' '}
          {tr('dlcUnverifiedDesc3')}
        </p>
        <p className="text-sm opacity-70">
          {tr('dlcUnverifiedDesc4')}
        </p>
        <button
          onClick={handleAgree}
          className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg"
        >
          {tr('dlcUnderstandRisk')}
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="text-red-500 font-bold">{tr('dlcLoadError')}{plugin.name}</p>
        <p className="text-sm opacity-50 mt-2">{error}</p>
      </div>
    );
  }

  const absPath = String(plugin.mainPath).replace(/\\/g, '/');
  const scriptUrl = `plugin://localhost/${absPath}`;
  const cssUrl = plugin.hasCss
    ? `plugin://localhost/${String(plugin.absolutePath).replace(/\\/g, '/').replace(/^([A-Za-z]):\//, '$1/')}/style.css`
    : null;
  const bootstrapHtml = buildPluginBootstrapHtml(scriptUrl, cssUrl);

  return (
    <div className="h-full w-full overflow-hidden plugin-container relative">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center h-full pointer-events-none">
          <Loader2 size={32} className="animate-spin opacity-50 mb-2" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={plugin.name}
        srcDoc={bootstrapHtml}
        sandbox="allow-scripts"
        style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
      />
    </div>
  );
}
