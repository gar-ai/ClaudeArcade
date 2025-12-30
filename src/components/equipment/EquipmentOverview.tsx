import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useItemStatusStore, useAllItemStatuses } from '../../hooks/useItemStatus';
import type { InventoryItem, ItemType, ItemConnectionStatus } from '../../types';
import { RARITY_COLORS, ITEM_TYPE_INFO } from '../../types';
import { ItemIcon } from '../icons/ItemIcons';

// Status colors for connection indicators
const STATUS_COLORS: Record<ItemConnectionStatus, string> = {
  connected: '#4ade80',
  disconnected: '#f87171',
  unknown: '#71717a',
  connecting: '#fbbf24',
  error: '#ef4444',
};

// Check if item type is a hook type (armor slots)
const isHookType = (itemType: ItemType): boolean =>
  ['shoulders', 'chest', 'gloves', 'belt'].includes(itemType);

interface ItemRowProps {
  item: InventoryItem;
  onSelect: () => void;
}

function ItemRow({ item, onSelect }: ItemRowProps) {
  const status = item.status;

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
        border: `1px solid ${RARITY_COLORS[item.rarity]}30`,
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center shrink-0"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${RARITY_COLORS[item.rarity]}20 0%, transparent 50%), linear-gradient(135deg, #3f362c 0%, #2d261e 100%)`,
          border: `1px solid ${RARITY_COLORS[item.rarity]}40`,
        }}
      >
        <ItemIcon
          itemType={item.itemType as ItemType}
          size={16}
          color={RARITY_COLORS[item.rarity]}
        />
      </div>

      {/* Name and Type */}
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-medium truncate"
          style={{ color: RARITY_COLORS[item.rarity] }}
        >
          {item.name}
        </div>
        <div className="text-xs" style={{ color: '#7a6f62' }}>
          {ITEM_TYPE_INFO[item.itemType]?.claudeConcept || item.itemType}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connection status for MCP servers (trinkets) */}
        {item.itemType === 'trinket' && (
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: STATUS_COLORS[status?.connectionStatus || 'unknown'],
                boxShadow: `0 0 4px ${STATUS_COLORS[status?.connectionStatus || 'unknown']}80`,
              }}
            />
            <span
              className="text-xs"
              style={{ color: STATUS_COLORS[status?.connectionStatus || 'unknown'] }}
            >
              {status?.connectionStatus === 'connected'
                ? 'Connected'
                : status?.connectionStatus === 'disconnected'
                ? 'Offline'
                : status?.connectionStatus === 'connecting'
                ? 'Connecting'
                : status?.connectionStatus === 'error'
                ? 'Error'
                : 'Unknown'}
            </span>
          </div>
        )}

        {/* Isolated context for subagents (companions) */}
        {item.itemType === 'companion' && (
          <span className="text-xs" style={{ color: status?.isActive ? '#4ade80' : '#60a5fa' }}>
            {status?.isActive ? 'Active' : status?.isolatedContextUsage ? `${Math.round((status.isolatedContextUsage / 200000) * 100)}% ctx` : 'Idle'}
          </span>
        )}

        {/* Run count for hooks (armor slots) */}
        {isHookType(item.itemType) && status?.runCount !== undefined && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              background: status.runCount > 0 ? '#4ade8020' : '#71717a20',
              color: status.runCount > 0 ? '#4ade80' : '#71717a',
            }}
          >
            {status.runCount}x
          </span>
        )}

        {/* Command hint for rings (slash commands) */}
        {item.itemType === 'ring' && (
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              background: '#c9a22720',
              color: '#c9a227',
            }}
          >
            /{item.name.toLowerCase().replace(/\s+/g, '-')}
          </span>
        )}

        {/* Progressive disclosure indicator for skills (spells) */}
        {item.itemType === 'spell' && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: status?.currentTokens ? '#4ade8020' : '#c9a22720',
              color: status?.currentTokens ? '#4ade80' : '#c9a227',
            }}
          >
            {status?.currentTokens ? 'Loaded' : '~1K'}
          </span>
        )}

        {/* Token weight */}
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: '#3d3328', color: '#7a6f62' }}
        >
          {(item.tokenWeight / 1000).toFixed(1)}K
        </span>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  items: InventoryItem[];
  itemType: ItemType;
  onSelectItem: (item: InventoryItem) => void;
  subtitle?: string;
}

function CategorySection({ title, items, itemType, onSelectItem, subtitle }: CategorySectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ItemIcon itemType={itemType} size={14} color="#c9a227" />
        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#c9a227' }}>
          {title}
        </h4>
        <span className="text-xs" style={{ color: '#7a6f62' }}>
          ({items.length})
        </span>
        {subtitle && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded ml-auto"
            style={{ background: '#3d3328', color: subtitle.includes('hog') ? '#ef4444' : '#7a6f62' }}
          >
            {subtitle}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} onSelect={() => onSelectItem(item)} />
        ))}
      </div>
    </div>
  );
}

