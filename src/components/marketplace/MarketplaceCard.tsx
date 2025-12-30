import type { MarketplaceItem } from '../../types/mcp';

interface MarketplaceCardProps {
  item: MarketplaceItem;
  isInstalled: boolean;
  isLoading: boolean;
  onInstall: () => void;
  onRemove: () => void;
  onViewRepo: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  documents: 'D',
  design: 'A',
  development: 'C',
  communication: 'M',
  enterprise: 'E',
  core: 'X',
  integrations: 'I',
  utilities: 'U',
  other: 'O',
};

const SOURCE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  official: { label: 'Official', color: '#c9a227', bg: 'rgba(201, 162, 39, 0.2)' },
  enterprise: { label: 'Enterprise', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.2)' },
  community: { label: 'Community', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)' },
};

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  skill: { label: 'Skill', color: '#34d399' },
  mcp: { label: 'MCP', color: '#fb923c' },
};

export function MarketplaceCard({
  item,
  isInstalled,
  isLoading,
  onInstall,
  onRemove,
  onViewRepo,
}: MarketplaceCardProps) {
  const icon = CATEGORY_ICONS[item.category] || item.icon || 'O';
  const sourceBadge = SOURCE_BADGES[item.source];
  const typeBadge = TYPE_BADGES[item.type];

  return (
    <div
      className="p-4 rounded-lg transition-all"
      style={{
        background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
        border: isInstalled ? '2px solid #1eff00' : '2px solid #4a3f32',
        boxShadow: isInstalled ? '0 0 12px rgba(30, 255, 0, 0.2)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center text-xl"
            style={{
              background: 'linear-gradient(135deg, #3f362c 0%, #2d261e 100%)',
              border: '2px solid #524738',
            }}
          >
            {icon}
          </div>
          <div>
            <h3
              className="font-semibold text-sm"
              style={{
                color: '#f5e6d3',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {item.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {/* Source Badge */}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold"
                style={{
                  background: sourceBadge.bg,
                  color: sourceBadge.color,
                  border: `1px solid ${sourceBadge.color}40`,
                }}
              >
                {sourceBadge.label}
              </span>
              {/* Type Badge */}
              <span
                className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold"
                style={{
                  background: `${typeBadge.color}20`,
                  color: typeBadge.color,
                  border: `1px solid ${typeBadge.color}40`,
                }}
              >
                {typeBadge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs mb-3 line-clamp-2" style={{ color: '#b8a894' }}>
        {item.description}
      </p>

      {/* Environment Variables Warning (for MCP) */}
      {item.requiresEnv && item.requiresEnv.length > 0 && (
        <div
          className="text-[10px] px-2 py-1.5 rounded mb-3"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#f59e0b',
          }}
        >
          Requires: {item.requiresEnv.join(', ')}
        </div>
      )}

      {/* Category */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] capitalize px-2 py-0.5 rounded"
          style={{
            background: '#2d261e',
            color: '#7a6f62',
            border: '1px solid #4a3f32',
          }}
        >
          {item.category}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {/* View Repo Button */}
        {item.repoUrl && (
          <button
            onClick={onViewRepo}
            className="flex-1 py-2 px-3 rounded text-xs font-medium transition-all"
            style={{
              background: 'rgba(100, 116, 139, 0.1)',
              color: '#94a3b8',
              border: '1px solid rgba(100, 116, 139, 0.3)',
            }}
          >
            View
          </button>
        )}

        {/* Install/Remove Button - for both MCP and Skills */}
        {isLoading ? (
          <button
            disabled
            className="flex-1 py-2 px-3 rounded text-xs font-medium transition-all opacity-70"
            style={{
              background: 'rgba(100, 116, 139, 0.2)',
              color: '#94a3b8',
              border: '1px solid rgba(100, 116, 139, 0.3)',
            }}
          >
            <span className="animate-pulse">Installing...</span>
          </button>
        ) : isInstalled ? (
          <button
            onClick={onRemove}
            className="flex-1 py-2 px-3 rounded text-xs font-medium transition-all"
            style={{
              background: 'rgba(30, 255, 0, 0.1)',
              color: '#1eff00',
              border: '1px solid rgba(30, 255, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
              e.currentTarget.style.color = '#f87171';
              e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.4)';
              e.currentTarget.textContent = 'Remove';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(30, 255, 0, 0.1)';
              e.currentTarget.style.color = '#1eff00';
              e.currentTarget.style.borderColor = 'rgba(30, 255, 0, 0.3)';
              e.currentTarget.textContent = 'Installed';
            }}
          >
            Installed
          </button>
        ) : (
          <button
            onClick={onInstall}
            className="flex-1 py-2 px-3 rounded text-xs font-bold uppercase transition-all"
            style={{
              background: 'linear-gradient(180deg, #c9a227 0%, #8b7019 100%)',
              color: '#1a1410',
              border: '1px solid #c9a227',
            }}
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
