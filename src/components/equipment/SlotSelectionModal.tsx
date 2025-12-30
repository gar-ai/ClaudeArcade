import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useAllItemStatuses } from '../../hooks/useItemStatus';
import type { InventoryItem, EquipmentSlot, ItemType, EquipmentSlotType } from '../../types';
import { RARITY_COLORS, ITEM_TYPE_INFO } from '../../types';
import { ItemIcon } from '../icons/ItemIcons';

// Map slot types to the item types they accept
// Tool slots (mainhand/offhand) accept both mainhand and offhand item types
const SLOT_TO_ITEM_TYPES: Record<EquipmentSlotType, ItemType[]> = {
  helm: ['helm'],
  hooks: ['hooks'],
  mainhand: ['mainhand', 'offhand'], // Tools can go in either slot
  offhand: ['mainhand', 'offhand'],  // Tools can go in either slot
  rings: ['ring'],
  spellbook: ['spell'],
  companions: ['companion'],
  trinkets: ['trinket'],
};

// Friendly slot names
const SLOT_NAMES: Record<EquipmentSlotType, string> = {
  helm: 'Mind',
  hooks: 'Hooks',
  mainhand: 'Primary Tool',
  offhand: 'Secondary Tool',
  rings: 'Commands',
  spellbook: 'Skills',
  companions: 'Agents',
  trinkets: 'MCP Servers',
};

interface SlotSelectionModalProps {
  slot: EquipmentSlot;
  isOpen: boolean;
  onClose: () => void;
}

export function SlotSelectionModal({ slot, isOpen, onClose }: SlotSelectionModalProps) {
  const inventory = useAppStore((state) => state.inventory);
  const rawEquipment = useAppStore((state) => state.equipment);
  const statuses = useAllItemStatuses();
  const equipItem = useAppStore((state) => state.equipItem);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoize the merged equipment to avoid infinite re-renders
  const equipment = useMemo(() => {
    const mergeStatus = (item: InventoryItem | null): InventoryItem | null => {
      if (!item) return null;
      return { ...item, status: statuses[item.id] || item.status };
    };
    const mergeArray = (items: InventoryItem[]) =>
      items.map((item) => ({ ...item, status: statuses[item.id] || item.status }));

    return {
      helm: mergeStatus(rawEquipment.helm),
      mainhand: mergeStatus(rawEquipment.mainhand),
      offhand: mergeStatus(rawEquipment.offhand),
      hooks: mergeArray(rawEquipment.hooks),
      rings: mergeArray(rawEquipment.rings),
      spellbook: mergeArray(rawEquipment.spellbook),
      companions: mergeArray(rawEquipment.companions),
      trinkets: mergeArray(rawEquipment.trinkets),
    };
  }, [rawEquipment, statuses]);

  // Get the item types this slot accepts
  const acceptedItemTypes = SLOT_TO_ITEM_TYPES[slot.type];

  // Filter inventory to items that can be equipped in this slot and are not already equipped
  const availableItems = inventory.filter((item) => {
    // Must match one of the item types for this slot
    if (!acceptedItemTypes.includes(item.itemType as ItemType)) return false;
    // Must not be already equipped
    if (item.enabled) return false;
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Determine the actual slot to equip to (auto-fill logic for tools)
  const getEquipSlot = (): EquipmentSlot => {
    // For tool slots, auto-fill the empty one
    if (slot.type === 'mainhand' || slot.type === 'offhand') {
      const mainhandFull = equipment.mainhand !== null;
      const offhandFull = equipment.offhand !== null;

      if (slot.type === 'mainhand' && mainhandFull && !offhandFull) {
        // User clicked mainhand but it's full, use offhand
        return { type: 'offhand' };
      }
      if (slot.type === 'offhand' && offhandFull && !mainhandFull) {
        // User clicked offhand but it's full, use mainhand
        return { type: 'mainhand' };
      }
    }
    return slot;
  };

  // Handle item selection
  const handleSelectItem = (item: InventoryItem) => {
    const targetSlot = getEquipSlot();
    equipItem(item.id, targetSlot);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use first accepted type for display (mainhand for tool slots)
  const primaryItemType = acceptedItemTypes[0];
  const slotInfo = ITEM_TYPE_INFO[primaryItemType];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '2px solid #4a3f32',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(201, 162, 39, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(180deg, rgba(201, 162, 39, 0.1) 0%, transparent 100%)',
            borderBottom: '1px solid #4a3f32',
          }}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: '#c9a227', fontFamily: "'Cinzel', serif" }}
            >
              Equip {SLOT_NAMES[slot.type]}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#7a6f62' }}>
              {slotInfo?.claudeConcept || `Select an item to equip`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-all hover:bg-[#3d3328]"
            style={{ color: '#7a6f62' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b" style={{ borderColor: '#3d3328' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full px-3 py-2 rounded text-sm outline-none"
            style={{
              background: '#1a1410',
              border: '1px solid #4a3f32',
              color: '#f5e6d3',
            }}
            autoFocus
          />
        </div>

        {/* Items list */}
        <div
          className="max-h-80 overflow-y-auto p-2"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#4a3f32 #1a1410',
          }}
        >
          {availableItems.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#7a6f62' }}>
              <ItemIcon
                itemType={primaryItemType}
                size={40}
                color="#4a3f32"
              />
              <p className="mt-3 text-sm">No items available</p>
              <p className="text-xs mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : `No ${SLOT_NAMES[slot.type].toLowerCase()} found in your inventory`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {availableItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="w-full p-3 rounded-lg flex items-center gap-3 text-left transition-all hover:scale-[1.01]"
                  style={{
                    background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
                    border: `1px solid ${RARITY_COLORS[item.rarity]}30`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${RARITY_COLORS[item.rarity]}60`;
                    e.currentTarget.style.boxShadow = `0 0 10px ${RARITY_COLORS[item.rarity]}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${RARITY_COLORS[item.rarity]}30`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `
                        radial-gradient(circle at 30% 30%, ${RARITY_COLORS[item.rarity]}20 0%, transparent 50%),
                        linear-gradient(135deg, #3f362c 0%, #2d261e 100%)
                      `,
                      border: `2px solid ${RARITY_COLORS[item.rarity]}40`,
                    }}
                  >
                    <ItemIcon
                      itemType={item.itemType as ItemType}
                      size={28}
                      color={RARITY_COLORS[item.rarity]}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: RARITY_COLORS[item.rarity] }}
                    >
                      {item.name}
                    </div>
                    <div
                      className="text-xs truncate"
                      style={{ color: '#7a6f62' }}
                    >
                      {item.description}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                        style={{
                          background: `${RARITY_COLORS[item.rarity]}20`,
                          color: RARITY_COLORS[item.rarity],
                        }}
                      >
                        {item.rarity}
                      </span>
                      <span className="text-[10px]" style={{ color: '#b8a894' }}>
                        {(item.tokenWeight / 1000).toFixed(1)}K tokens
                      </span>
                    </div>
                  </div>

                  {/* Equip indicator */}
                  <div
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
                      color: '#1a1410',
                    }}
                  >
                    Equip
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 text-center text-xs"
          style={{
            borderTop: '1px solid #3d3328',
            color: '#7a6f62',
          }}
        >
          {availableItems.length} item{availableItems.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
}
