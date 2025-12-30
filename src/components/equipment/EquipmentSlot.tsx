import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { InventoryItem, EquipmentSlot as SlotType, ItemType, EquipmentSlotType, ItemConnectionStatus } from '../../types';
import { RARITY_COLORS } from '../../types';
import { ItemIcon } from '../icons/ItemIcons';
import { SlotSelectionModal } from './SlotSelectionModal';

// Status colors for connection indicators
const STATUS_INDICATOR_COLORS: Record<ItemConnectionStatus, string> = {
  connected: '#4ade80',
  disconnected: '#f87171',
  unknown: '#71717a',
  connecting: '#fbbf24',
  error: '#ef4444',
};

// Format relative time (e.g., "2m ago", "1h ago")
function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Check if item type is a hook type
const isHookType = (itemType: ItemType): boolean => itemType === 'hooks';

// Status indicator component for items
function StatusIndicator({ item }: { item: InventoryItem }) {
  const status = item.status;

  // MCP servers (trinkets) show connection status
  if (item.itemType === 'trinket' && status?.connectionStatus) {
    const color = STATUS_INDICATOR_COLORS[status.connectionStatus];
    return (
      <div
        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
        style={{
          background: color,
          borderColor: 'var(--bg-primary, #1c1712)',
          boxShadow: `0 0 4px ${color}80`,
        }}
        title={status.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
      />
    );
  }

  // Companions (subagents) show isolated context usage or last used
  if (item.itemType === 'companion' && status) {
    const isActive = status.isActive;
    // Show isolated context usage if available
    if (status.isolatedContextUsage !== undefined && status.isolatedContextBudget) {
      const pct = Math.round((status.isolatedContextUsage / status.isolatedContextBudget) * 100);
      return (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] px-1 rounded whitespace-nowrap"
          style={{
            background: isActive ? '#4ade8040' : '#71717a40',
            color: isActive ? '#4ade80' : '#71717a',
            border: `1px solid ${isActive ? '#4ade8060' : '#71717a40'}`,
          }}
        >
          {pct}% ctx
        </div>
      );
    }
    // Fallback to last used
    const lastUsed = formatRelativeTime(status.lastUsed);
    return (
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1 rounded whitespace-nowrap"
        style={{
          background: isActive ? '#4ade8040' : '#71717a40',
          color: isActive ? '#4ade80' : '#71717a',
          border: `1px solid ${isActive ? '#4ade8060' : '#71717a40'}`,
        }}
      >
        {isActive ? 'Active' : lastUsed}
      </div>
    );
  }

  // Hooks (shoulders, chest, gloves, belt) show run count
  if (isHookType(item.itemType) && status?.runCount !== undefined) {
    return (
      <div
        className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{
          background: status.runCount > 0 ? '#4ade80' : '#71717a',
          color: '#1c1712',
          boxShadow: `0 0 4px ${status.runCount > 0 ? '#4ade8080' : '#71717a40'}`,
        }}
        title={`Ran ${status.runCount}x this session`}
      >
        {status.runCount > 99 ? '99+' : status.runCount}
      </div>
    );
  }

  // Skills (spells) show progressive disclosure indicator
  if (item.itemType === 'spell') {
    const isInvoked = status?.currentTokens !== undefined && status.currentTokens > (status.baseTokens || 0);
    return (
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] px-1 rounded whitespace-nowrap"
        style={{
          background: isInvoked ? '#4ade8040' : '#c9a22740',
          color: isInvoked ? '#4ade80' : '#c9a227',
          border: `1px solid ${isInvoked ? '#4ade8060' : '#c9a22760'}`,
        }}
      >
        {isInvoked ? 'Loaded' : '~1K'}
      </div>
    );
  }

  // Rings (slash commands) show command hint
  if (item.itemType === 'ring') {
    return (
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] px-1 rounded whitespace-nowrap"
        style={{
          background: '#c9a22740',
          color: '#c9a227',
          border: '1px solid #c9a22760',
        }}
      >
        /{item.name.toLowerCase().replace(/\s+/g, '-')}
      </div>
    );
  }

  return null;
}

interface EquipmentSlotProps {
  slot: SlotType;
  item: InventoryItem | null;
  label?: string;
  compact?: boolean;
  size?: 'small' | 'medium' | 'large'; // small = compact (36px), medium = icon-only larger (48px), large = with text
}

// Map slot types to the item types they accept
const SLOT_TO_ITEM_TYPE: Record<EquipmentSlotType, ItemType> = {
  helm: 'helm',
  hooks: 'hooks',
  mainhand: 'mainhand',
  offhand: 'offhand',
  rings: 'ring',
  spellbook: 'spell',
  companions: 'companion',
  trinkets: 'trinket',
};

