import { useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { RARITY_COLORS, ITEM_TYPE_LABELS, ITEM_TYPE_SOURCE_LABELS } from '../../types';
import type { ItemType } from '../../types';
import { ItemIcon } from '../icons/ItemIcons';
import { ContextForecast } from '../context/ContextForecast';
import { detectConflicts } from '../../utils/recommendations';

export function ItemDetailModal() {
  const selectedItem = useAppStore((state) => state.selectedItem);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  const equipItem = useAppStore((state) => state.equipItem);
  const equipment = useAppStore((state) => state.equipment);
  const inventory = useAppStore((state) => state.inventory);

  const conflicts = useMemo(() => {
    if (!selectedItem || selectedItem.enabled) return [];
    return detectConflicts(selectedItem, equipment, inventory);
  }, [selectedItem, equipment, inventory]);

  if (!selectedItem) return null;

  const handleClose = () => {
    setSelectedItem(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleEquip = () => {
    const slotType = getSlotType(selectedItem.itemType);
    equipItem(selectedItem.id, { type: slotType });
    handleClose();
  };

  const rarityColor = RARITY_COLORS[selectedItem.rarity];
  const rarityName = selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: `3px solid ${rarityColor}`,
          boxShadow: `0 0 24px ${rarityColor}40, 0 8px 32px rgba(0, 0, 0, 0.5)`,
        }}
      >
        {/* Header */}
        <div
          className="p-4"
          style={{
            background: `
              linear-gradient(180deg, ${rarityColor}15 0%, transparent 100%),
              linear-gradient(180deg, rgba(212, 188, 142, 0.05) 0%, transparent 100%)
            `,
            borderBottom: `2px solid ${rarityColor}40`,
          }}
        >
          <div className="flex items-start gap-4">
            {/* Large Icon */}
            <div
              className="w-16 h-16 rounded flex items-center justify-center shrink-0"
              style={{
                background: `
                  radial-gradient(circle at 30% 30%, ${rarityColor}25 0%, transparent 60%),
                  linear-gradient(135deg, #3f362c 0%, #2d261e 100%)
                `,
                border: `3px solid ${rarityColor}50`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 8px rgba(0,0,0,0.4), 0 0 16px ${rarityColor}30`,
              }}
            >
              <ItemIcon
                itemType={selectedItem.itemType as ItemType}
                size={36}
                color={rarityColor}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2
                className="text-lg font-bold truncate"
                style={{
                  color: rarityColor,
                  fontFamily: "'Cinzel', serif",
                  textShadow: `0 0 8px ${rarityColor}60, 0 2px 4px rgba(0,0,0,0.5)`,
                }}
              >
                {selectedItem.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    background: `linear-gradient(180deg, ${rarityColor}30 0%, ${rarityColor}10 100%)`,
                    color: rarityColor,
                    border: `1px solid ${rarityColor}40`,
                  }}
                >
                  {rarityName}
                </span>
                <span className="text-xs" style={{ color: '#b8a894' }}>
                  {ITEM_TYPE_LABELS[selectedItem.itemType as ItemType]}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded transition-all"
              style={{
                background: '#3d3328',
                color: '#b8a894',
                border: '1px solid #4a3f32',
              }}
            >
              <span className="text-sm font-bold">X</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Description */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: '#c9a227' }}
            >
              Description
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#f5e6d3' }}>
              {selectedItem.description || 'No description available.'}
            </p>
          </div>

          {/* Stats */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: '#c9a227' }}
            >
              Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="p-2 rounded"
                style={{
                  background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
                  border: '1px solid #4a3f32',
                }}
              >
                <div className="text-xs" style={{ color: '#7a6f62' }}>Token Weight</div>
                <div className="text-sm font-medium" style={{ color: '#f5e6d3' }}>
                  {(selectedItem.tokenWeight / 1000).toFixed(1)}K tokens
                </div>
              </div>
              <div
                className="p-2 rounded"
                style={{
                  background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
                  border: '1px solid #4a3f32',
                }}
              >
                <div className="text-xs" style={{ color: '#7a6f62' }}>Status</div>
                <div
                  className="text-sm font-medium"
                  style={{ color: selectedItem.enabled ? '#1eff00' : '#7a6f62' }}
                >
                  {selectedItem.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div
                className="p-2 rounded"
                style={{
                  background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
                  border: '1px solid #4a3f32',
                }}
              >
                <div className="text-xs" style={{ color: '#7a6f62' }}>Source</div>
                <div className="text-sm font-medium capitalize" style={{ color: '#f5e6d3' }}>
                  {ITEM_TYPE_SOURCE_LABELS[selectedItem.itemType as ItemType]}
                </div>
              </div>
              {selectedItem.version && (
                <div
                  className="p-2 rounded"
                  style={{
                    background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
                    border: '1px solid #4a3f32',
                  }}
                >
                  <div className="text-xs" style={{ color: '#7a6f62' }}>Version</div>
                  <div className="text-sm font-medium" style={{ color: '#f5e6d3' }}>
                    {selectedItem.version}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Context Forecast (only show if not equipped) */}
          {!selectedItem.enabled && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#c9a227' }}
              >
                Context Impact
              </h3>
              <ContextForecast item={selectedItem} />
            </div>
          )}

          {/* Conflict Warnings */}
          {conflicts.length > 0 && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#f59e0b' }}
              >
                Potential Conflicts
              </h3>
              <div className="space-y-1">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 rounded"
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#f59e0b',
                    }}
                  >
                    {conflict}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Author */}
          {selectedItem.author && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#c9a227' }}
              >
                Author
              </h3>
              <p className="text-sm" style={{ color: '#f5e6d3' }}>{selectedItem.author}</p>
            </div>
          )}

          {/* Source Path */}
          {selectedItem.sourcePath && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#c9a227' }}
              >
                Location
              </h3>
              <p className="text-xs font-mono break-all" style={{ color: '#7a6f62' }}>
                {selectedItem.sourcePath}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 flex gap-2"
          style={{ borderTop: '2px solid #4a3f32' }}
        >
          {!selectedItem.enabled ? (
            <button
              onClick={handleEquip}
              className="flex-1 py-2.5 px-4 rounded font-bold text-sm uppercase tracking-wide transition-all"
              style={{
                background: `linear-gradient(180deg, ${rarityColor} 0%, ${rarityColor}cc 100%)`,
                color: '#1a1410',
                border: `1px solid ${rarityColor}`,
                boxShadow: `0 0 12px ${rarityColor}40`,
              }}
            >
              Equip
            </button>
          ) : (
            <div
              className="flex-1 py-2.5 px-4 rounded font-bold text-sm text-center uppercase tracking-wide"
              style={{
                background: 'rgba(30, 255, 0, 0.1)',
                color: '#1eff00',
                border: '1px solid rgba(30, 255, 0, 0.3)',
              }}
            >
              Currently Equipped
            </div>
          )}
          <button
            onClick={handleClose}
            className="py-2.5 px-4 rounded font-medium text-sm transition-all"
            style={{
              background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
              color: '#b8a894',
              border: '1px solid #4a3f32',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Map item types to equipment slot types (simplified)
function getSlotType(itemType: string): 'helm' | 'hooks' | 'mainhand' | 'offhand' | 'rings' | 'spellbook' | 'companions' | 'trinkets' {
  switch (itemType) {
    case 'helm': return 'helm';
    case 'hooks': return 'hooks';
    case 'mainhand': return 'mainhand';
    case 'offhand': return 'offhand';
    case 'ring': return 'rings';
    case 'spell': return 'spellbook';
    case 'companion': return 'companions';
    case 'trinket': return 'trinkets';
    default: return 'mainhand';
  }
}
