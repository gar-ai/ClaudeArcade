import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { usePersonaStore } from '../../stores/personaStore';
import { useItemStatusStore, useAllItemStatuses } from '../../hooks/useItemStatus';
import { EquipmentSlot } from '../equipment/EquipmentSlot';
import { PixelSpriteAnimated } from './PixelSprite';
import { RARITY_COLORS, SLOT_LIMITS, ITEM_TYPE_INFO, ItemType, InventoryItem } from '../../types';

/**
 * Info tooltip component for explaining Claude Code features
 */
function InfoTooltip({ itemType }: { itemType: ItemType }) {
  const [isVisible, setIsVisible] = useState(false);
  const info = ITEM_TYPE_INFO[itemType];
  if (!info) return null;

  return (
    <div className="relative inline-block ml-1">
      <button
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all hover:scale-110"
        style={{
          background: isVisible ? '#c9a227' : '#3d3328',
          color: isVisible ? '#1a1410' : '#7a6f62',
          border: '1px solid #4a3f32',
        }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
      >
        ?
      </button>
      {isVisible && (
        <div
          className="absolute z-50 w-52 p-2.5 rounded-lg shadow-xl"
          style={{
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '6px',
            background: 'linear-gradient(180deg, #2d261e 0%, #1a1410 100%)',
            border: '1px solid #c9a227',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(201, 162, 39, 0.15)',
          }}
        >
          {/* Arrow */}
          <div
            className="absolute w-2 h-2 rotate-45"
            style={{
              top: '-5px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#2d261e',
              borderTop: '1px solid #c9a227',
              borderLeft: '1px solid #c9a227',
            }}
          />
          <div className="text-[10px] font-bold mb-1" style={{ color: '#c9a227' }}>
            {info.label}
          </div>
          <div className="text-[9px] mb-1.5 leading-relaxed" style={{ color: '#b8a894' }}>
            {info.description}
          </div>
          <div
            className="text-[9px] pt-1.5 border-t leading-relaxed"
            style={{ color: '#7a6f62', borderColor: '#3d3328' }}
          >
            {info.claudeConcept}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified WoW-style Character Sheet
 * Items arranged around the character:
 *
 *                    [HELM]
 *                  (CLAUDE.md)
 *
 *    [HOOK] [HOOK] [HOOK] [HOOK] [HOOK] [HOOK]
 *         (All hooks consolidated)
 *
 *    [MAINHAND]  [CHARACTER]  [OFFHAND]
 *     (Plugin)     MODEL      (Plugin)
 *
 *        [CMD 1]              [CMD 2]
 *       (/command)          (/command)
 *
 *        [MCP 1]   [MCP 2]   [MCP 3]
 *
 * Below: Skills (6) and Agents (3)
 */
export function WoWCharacterSheet() {
  // Select stable references from stores
  const rawEquipment = useAppStore((state) => state.equipment);
  const statuses = useAllItemStatuses();
  const pollMCPStatus = useItemStatusStore((state) => state.pollMCPStatus);
  const activePersona = usePersonaStore((state) => state.activePersona);

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

  // Calculate equipped item count for glow effect
  const equippedCount = [
    equipment.helm,
    equipment.mainhand,
    equipment.offhand,
    ...equipment.hooks,
    ...equipment.rings,
    ...equipment.spellbook,
    ...equipment.companions,
    ...equipment.trinkets,
  ].filter(Boolean).length;

  const glowIntensity = Math.min(equippedCount * 0.08, 0.6);

  // Get first equipped item of highest rarity for aura color
  const allEquipped = [
    equipment.helm,
    equipment.mainhand,
    equipment.offhand,
    ...equipment.trinkets,
  ].filter(Boolean);
  const highestRarityItem = allEquipped.sort((a, b) => {
    const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    return rarityOrder.indexOf(a!.rarity) - rarityOrder.indexOf(b!.rarity);
  })[0];

  return (
    <div className="flex flex-col items-center gap-2 p-3 select-none">
      {/* Background glow based on equipped items */}
      <div
        className="absolute inset-0 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(201, 162, 39, ${glowIntensity}) 0%, transparent 70%)`,
          transform: 'scale(1.2)',
        }}
      />

      {/* Helm - Mind/Memory */}
      <div className="flex flex-col items-center" title={ITEM_TYPE_INFO.helm.claudeConcept}>
        <EquipmentSlot
          slot={{ type: 'helm' }}
          item={equipment.helm}
          size="medium"
        />
        <span className="text-[9px] mt-0.5" style={{ color: '#7a6f62' }}>
          Mind
        </span>
      </div>

      {/* Hooks row - All hooks consolidated */}
      <div className="w-full">
        <div
          className="flex items-center justify-between mb-1"
          style={{ borderBottom: '1px solid #3d3328', paddingBottom: '2px' }}
        >
          <h4 className="text-[9px] font-bold uppercase flex items-center" style={{ color: '#c9a227' }}>
            Hooks
            <InfoTooltip itemType="hooks" />
          </h4>
          <span className="text-[9px]" style={{ color: '#b8a894' }}>
            {equipment.hooks.filter(Boolean).length}/{SLOT_LIMITS.hooks}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
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

      {/* Main row: Weapons + Character */}
      <div className="flex items-center gap-2">
        {/* Mainhand */}
        <div className="flex flex-col items-center" title={ITEM_TYPE_INFO.mainhand.claudeConcept}>
          <EquipmentSlot
            slot={{ type: 'mainhand' }}
            item={equipment.mainhand}
            size="medium"
          />
          <span className="text-[9px] mt-0.5" style={{ color: '#7a6f62' }}>
            Tool
          </span>
        </div>

        {/* Character Portrait */}
        <div className="relative">
          <div
            className="w-20 h-28 rounded-lg relative overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #2d261e 0%, #1c1712 100%)',
              border: '2px solid #4a3f32',
              boxShadow: `
                inset 0 0 15px rgba(0, 0, 0, 0.5),
                0 0 15px rgba(201, 162, 39, ${glowIntensity * 0.5})
              `,
            }}
          >
            <PixelSpriteAnimated
              avatar={activePersona.avatar}
              size={60}
              glowColor={equippedCount > 0 ? '#c9a227' : undefined}
            />

            {/* Aura effect from highest rarity item */}
            {highestRarityItem && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at center, ${RARITY_COLORS[highestRarityItem.rarity]}15 0%, transparent 70%)`,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            )}

            {/* Rarity indicators at bottom */}
            <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
              {equipment.helm && (
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: RARITY_COLORS[equipment.helm.rarity],
                    boxShadow: `0 0 3px ${RARITY_COLORS[equipment.helm.rarity]}`,
                  }}
                />
              )}
              {equipment.mainhand && (
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: RARITY_COLORS[equipment.mainhand.rarity],
                    boxShadow: `0 0 3px ${RARITY_COLORS[equipment.mainhand.rarity]}`,
                  }}
                />
              )}
              {equipment.offhand && (
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: RARITY_COLORS[equipment.offhand.rarity],
                    boxShadow: `0 0 3px ${RARITY_COLORS[equipment.offhand.rarity]}`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Offhand */}
        <div className="flex flex-col items-center" title={ITEM_TYPE_INFO.offhand.claudeConcept}>
          <EquipmentSlot
            slot={{ type: 'offhand' }}
            item={equipment.offhand}
            size="medium"
          />
          <span className="text-[9px] mt-0.5" style={{ color: '#7a6f62' }}>
            Tool
          </span>
        </div>
      </div>

      {/* Commands row */}
      <div className="flex gap-4" title={ITEM_TYPE_INFO.ring.claudeConcept}>
        <div className="flex flex-col items-center">
          <EquipmentSlot
            slot={{ type: 'rings', index: 0 }}
            item={equipment.rings[0] ?? null}
            size="medium"
          />
          <span className="text-[9px] mt-0.5" style={{ color: '#7a6f62' }}>
            Cmd
          </span>
        </div>
        <div className="flex flex-col items-center">
          <EquipmentSlot
            slot={{ type: 'rings', index: 1 }}
            item={equipment.rings[1] ?? null}
            size="medium"
          />
          <span className="text-[9px] mt-0.5" style={{ color: '#7a6f62' }}>
            Cmd
          </span>
        </div>
      </div>

      {/* Character name and title */}
      <div className="text-center">
        <h2
          className="fantasy-title text-base"
          style={{
            color: '#c9a227',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(201, 162, 39, 0.3)',
          }}
        >
          {activePersona.name}
        </h2>
        <p className="text-[10px]" style={{ color: '#b8a894' }}>
          {activePersona.title}
        </p>
        <p className="text-[9px]" style={{ color: '#7a6f62' }}>
          {equippedCount} items equipped
        </p>
      </div>

      {/* Trinkets row (MCPs) - Context Hogs! */}
      <div className="w-full">
        <div
          className="flex items-center justify-between mb-1"
          style={{ borderBottom: '1px solid #3d3328', paddingBottom: '2px' }}
        >
          <h4 className="text-[9px] font-bold uppercase flex items-center" style={{ color: '#c9a227' }}>
            MCP Servers
            <InfoTooltip itemType="trinket" />
          </h4>
          <span className="text-[9px]" style={{ color: '#ef4444' }}>
            {equipment.trinkets.filter(Boolean).length}/{SLOT_LIMITS.trinkets} (context hogs!)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
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

      {/* Skills bar (Progressive Disclosure) */}
      <div className="w-full">
        <div
          className="flex items-center justify-between mb-1"
          style={{ borderBottom: '1px solid #3d3328', paddingBottom: '2px' }}
        >
          <h4 className="text-[9px] font-bold uppercase flex items-center" style={{ color: '#c9a227' }}>
            Skills
            <InfoTooltip itemType="spell" />
          </h4>
          <span className="text-[9px]" style={{ color: '#4ade80' }}>
            {equipment.spellbook.filter(Boolean).length}/{SLOT_LIMITS.spellbook} (~1K each)
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
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

      {/* Companions row (Subagents - Isolated Context!) */}
      <div className="w-full">
        <div
          className="flex items-center justify-between mb-1"
          style={{ borderBottom: '1px solid #3d3328', paddingBottom: '2px' }}
        >
          <h4 className="text-[9px] font-bold uppercase flex items-center" style={{ color: '#c9a227' }}>
            Agents
            <InfoTooltip itemType="companion" />
          </h4>
          <span className="text-[9px]" style={{ color: '#60a5fa' }}>
            {equipment.companions.filter(Boolean).length}/{SLOT_LIMITS.companions} (own 200K ctx!)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
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
    </div>
  );
}
