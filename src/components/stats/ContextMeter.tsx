import { useAppStore } from '../../stores/appStore';
import { STATUS_COLORS } from '../../types';

export function ContextMeter() {
  const stats = useAppStore((state) => state.stats);

  const percentage = Math.min(100, Math.round(stats.loadPercentage * 100));
  const statusColor = STATUS_COLORS[stats.status];

  const statusLabel = {
    healthy: 'Optimal',
    heavy: 'Heavy',
    dumbzone: 'DUMBZONE',
  }[stats.status];

  const formatTokens = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="space-y-2">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
            }}
          />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: '#b8a894' }}>
          {formatTokens(stats.equipped)} / {formatTokens(stats.totalBudget)}
        </span>
      </div>

      {/* Progress bar with zone markers */}
      <div className="relative">
        <div
          className="h-3 rounded overflow-hidden relative"
          style={{
            background: 'linear-gradient(180deg, #1a1410 0%, #2a231c 100%)',
            border: '2px solid #4a3f32',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Zone backgrounds */}
          <div className="absolute inset-0 flex">
            <div className="w-1/4" style={{ background: 'rgba(74, 222, 128, 0.1)' }} /> {/* Healthy 0-25% */}
            <div className="w-1/4" style={{ background: 'rgba(251, 191, 36, 0.1)' }} /> {/* Heavy 25-50% */}
            <div className="w-1/2" style={{ background: 'rgba(248, 113, 113, 0.1)' }} /> {/* Dumbzone 50%+ */}
          </div>

          {/* Fill bar */}
          <div
            className="h-full transition-all duration-500 ease-out relative z-10"
            style={{
              width: `${percentage}%`,
              background: `linear-gradient(90deg,
                ${STATUS_COLORS.healthy} 0%,
                ${percentage > 25 ? STATUS_COLORS.heavy : STATUS_COLORS.healthy} ${Math.min(100, 25 / percentage * 100)}%,
                ${percentage > 50 ? STATUS_COLORS.dumbzone : STATUS_COLORS.heavy} 100%
              )`,
              boxShadow: `0 0 8px ${statusColor}60`,
            }}
          />

          {/* Zone markers */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: '25%', background: '#4a3f32' }}
          />
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: '50%', background: '#4a3f32' }}
          />
        </div>

        {/* Zone labels */}
        <div className="flex text-[9px] mt-1" style={{ color: '#7a6f62' }}>
          <div className="w-1/4 text-center">Safe</div>
          <div className="w-1/4 text-center">Heavy</div>
          <div className="w-1/2 text-center">Dumbzone</div>
        </div>
      </div>

      {/* Warning messages */}
      {stats.status === 'heavy' && (
        <div
          className="p-2 rounded text-[10px] mt-1"
          style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
          }}
        >
          Warning: Context heavy - consider unequipping
        </div>
      )}
      {stats.status === 'dumbzone' && (
        <div
          className="p-2 rounded text-[10px] font-medium mt-1"
          style={{
            background: 'rgba(248, 113, 113, 0.15)',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            color: '#f87171',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          DUMBZONE! Performance degraded
        </div>
      )}
    </div>
  );
}
