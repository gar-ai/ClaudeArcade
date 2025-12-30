import { useAppStore } from '../../stores/appStore';
import { CONTEXT_BUDGET, ITEM_TYPE_INFO } from '../../types';

export function DumbzoneModal() {
  const pendingEquip = useAppStore((state) => state.pendingDumbzoneEquip);
  const forceEquip = useAppStore((state) => state.forceEquipItem);
  const cancelEquip = useAppStore((state) => state.cancelDumbzoneEquip);

  if (!pendingEquip) return null;

  const { item, currentUsage, projectedUsage, projectedPercentage } = pendingEquip;
  const typeInfo = ITEM_TYPE_INFO[item.itemType];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div
        className="relative w-full max-w-md p-6 rounded-lg shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #2a1a1a 0%, #1c1210 100%)',
          border: '2px solid #8b2020',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
        }}
      >
        {/* Warning header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
            style={{
              background: 'radial-gradient(circle, #ef4444 0%, #7f1d1d 100%)',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
            }}
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
            >
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: '#ef4444', textShadow: '0 0 10px rgba(239, 68, 68, 0.5)' }}
            >
              DUMBZONE WARNING
            </h2>
            <p className="text-xs" style={{ color: '#fca5a5' }}>
              Performance will degrade significantly
            </p>
          </div>
        </div>

        {/* Context bar visualization */}
        <div className="mb-4 p-3 rounded" style={{ background: '#1a0f0f' }}>
          <div className="flex justify-between text-xs mb-2" style={{ color: '#b8a894' }}>
            <span>Context Budget</span>
            <span>{Math.round(projectedPercentage * 100)}% after equip</span>
          </div>
          <div
            className="h-4 rounded-full overflow-hidden relative"
            style={{ background: '#2a1a1a', border: '1px solid #3d2828' }}
          >
            {/* Current usage */}
            <div
              className="absolute h-full transition-all"
              style={{
                width: `${(currentUsage / CONTEXT_BUDGET) * 100}%`,
                background: 'linear-gradient(90deg, #22c55e 0%, #eab308 100%)',
              }}
            />
            {/* Projected usage */}
            <div
              className="absolute h-full animate-pulse"
              style={{
                left: `${(currentUsage / CONTEXT_BUDGET) * 100}%`,
                width: `${(item.tokenWeight / CONTEXT_BUDGET) * 100}%`,
                background: 'repeating-linear-gradient(90deg, #ef4444 0%, #991b1b 50%, #ef4444 100%)',
              }}
            />
            {/* 50% threshold line */}
            <div
              className="absolute h-full w-0.5"
              style={{ left: '50%', background: '#fff', opacity: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-[10px] mt-1" style={{ color: '#7a6f62' }}>
            <span>0%</span>
            <span style={{ color: '#ef4444' }}>50% (Dumbzone)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Item info */}
        <div
          className="p-3 rounded mb-4 flex items-center gap-3"
          style={{ background: '#1a0f0f', border: '1px solid #3d2828' }}
        >
          <div
            className="w-10 h-10 rounded flex items-center justify-center text-lg"
            style={{ background: '#2a1a1a', border: '1px solid #3d2828' }}
          >
            {typeInfo.shortLabel}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm" style={{ color: '#f5e6d3' }}>
              {item.name}
            </div>
            <div className="text-xs" style={{ color: '#7a6f62' }}>
              +{item.tokenWeight.toLocaleString()} tokens
            </div>
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
          <div className="p-2 rounded" style={{ background: '#1a0f0f' }}>
            <div style={{ color: '#7a6f62' }}>Current Usage</div>
            <div className="font-bold" style={{ color: '#eab308' }}>
              {(currentUsage / 1000).toFixed(1)}K tokens
            </div>
          </div>
          <div className="p-2 rounded" style={{ background: '#1a0f0f' }}>
            <div style={{ color: '#7a6f62' }}>After Equip</div>
            <div className="font-bold" style={{ color: '#ef4444' }}>
              {(projectedUsage / 1000).toFixed(1)}K tokens
            </div>
          </div>
        </div>

        {/* Warning message */}
        <p className="text-xs mb-6 leading-relaxed" style={{ color: '#b8a894' }}>
          At over 50% context usage, Claude&apos;s responses become less accurate and more prone to
          errors. The model struggles to maintain focus on your task. Consider unequipping other
          items first.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={cancelEquip}
            className="flex-1 py-2.5 px-4 rounded font-medium transition-all"
            style={{
              background: 'linear-gradient(180deg, #3d3328 0%, #2d261e 100%)',
              color: '#b8a894',
              border: '1px solid #4a4038',
            }}
          >
            Cancel
          </button>
          <button
            onClick={forceEquip}
            className="flex-1 py-2.5 px-4 rounded font-medium transition-all"
            style={{
              background: 'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)',
              color: '#fef2f2',
              border: '1px solid #b91c1c',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
            }}
          >
            Equip Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
