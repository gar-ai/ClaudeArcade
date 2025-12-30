import { useState, useEffect } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateCheckerProps {
  onUpdateAvailable?: (version: string) => void;
}

export function UpdateChecker({ onUpdateAvailable }: UpdateCheckerProps) {
  const [updateAvailable, setUpdateAvailable] = useState<Update | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const update = await check();
      if (update) {
        setUpdateAvailable(update);
        onUpdateAvailable?.(update.version);
      }
    } catch (err) {
      // Silently ignore errors when updater isn't configured (no endpoints/pubkey)
      // Only log to console for debugging
      console.debug('Update check skipped:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (!updateAvailable) return;

    setIsDownloading(true);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await updateAvailable.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      // Relaunch the app to apply the update
      await relaunch();
    } catch (err) {
      console.error('Update download failed:', err);
      setError('Failed to download update');
      setIsDownloading(false);
    }
  };

  // Check for updates on mount (with a delay to not block startup)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!updateAvailable && !isChecking && !error) {
    return null;
  }

  return (
    <div
      className="fixed bottom-16 right-4 z-50 p-4 rounded-lg shadow-xl max-w-sm"
      style={{
        background: 'var(--bg-secondary)',
        border: '2px solid var(--accent)',
      }}
    >
      {isChecking && (
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          <span className="text-sm">Checking for updates...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>
          <button
            onClick={checkForUpdates}
            className="text-xs px-2 py-1 rounded"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--accent)',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {updateAvailable && !isDownloading && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            <span className="font-medium" style={{ color: 'var(--accent)' }}>
              Update Available
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Version {updateAvailable.version} is ready to download.
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadAndInstall}
              className="flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg-primary)',
              }}
            >
              Update Now
            </button>
            <button
              onClick={() => setUpdateAvailable(null)}
              className="px-3 py-1.5 rounded text-sm transition-colors"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {isDownloading && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Downloading update...
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${downloadProgress}%`,
                background: 'var(--accent)',
              }}
            />
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-secondary)' }}>
            {downloadProgress}%
          </p>
        </div>
      )}
    </div>
  );
}
