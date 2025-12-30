import { useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { getContextForecast } from '../../utils/recommendations';
import type { InventoryItem } from '../../types';

interface ContextForecastProps {
  item: InventoryItem;
  showInline?: boolean;
}

export function ContextForecast({ item, showInline = false }: ContextForecastProps) {
  const stats = useAppStore((state) => state.stats);

  const forecast = useMemo(() => {
    return getContextForecast(stats.equipped, item.tokenWeight, stats.totalBudget);
  }, [stats.equipped, stats.totalBudget, item.tokenWeight]);

  const getStatusColor = () => {
    if (forecast.newPercentage >= 50) return 'var(--danger)';
    if (forecast.newPercentage >= 25) return 'var(--warning)';
    return 'var(--success)';
  };

  const getStatusIcon = () => {
    if (forecast.newPercentage >= 50) return '!';
    if (forecast.newPercentage >= 25) return '~';
    return 'o';
  };

  if (showInline) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span>{getStatusIcon()}</span>
        <span style={{ color: getStatusColor() }}>
          +{item.tokenWeight.toLocaleString()} {'>'} {forecast.newPercentage.toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'var(--bg-tertiary)',
        border: forecast.warning ? `1px solid ${getStatusColor()}` : '1px solid transparent',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Context Forecast
        </span>
        <span className="text-sm">{getStatusIcon()}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Current:</span>
          <span style={{ color: 'var(--text-primary)' }}>
            {stats.equipped.toLocaleString()} tokens ({((stats.equipped / stats.totalBudget) * 100).toFixed(1)}%)
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Item cost:</span>
          <span style={{ color: 'var(--accent)' }}>+{item.tokenWeight.toLocaleString()}</span>
        </div>

        <div
          className="flex items-center justify-between text-sm font-medium pt-1"
          style={{ borderTop: '1px solid var(--bg-secondary)' }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>After equip:</span>
          <span style={{ color: getStatusColor() }}>
            {forecast.newTotal.toLocaleString()} ({forecast.newPercentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      {forecast.warning && (
        <div
          className="mt-2 px-2 py-1.5 rounded text-xs"
          style={{
            background: `${getStatusColor()}20`,
            color: getStatusColor(),
          }}
        >
          {forecast.warning}
        </div>
      )}
    </div>
  );
}