// Map item types to compatible slot types
const ITEM_TO_SLOT_MAP: Record<ItemType, EquipmentSlotType[]> = {
  helm: ['helm'],
  hooks: ['hooks'],
  mainhand: ['mainhand'],
  offhand: ['offhand'],
  ring: ['rings'],
  spell: ['spellbook'],
  companion: ['companions'],
  trinket: ['trinkets'],
};

export function EquipmentSlot({ slot, item, label, compact, size }: EquipmentSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidDrop, setIsValidDrop] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [justEquipped, setJustEquipped] = useState(false);
  const [justUnequipped, setJustUnequipped] = useState(false);
  const [invalidDrop, setInvalidDrop] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const unequipItem = useAppStore((state) => state.unequipItem);
  const equipItem = useAppStore((state) => state.equipItem);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);

  // Determine effective size - compact prop is legacy, use size prop when available
  const effectiveSize = size || (compact ? 'small' : 'large');

  const handleUnequip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item) {
      // Trigger unequip animation
      setJustUnequipped(true);
      setTimeout(() => {
        unequipItem(slot);
        setJustUnequipped(false);
      }, 250);
    }
  };

  const handleClick = () => {
    if (item) {
      setSelectedItem(item);
    } else {
      // Open modal to select item for empty slot
      setIsModalOpen(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);

    // Check if the dragged item is compatible with this slot
    // We can't read the data during dragover, so we assume valid for pulse animation
    setIsValidDrop(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setIsValidDrop(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsValidDrop(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { itemId, itemType } = data as { itemId: string; itemType: ItemType };

      // Check if item type is compatible with this slot
      const compatibleSlots = ITEM_TO_SLOT_MAP[itemType] || [];
      if (compatibleSlots.includes(slot.type)) {
        equipItem(itemId, slot);
        // Trigger equip animation
        setJustEquipped(true);
        setTimeout(() => setJustEquipped(false), 500);
      } else {
        // Trigger invalid drop animation
        setInvalidDrop(true);
        setTimeout(() => setInvalidDrop(false), 400);
      }
    } catch {
      // Ignore parsing errors
    }
  };

  // Icon-only sizes (small and medium)
  if (effectiveSize === 'small' || effectiveSize === 'medium') {
    const slotSize = effectiveSize === 'small' ? 'w-9 h-9' : 'w-12 h-12';
    const iconSize = effectiveSize === 'small' ? 22 : 28;
    const emptyIconSize = effectiveSize === 'small' ? 18 : 24;

    return (
      <div
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`${slotSize} rounded-lg flex items-center justify-center cursor-pointer ${justEquipped ? 'animate-equip' : ''} ${justUnequipped ? 'animate-unequip' : ''} ${isValidDrop && isDragOver ? 'animate-drag-pulse' : ''} ${invalidDrop ? 'animate-invalid-drop' : ''}`}
          style={{
            background: isDragOver
              ? 'rgba(30, 255, 0, 0.15)'
              : item
                ? `
                  radial-gradient(circle at 30% 30%, ${RARITY_COLORS[item.rarity]}25 0%, transparent 50%),
                  linear-gradient(135deg, #3f362c 0%, #2d261e 100%)
                `
                : 'linear-gradient(135deg, #2d261e 0%, #1c1712 100%)',
            border: isDragOver
              ? '2px solid #1eff00'
              : item
                ? `2px solid ${RARITY_COLORS[item.rarity]}60`
                : isHovered
                  ? '2px dashed #7a6f62'
                  : '2px dashed #524738',
            transform: isDragOver ? 'scale(1.15)' : isHovered && item ? 'scale(1.05)' : 'scale(1)',
            boxShadow: isDragOver
              ? '0 0 12px rgba(30, 255, 0, 0.4), inset 0 0 8px rgba(30, 255, 0, 0.1)'
              : item
                ? isHovered
                  ? `0 0 12px ${RARITY_COLORS[item.rarity]}40, inset 0 1px 0 rgba(255,255,255,0.1)`
                  : `inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)`
                : 'inset 0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease-out',
          }}
          title={item ? `${item.name} (${(item.tokenWeight / 1000).toFixed(1)}K tokens)` : `Click to equip ${slot.type}`}
        >
          {item ? (
            <ItemIcon
              itemType={item.itemType as ItemType}
              size={iconSize}
              color={RARITY_COLORS[item.rarity]}
            />
          ) : (
            <ItemIcon
              itemType={SLOT_TO_ITEM_TYPE[slot.type]}
              size={emptyIconSize}
              color={isDragOver ? '#1eff00' : isHovered ? '#7a6f62' : '#524738'}
            />
          )}
          {/* Status indicator */}
          {item && <StatusIndicator item={item} />}
        </div>

        {/* Hover tooltip with details */}
        {item && isHovered && (
          <div
            className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none"
            style={{
              background: 'rgba(26, 20, 16, 0.95)',
              border: `1px solid ${RARITY_COLORS[item.rarity]}40`,
              color: RARITY_COLORS[item.rarity],
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            {item.name}
            <span className="ml-1" style={{ color: '#7a6f62' }}>
              {(item.tokenWeight / 1000).toFixed(1)}K
            </span>
          </div>
        )}

        {/* Unequip button - inside slot, top-right on hover */}
        {item && isHovered && (
          <button
            onClick={handleUnequip}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 z-10"
            style={{
              background: '#ef4444',
              color: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
            title="Unequip"
          >
            ×
          </button>
        )}

        {/* Slot selection modal */}
        <SlotSelectionModal
          slot={slot}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer group relative ${justEquipped ? 'animate-equip' : ''} ${justUnequipped ? 'animate-unequip' : ''} ${isValidDrop && isDragOver ? 'animate-drag-pulse' : ''} ${invalidDrop ? 'animate-invalid-drop' : ''}`}
      style={{
        background: isDragOver
          ? 'rgba(30, 255, 0, 0.1)'
          : item
            ? `linear-gradient(180deg, #2a231c 0%, #1a1410 100%)`
            : 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
        border: isDragOver
          ? '2px solid #1eff00'
          : item
            ? `2px solid ${RARITY_COLORS[item.rarity]}${isHovered ? '80' : '40'}`
            : isHovered
              ? '2px dashed #7a6f62'
              : '2px dashed #4a3f32',
        transform: isDragOver ? 'scale(1.02)' : isHovered ? 'scale(1.01)' : 'scale(1)',
        boxShadow: isDragOver
          ? '0 0 12px rgba(30, 255, 0, 0.3)'
          : item
            ? isHovered
              ? `0 0 16px ${RARITY_COLORS[item.rarity]}30`
              : `0 0 8px ${RARITY_COLORS[item.rarity]}20`
            : 'none',
        transition: 'all 0.2s ease-out',
      }}
    >
      {/* Slot Icon */}
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center"
        style={{
          background: isDragOver
            ? 'rgba(30, 255, 0, 0.15)'
            : item
              ? `
                radial-gradient(circle at 30% 30%, ${RARITY_COLORS[item.rarity]}20 0%, transparent 50%),
                linear-gradient(135deg, #3f362c 0%, #2d261e 100%)
              `
              : 'linear-gradient(135deg, #3f362c 0%, #2d261e 100%)',
          border: isDragOver
            ? '2px solid #1eff00'
            : item
              ? `2px solid ${RARITY_COLORS[item.rarity]}40`
              : '2px solid #524738',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {item ? (
          <ItemIcon
            itemType={item.itemType as ItemType}
            size={32}
            color={isDragOver ? '#1eff00' : RARITY_COLORS[item.rarity]}
          />
        ) : (
          <ItemIcon
            itemType={SLOT_TO_ITEM_TYPE[slot.type]}
            size={28}
            color={isDragOver ? '#1eff00' : '#6b5d4d'}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {item ? (
          <>
            <div
              className="text-sm font-medium truncate"
              style={{ color: RARITY_COLORS[item.rarity] }}
            >
              {item.name}
            </div>
            <div className="text-xs flex items-center gap-2" style={{ color: '#7a6f62' }}>
              <span>{(item.tokenWeight / 1000).toFixed(1)}K tokens</span>
              {/* Inline status for full-size slots */}
              {item.status?.connectionStatus && (
                <span
                  className="flex items-center gap-1"
                  style={{ color: STATUS_INDICATOR_COLORS[item.status.connectionStatus] }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: STATUS_INDICATOR_COLORS[item.status.connectionStatus] }}
                  />
                  {item.status.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              )}
              {item.status?.runCount !== undefined && (
                <span style={{ color: item.status.runCount > 0 ? '#4ade80' : '#71717a' }}>
                  Ran {item.status.runCount}x
                </span>
              )}
              {item.itemType === 'companion' && item.status?.lastUsed && (
                <span style={{ color: '#71717a' }}>
                  Used {formatRelativeTime(item.status.lastUsed)}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div
              className="text-sm font-medium"
              style={{ color: isDragOver ? '#1eff00' : '#b8a894' }}
            >
              {isDragOver ? 'Drop to equip' : label}
            </div>
            <div className="text-xs" style={{ color: '#7a6f62' }}>
              {isDragOver ? '' : 'Empty'}
            </div>
          </>
        )}
      </div>

      {/* Unequip button - top-right on hover */}
      {item && isHovered && (
        <button
          onClick={handleUnequip}
          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-110 z-10"
          style={{
            background: '#ef4444',
            color: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
          title="Unequip"
        >
          ×
        </button>
      )}

      {/* Slot selection modal */}
      <SlotSelectionModal
        slot={slot}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
