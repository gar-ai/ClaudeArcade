import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { UsageDashboard } from '../analytics/UsageDashboard';
import { ItemActivityDashboard } from '../dashboard';

export function StatusBar() {
  const lastSyncTimestamp = useAppStore((state) => state.lastSyncTimestamp);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const openWorkflowEditor = useWorkflowStore((state) => state.openEditor);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const syncTime = lastSyncTimestamp
    ? new Date(lastSyncTimestamp).toLocaleTimeString()
    : 'Never';

  return (
    <>
      <footer
        className="h-7 flex items-center justify-between px-4 text-xs"
        style={{
          background: `linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)`,
          borderTop: '2px solid var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex items-center gap-4">
          {error ? (
            <span style={{ color: '#ef4444' }}>Error: {error}</span>
          ) : (
            <span>
              {isLoading ? (
                <span style={{ color: 'var(--accent)' }}>Scanning...</span>
              ) : (
                `Synced at ${syncTime}`
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowActivity(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded transition-all"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>Activity</span>
          </button>
          <button
            onClick={() => openWorkflowEditor()}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded transition-all"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            title="Cmd+W"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>Workflows</span>
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded transition-all"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <span>Analytics</span>
          </button>
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Claude Code</span>
        </div>
      </footer>

      <UsageDashboard isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />
      <ItemActivityDashboard isOpen={showActivity} onClose={() => setShowActivity(false)} />
    </>
  );
}