export function EquipmentOverview() {
  const rawEquipment = useAppStore((state) => state.equipment);
  const statuses = useAllItemStatuses();
  const setSelectedItem = useAppStore((state) => state.setSelectedItem);
  const pollMCPStatus = useItemStatusStore((state) => state.pollMCPStatus);

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

  // Poll MCP status for trinkets
  useEffect(() => {
    const mcpServerIds = equipment.trinkets.map((e) => e.id);
    if (mcpServerIds.length > 0) {
      pollMCPStatus(mcpServerIds);
      const interval = setInterval(() => pollMCPStatus(mcpServerIds), 30000);
      return () => clearInterval(interval);
    }
  }, [equipment.trinkets.length, pollMCPStatus]);

  // Collect all equipped items
  const singleSlotItems = [
    equipment.helm,
    equipment.mainhand,
    equipment.offhand,
  ].filter((item): item is InventoryItem => item !== null);

  const allHooks = equipment.hooks;

  const totalItems =
    singleSlotItems.length +
    allHooks.length +
    equipment.rings.length +
    equipment.spellbook.length +
    equipment.companions.length +
    equipment.trinkets.length;

  const totalTokens =
    singleSlotItems.reduce((sum, item) => sum + item.tokenWeight, 0) +
    allHooks.reduce((sum, item) => sum + item.tokenWeight, 0) +
    equipment.rings.reduce((sum, item) => sum + item.tokenWeight, 0) +
    equipment.spellbook.reduce((sum, item) => sum + item.tokenWeight, 0) +
    equipment.companions.reduce((sum, item) => sum + item.tokenWeight, 0) +
    equipment.trinkets.reduce((sum, item) => sum + item.tokenWeight, 0);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
          borderBottom: '2px solid var(--bg-tertiary)',
        }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: '#c9a227', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
        >
          Equipment Overview
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs" style={{ color: '#7a6f62' }}>
            {totalItems} items equipped
          </span>
          <span className="text-xs" style={{ color: '#b8a894' }}>
            {(totalTokens / 1000).toFixed(1)}K tokens
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'var(--bg-secondary)',
                border: '2px solid var(--bg-tertiary)',
              }}
            >
              <ItemIcon itemType="mainhand" size={24} color="#7a6f62" />
            </div>
            <h4 className="text-sm font-medium mb-1" style={{ color: '#b8a894' }}>
              No Equipment
            </h4>
            <p className="text-xs" style={{ color: '#7a6f62' }}>
              Equip items from your backpack to see them here
            </p>
          </div>
        ) : (
          <>
            {/* CLAUDE.md / Helm */}
            {equipment.helm && (
              <CategorySection
                title="Memory"
                items={[equipment.helm]}
                itemType="helm"
                onSelectItem={setSelectedItem}
                subtitle="CLAUDE.md"
              />
            )}

            {/* Primary Plugin / Mainhand */}
            {equipment.mainhand && (
              <CategorySection
                title="Primary Plugin"
                items={[equipment.mainhand]}
                itemType="mainhand"
                onSelectItem={setSelectedItem}
              />
            )}

            {/* Secondary Plugin / Offhand */}
            {equipment.offhand && (
              <CategorySection
                title="Secondary Plugin"
                items={[equipment.offhand]}
                itemType="offhand"
                onSelectItem={setSelectedItem}
              />
            )}

            {/* Hooks (consolidated) */}
            {equipment.hooks.length > 0 && (
              <CategorySection
                title="Hooks"
                items={equipment.hooks}
                itemType="hooks"
                onSelectItem={setSelectedItem}
                subtitle="Pre/Post ToolUse, Session lifecycle"
              />
            )}

            {/* Slash Commands / Rings */}
            {equipment.rings.length > 0 && (
              <CategorySection
                title="Slash Commands"
                items={equipment.rings}
                itemType="ring"
                onSelectItem={setSelectedItem}
                subtitle="Quick cast"
              />
            )}

            {/* Skills / Spells */}
            {equipment.spellbook.length > 0 && (
              <CategorySection
                title="Skills"
                items={equipment.spellbook}
                itemType="spell"
                onSelectItem={setSelectedItem}
                subtitle="~1K base, +5-15K invoked"
              />
            )}

            {/* Subagents / Companions */}
            {equipment.companions.length > 0 && (
              <CategorySection
                title="Agents"
                items={equipment.companions}
                itemType="companion"
                onSelectItem={setSelectedItem}
                subtitle="Own 200K context!"
              />
            )}

            {/* MCP Servers / Trinkets */}
            {equipment.trinkets.length > 0 && (
              <CategorySection
                title="MCP Servers"
                items={equipment.trinkets}
                itemType="trinket"
                onSelectItem={setSelectedItem}
                subtitle="Context hogs!"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
