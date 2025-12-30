import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useItemStatusStore, useAllItemStatuses } from '../../hooks/useItemStatus';
import { ItemActivityCard } from './ItemActivityCard';
import { ContextImpactChart } from './ContextImpactChart';
import type { InventoryItem } from '../../types';

type FilterTab = 'all' | 'active' | 'mcps' | 'agents' | 'errors';

interface ItemActivityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ItemActivityDashboard({ isOpen, onClose }: ItemActivityDashboardProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const rawEquipment = useAppStore((state) => state.equipment);
  const stats = useAppStore((state) => state.stats);
  const pollMCPStatus = useItemStatusStore((state) => state.pollMCPStatus);
  const statuses = useAllItemStatuses();

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

  // Get all equipped items as a flat array
  const equippedItems = useMemo(() => {
    const items: InventoryItem[] = [];
    if (equipment.helm) items.push(equipment.helm);
    if (equipment.mainhand) items.push(equipment.mainhand);
    if (equipment.offhand) items.push(equipment.offhand);
    items.push(...equipment.hooks);
    items.push(...equipment.rings);
    items.push(...equipment.spellbook);
    items.push(...equipment.companions);
    items.push(...equipment.trinkets);
    return items;
  }, [equipment]);

  // Poll MCP status on mount
  useEffect(() => {
    if (isOpen) {
      const mcpIds = equipment.trinkets.map((t) => t.id);
      if (mcpIds.length > 0) {
        pollMCPStatus(mcpIds);
      }
    }
  }, [isOpen, equipment.trinkets, pollMCPStatus]);

  // Filter items based on active tab
  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return equippedItems.filter((item) => statuses[item.id]?.isActive || statuses[item.id]?.runCount);
      case 'mcps':
        return equippedItems.filter((item) => item.itemType === 'trinket');
      case 'agents':
        return equippedItems.filter((item) => item.itemType === 'companion');
      case 'errors':
        return equippedItems.filter(
          (item) => statuses[item.id]?.connectionStatus === 'error' || statuses[item.id]?.connectionStatus === 'disconnected'
        );
      default:
        return equippedItems;
    }
  }, [equippedItems, statuses, activeTab]);

  // Count items with errors
  const errorCount = useMemo(() => {
    return equippedItems.filter(
      (item) => statuses[item.id]?.connectionStatus === 'error' || statuses[item.id]?.connectionStatus === 'disconnected'
    ).length;
  }, [equippedItems, statuses]);

  // Count active items
  const activeCount = useMemo(() => {
    return equippedItems.filter((item) => statuses[item.id]?.isActive || statuses[item.id]?.runCount).length;
  }, [equippedItems, statuses]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleRefresh = () => {
    const mcpIds = equipment.trinkets.map((t) => t.id);
    if (mcpIds.length > 0) {
      pollMCPStatus(mcpIds);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: FilterTab; label: string; count?: number; color?: string }[] = [
    { id: 'all', label: 'All', count: equippedItems.length },
    { id: 'active', label: 'Active', count: activeCount, color: 'var(--accent)' },
    { id: 'mcps', label: 'MCPs', count: equipment.trinkets.length },
    { id: 'agents', label: 'Agents', count: equipment.companions.length },
    { id: 'errors', label: 'Errors', count: errorCount, color: errorCount > 0 ? '#ef4444' : undefined },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '3px solid var(--accent)',
          boxShadow: '0 0 24px rgba(201, 162, 39, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(180deg, rgba(201, 162, 39, 0.15) 0%, transparent 100%)',
            borderBottom: '2px solid rgba(201, 162, 39, 0.4)',
          }}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{
                color: 'var(--accent)',
                fontFamily: "'Cinzel', serif",
              }}
            >
              Activity Dashboard
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Real-time item status and context impact
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
              title="Refresh status"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          className="px-4 pt-3 flex gap-2 flex-wrap"
          style={{ borderBottom: '1px solid var(--bg-tertiary)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-2 rounded-t text-xs font-medium transition-all flex items-center gap-1.5"
              style={{
                background: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab.id ? (tab.color || 'var(--accent)') : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? `2px solid ${tab.color || 'var(--accent)'}` : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    color: tab.color || 'inherit',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Context Impact Chart */}
            <div className="md:col-span-2">
              <ContextImpactChart
                items={equippedItems}
                totalBudget={stats.totalBudget}
                currentUsage={stats.equipped}
              />
            </div>

            {/* Item cards */}
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <ItemActivityCard
                  key={item.id}
                  item={item}
                  status={statuses[item.id]}
                />
              ))
            ) : (
              <div
                className="md:col-span-2 text-center py-8"
                style={{ color: 'var(--text-secondary)' }}
              >
                <p className="text-sm">
                  {activeTab === 'all'
                    ? 'No items equipped yet.'
                    : activeTab === 'active'
                    ? 'No items have been used this session.'
                    : activeTab === 'errors'
                    ? 'No connection errors.'
                    : `No ${activeTab} equipped.`}
                </p>
                <p className="text-xs mt-1">
                  Equip items from your inventory to see them here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--bg-tertiary)' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Status updates every 30 seconds for MCPs
          </span>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            <span>
              <span style={{ color: 'var(--accent)' }}>{equippedItems.length}</span> items equipped
            </span>
            <span>
              <span style={{ color: 'var(--accent)' }}>{stats.equipped.toLocaleString()}</span> tokens used
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ItemActivityCard } from './ItemActivityCard';
export { ContextImpactChart } from './ContextImpactChart';
