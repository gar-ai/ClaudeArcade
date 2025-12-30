import { useMemo } from 'react';
import type { InventoryItem } from '../../types';
import { ITEM_TYPE_INFO } from '../../types';

interface ContextImpactChartProps {
  items: InventoryItem[];
  totalBudget: number;
  currentUsage: number;
}

// Color mapping for item types
const TYPE_COLORS: Record<string, string> = {
  helm: '#c9a227',      // Gold for CLAUDE.md
  hooks: '#3b82f6',     // Blue for hooks
  mainhand: '#ef4444',  // Red for primary plugin
  offhand: '#f97316',   // Orange for secondary plugin
  ring: '#eab308',      // Yellow for commands
  spell: '#a855f7',     // Purple for skills
  companion: '#06b6d4', // Cyan for subagents
  trinket: '#22c55e',   // Green for MCPs
};

// Format token count
function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

export function ContextImpactChart({ items, totalBudget, currentUsage }: ContextImpactChartProps) {
  // Group items by type and calculate totals
  const breakdown = useMemo(() => {
    const grouped: Record<string, { items: InventoryItem[]; total: number }> = {};

    items.forEach((item) => {
      if (!grouped[item.itemType]) {
        grouped[item.itemType] = { items: [], total: 0 };
      }
      grouped[item.itemType].items.push(item);
      grouped[item.itemType].total += item.tokenWeight;
    });

    // Sort by total tokens (highest first)
    return Object.entries(grouped)
      .map(([type, data]) => ({
        type,
        label: ITEM_TYPE_INFO[type as keyof typeof ITEM_TYPE_INFO]?.label || type,
        items: data.items,
        total: data.total,
        percentage: (data.total / totalBudget) * 100,
        color: TYPE_COLORS[type] || '#6b7280',
      }))
      .sort((a, b) => b.total - a.total);
  }, [items, totalBudget]);

  const usagePercentage = (currentUsage / totalBudget) * 100;

  // Determine zone colors
  const getZoneColor = (percentage: number) => {
    if (percentage >= 50) return { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'DUMB ZONE' };
    if (percentage >= 40) return { bg: 'rgba(251, 146, 60, 0.2)', text: '#fb923c', label: 'HEAVY' };
    if (percentage >= 25) return { bg: 'rgba(250, 204, 21, 0.2)', text: '#facc15', label: 'MODERATE' };
    return { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', label: 'HEALTHY' };
  };

  const zone = getZoneColor(usagePercentage);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
        border: '1px solid var(--bg-tertiary)',
      }}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Context Budget
          </h3>
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Per-item context impact
          </p>
        </div>
        <div
          className="px-2 py-1 rounded text-xs font-bold"
          style={{ background: zone.bg, color: zone.text }}
        >
          {zone.label}
        </div>
      </div>

      {/* Main progress bar */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {formatTokens(currentUsage)} / {formatTokens(totalBudget)} tokens
          </span>
          <span className="text-xs font-medium" style={{ color: zone.text }}>
            {usagePercentage.toFixed(1)}%
          </span>
        </div>

        {/* Stacked bar showing breakdown */}
        <div
          className="h-4 rounded-full overflow-hidden flex"
          style={{ background: 'var(--bg-primary)' }}
        >
          {breakdown.map((group, index) => (
            <div
              key={group.type}
              className="h-full transition-all"
              style={{
                width: `${group.percentage}%`,
                background: group.color,
                marginLeft: index > 0 ? '-1px' : 0,
              }}
              title={`${group.label}: ${formatTokens(group.total)} (${group.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>

        {/* Zone markers */}
        <div className="relative h-3 mt-1">
          <div
            className="absolute top-0 h-2 border-l"
            style={{ left: '25%', borderColor: 'var(--text-secondary)' }}
          >
            <span className="absolute top-2 text-[8px]" style={{ color: 'var(--text-secondary)', transform: 'translateX(-50%)' }}>
              25%
            </span>
          </div>
          <div
            className="absolute top-0 h-2 border-l"
            style={{ left: '40%', borderColor: '#facc15' }}
          >
            <span className="absolute top-2 text-[8px]" style={{ color: '#facc15', transform: 'translateX(-50%)' }}>
              40%
            </span>
          </div>
          <div
            className="absolute top-0 h-2 border-l"
            style={{ left: '50%', borderColor: '#ef4444' }}
          >
            <span className="absolute top-2 text-[8px]" style={{ color: '#ef4444', transform: 'translateX(-50%)' }}>
              50%
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown legend */}
      <div
        className="px-3 py-2"
        style={{
          borderTop: '1px solid var(--bg-tertiary)',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {breakdown.map((group) => (
            <div key={group.type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ background: group.color }}
              />
              <span className="text-[10px] flex-1" style={{ color: 'var(--text-secondary)' }}>
                {group.label}
              </span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {formatTokens(group.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top context hogs */}
      {items.length > 0 && (
        <div
          className="px-3 py-2"
          style={{ borderTop: '1px solid var(--bg-tertiary)' }}
        >
          <h4 className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Top Context Users
          </h4>
          <div className="space-y-1">
            {items
              .sort((a, b) => b.tokenWeight - a.tokenWeight)
              .slice(0, 5)
              .map((item) => {
                const itemPercentage = (item.tokenWeight / totalBudget) * 100;
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: TYPE_COLORS[item.itemType] || '#6b7280' }}
                    />
                    <span
                      className="flex-1 text-[10px] truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: itemPercentage > 10 ? '#ef4444' : 'var(--text-secondary)' }}
                    >
                      {formatTokens(item.tokenWeight)} ({itemPercentage.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
