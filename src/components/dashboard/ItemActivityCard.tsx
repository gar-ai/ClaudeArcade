import type { InventoryItem, ItemStatus } from '../../types';

interface ItemActivityCardProps {
  item: InventoryItem;
  status?: ItemStatus;
  compact?: boolean;
}

// Connection status badge colors
const CONNECTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  connected: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', label: 'Connected' },
  disconnected: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Disconnected' },
  error: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Error' },
  unknown: { bg: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af', label: 'Unknown' },
};

// Format time since last use
function formatTimeSince(timestamp?: number): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Format token count
function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

export function ItemActivityCard({ item, status, compact = false }: ItemActivityCardProps) {
  const connectionStatus = status?.connectionStatus || 'unknown';
  const connectionInfo = CONNECTION_COLORS[connectionStatus] || CONNECTION_COLORS.unknown;
  const isMCP = item.itemType === 'trinket';
  const isSubagent = item.itemType === 'companion';

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 p-2 rounded"
        style={{
          background: 'var(--bg-tertiary)',
          border: status?.isActive ? '1px solid var(--accent)' : '1px solid transparent',
        }}
      >
        {/* Status indicator */}
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: status?.isActive ? 'var(--accent)' : connectionInfo.text,
            boxShadow: status?.isActive ? '0 0 6px var(--accent)' : 'none',
          }}
        />

        {/* Name */}
        <span
          className="flex-1 text-xs truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {item.name}
        </span>

        {/* Quick stats */}
        {status?.runCount !== undefined && status.runCount > 0 && (
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            x{status.runCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
        border: status?.isActive
          ? '1px solid var(--accent)'
          : '1px solid var(--bg-tertiary)',
        boxShadow: status?.isActive ? '0 0 12px rgba(201, 162, 39, 0.3)' : 'none',
      }}
    >
      {/* Header */}
      <div className="p-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Activity indicator */}
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background: status?.isActive ? 'var(--accent)' : 'var(--bg-primary)',
                boxShadow: status?.isActive ? '0 0 8px var(--accent)' : 'none',
                animation: status?.isActive ? 'pulse 1s infinite' : 'none',
              }}
            />
            <h4
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {item.name}
            </h4>
          </div>
          <p
            className="text-[10px] mt-0.5 truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {item.description}
          </p>
        </div>

        {/* Connection status badge for MCPs */}
        {isMCP && (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ml-2"
            style={{
              background: connectionInfo.bg,
              color: connectionInfo.text,
            }}
          >
            {connectionInfo.label}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Token weight */}
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Context:
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            {formatTokens(status?.currentTokens || item.tokenWeight)}
          </span>
          {/* Show base vs invoked for skills */}
          {status?.baseTokens && status.invokedTokens && status.baseTokens !== status.invokedTokens && (
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              ({formatTokens(status.baseTokens)} base)
            </span>
          )}
        </div>

        {/* Usage stats */}
        <div className="flex items-center gap-3">
          {status?.runCount !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Used:
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {status.runCount}x
              </span>
            </div>
          )}
          {status?.lastUsed && (
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Last:
              </span>
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                {formatTimeSince(status.lastUsed)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Subagent isolated context */}
      {isSubagent && status?.isolatedContextUsage !== undefined && (
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{
            borderTop: '1px solid var(--bg-tertiary)',
            background: 'rgba(139, 92, 246, 0.1)',
          }}
        >
          <span className="text-[10px]" style={{ color: '#a78bfa' }}>
            Isolated Context:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
              {formatTokens(status.isolatedContextUsage)}/200K
            </span>
            <div
              className="w-16 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(139, 92, 246, 0.2)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((status.isolatedContextUsage / 200000) * 100, 100)}%`,
                  background: '#a78bfa',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
