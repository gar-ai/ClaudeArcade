import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { InventoryItem, ItemType } from '../../types';
import { RARITY_COLORS, RARITY_GLOW, ITEM_TYPE_SOURCE_LABELS } from '../../types';
import { ItemIcon } from '../icons/ItemIcons';
import type { Recommendation } from '../../utils/recommendations';

interface InventoryCardProps {
  item: InventoryItem;
  recommendation?: Recommendation;
}

export function InventoryCard({ item, recommendation }: InventoryCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  const equipItem = useAppStore((state) => state.equipItem);

  const handleDoubleClick = () => {
    const slotType = getSlotType(item.itemType);
    equipItem(item.id, { type: slotType });
  };

  const handleClick = () => {
    setSelectedItem(item);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      itemId: item.id,
      itemType: item.itemType,
    }));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.6';
    target.style.transform = 'scale(1.05)';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
  };

  const rarityColor = RARITY_COLORS[item.rarity];

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`item-card p-3 cursor-grab active:cursor-grabbing corner-ornament ${RARITY_GLOW[item.rarity]}`}
      style={{
        background: `
          linear-gradient(180deg, rgba(212, 188, 142, 0.06) 0%, rgba(196, 165, 116, 0.02) 100%),
          linear-gradient(180deg, #2d261e 0%, #1c1712 100%)
        `,
        border: `2px solid ${rarityColor}50`,
        borderRadius: '4px',
        boxShadow: isDragging ? `0 0 20px ${rarityColor}60` : undefined,
        transition: 'box-shadow 0.2s ease-out, transform 0.2s ease-out, opacity 0.2s ease-out',
      }}
    >
      {/* Icon & Active Badge */}
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-12 h-12 rounded flex items-center justify-center"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, ${rarityColor}25 0%, transparent 60%),
              linear-gradient(135deg, #3f362c 0%, #2d261e 100%)
            `,
            border: `2px solid ${rarityColor}40`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)`,
          }}
        >
          <ItemIcon
            itemType={item.itemType as ItemType}
            size={28}
            color={rarityColor}
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          {item.enabled && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
              style={{
                background: 'linear-gradient(180deg, rgba(30, 255, 0, 0.2) 0%, rgba(30, 255, 0, 0.1) 100%)',
                color: '#1eff00',
                border: '1px solid rgba(30, 255, 0, 0.4)',
                textShadow: '0 0 4px rgba(30, 255, 0, 0.5)',
              }}
            >
              Equipped
            </span>
          )}
          {recommendation && !item.enabled && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
              style={{
                background: recommendation.confidence === 'high'
                  ? 'linear-gradient(180deg, rgba(201, 162, 39, 0.3) 0%, rgba(201, 162, 39, 0.15) 100%)'
                  : 'linear-gradient(180deg, rgba(100, 116, 139, 0.3) 0%, rgba(100, 116, 139, 0.15) 100%)',
                color: recommendation.confidence === 'high' ? '#c9a227' : '#94a3b8',
                border: recommendation.confidence === 'high'
                  ? '1px solid rgba(201, 162, 39, 0.5)'
                  : '1px solid rgba(100, 116, 139, 0.4)',
                textShadow: recommendation.confidence === 'high'
                  ? '0 0 4px rgba(201, 162, 39, 0.5)'
                  : 'none',
              }}
              title={recommendation.reason}
            >
              Suggested
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <h4
        className="font-semibold text-sm truncate"
        style={{
          color: rarityColor,
          fontFamily: "'Cinzel', serif",
          textShadow: `0 1px 2px rgba(0,0,0,0.5)`,
        }}
      >
        {item.name}
      </h4>

      {/* Description */}
      <p
        className="text-xs mt-1 line-clamp-2 h-8 italic"
        style={{ color: '#a89a86' }}
      >
        {item.description || 'No description available...'}
      </p>

      {/* Footer with parchment divider */}
      <div
        className="flex items-center justify-between mt-2 pt-2"
        style={{
          borderTop: '1px solid',
          borderImage: 'linear-gradient(90deg, transparent 0%, #524738 50%, transparent 100%) 1',
        }}
      >
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: '#7a6f62' }}
        >
          {ITEM_TYPE_SOURCE_LABELS[item.itemType as ItemType]}
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: '#c9a227' }}
        >
          {(item.tokenWeight / 1000).toFixed(1)}K
        </span>
      </div>
    </div>
  );
}

// Map item types to equipment slot types (WoW-style)
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
