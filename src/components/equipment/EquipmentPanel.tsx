import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useItemStatusStore, useAllItemStatuses } from '../../hooks/useItemStatus';
import { EquipmentSlot } from './EquipmentSlot';
import { SLOT_LIMITS, ITEM_TYPE_INFO, ItemType, InventoryItem } from '../../types';

// Tooltip component for slot descriptions
function SlotTooltip({ type }: { type: ItemType }) {
  const info = ITEM_TYPE_INFO[type];
  if (!info) return null;
  return (
    <div
      className="absolute left-full ml-2 z-50 w-56 p-2 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none"
      style={{
        background: 'linear-gradient(180deg, #2a231c 0%, #1c1712 100%)',
        border: '1px solid #3d3328',
      }}
    >
      <div className="text-xs font-bold mb-1" style={{ color: '#c9a227' }}>
        {info.label}
      </div>
      <div className="text-[10px] mb-1.5" style={{ color: '#b8a894' }}>
        {info.description}
      </div>
      <div
        className="text-[9px] pt-1.5 border-t"
        style={{ color: '#7a6f62', borderColor: '#3d3328' }}
      >
        {info.claudeConcept}
      </div>
    </div>
  );
}

// Section header with help tooltip
function SectionHeader({
  type,
  count,
  max,
}: {
  type: ItemType;
  count: number;
  max: number;
}) {
  const info = ITEM_TYPE_INFO[type];
  if (!info) return null;
  return (
    <h4 className="text-xs font-medium flex items-center gap-1.5 group relative" style={{ color: '#b8a894' }}>
      <span>{info.label}s</span>
      <span style={{ color: '#7a6f62' }}>
        ({count}/{max})
      </span>
      <span
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] cursor-help"
        style={{ background: '#3d3328', color: '#7a6f62' }}
        title={`${info.description}: ${info.claudeConcept}`}
      >
        ?
      </span>
    </h4>
  );
}

export function EquipmentPanel() {
  // Select stable references from stores
  const rawEquipment = useAppStore((state) => state.equipment);
  const statuses = useAllItemStatuses();
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

  // Poll MCP status on mount and periodically
  useEffect(() => {
    const mcpServerIds = equipment.trinkets.map((e) => e.id);
    if (mcpServerIds.length > 0) {
      // Initial poll
      pollMCPStatus(mcpServerIds);

      // Poll every 30 seconds
      const interval = setInterval(() => {
        pollMCPStatus(mcpServerIds);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [equipment.trinkets.length, pollMCPStatus]);

  return (
    <div className="space-y-4">
      <h3
        className="text-sm font-bold uppercase tracking-wider"
        style={{ color: '#c9a227', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
      >
        Equipped
      </h3>

      {/* Main slots with tooltips */}
      <div className="space-y-2">
        {/* Helm (CLAUDE.md) */}
        <div className="group relative">
          <EquipmentSlot
            slot={{ type: 'helm' }}
            item={equipment.helm}
            label={ITEM_TYPE_INFO.helm.label}
          />
          <SlotTooltip type="helm" />
        </div>

        {/* Mainhand (Primary Plugin) */}
        <div className="group relative">
          <EquipmentSlot
            slot={{ type: 'mainhand' }}
            item={equipment.mainhand}
            label={ITEM_TYPE_INFO.mainhand.label}
          />
          <SlotTooltip type="mainhand" />
        </div>

        {/* Offhand (Secondary Plugin) */}
        <div className="group relative">
          <EquipmentSlot
            slot={{ type: 'offhand' }}
            item={equipment.offhand}
            label={ITEM_TYPE_INFO.offhand.label}
          />
          <SlotTooltip type="offhand" />
        </div>
      </div>

      {/* Divider */}
      <div className="fantasy-divider" />

      {/* Hooks Section (Consolidated) */}
      <div className="space-y-2">
        <SectionHeader type="hooks" count={equipment.hooks.length} max={SLOT_LIMITS.hooks} />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: SLOT_LIMITS.hooks }).map((_, i) => (
            <EquipmentSlot
              key={`hook-${i}`}
              slot={{ type: 'hooks', index: i }}
              item={equipment.hooks[i] ?? null}
              compact
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="fantasy-divider" />

      {/* Rings (Slash Commands) */}
      <div className="space-y-2">
        <SectionHeader type="ring" count={equipment.rings.length} max={SLOT_LIMITS.rings} />
        <div className="grid grid-cols-2 gap-1.5">
          {Array.from({ length: SLOT_LIMITS.rings }).map((_, i) => (
            <EquipmentSlot
              key={`ring-${i}`}
              slot={{ type: 'rings', index: i }}
              item={equipment.rings[i] ?? null}
              compact
            />
          ))}
        </div>
      </div>

      {/* Spellbook (Skills) */}
      <div className="space-y-2">
        <SectionHeader type="spell" count={equipment.spellbook.length} max={SLOT_LIMITS.spellbook} />
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: SLOT_LIMITS.spellbook }).map((_, i) => (
            <EquipmentSlot
              key={`spell-${i}`}
              slot={{ type: 'spellbook', index: i }}
              item={equipment.spellbook[i] ?? null}
              compact
            />
          ))}
        </div>
      </div>

      {/* Companions (Subagents) */}
      <div className="space-y-2">
        <SectionHeader type="companion" count={equipment.companions.length} max={SLOT_LIMITS.companions} />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: SLOT_LIMITS.companions }).map((_, i) => (
            <EquipmentSlot
              key={`companion-${i}`}
              slot={{ type: 'companions', index: i }}
              item={equipment.companions[i] ?? null}
              compact
            />
          ))}
        </div>
      </div>

      {/* Trinkets (MCP Servers) */}
      <div className="space-y-2">
        <SectionHeader type="trinket" count={equipment.trinkets.length} max={SLOT_LIMITS.trinkets} />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: SLOT_LIMITS.trinkets }).map((_, i) => (
            <EquipmentSlot
              key={`trinket-${i}`}
              slot={{ type: 'trinkets', index: i }}
              item={equipment.trinkets[i] ?? null}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}
