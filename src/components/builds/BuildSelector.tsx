import { useState, useRef, useEffect, useMemo } from 'react';
import { useBuildStore } from '../../stores/buildStore';
import { useAppStore } from '../../stores/appStore';
import type { Build, SavedLoadout, InventoryItem } from '../../types';

interface BuildSelectorProps {
  onOpenManager: () => void;
}

export function BuildSelector({ onOpenManager }: BuildSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Select raw state to avoid infinite loop - getBuildsWithPresets creates new array each call
  const userBuilds = useBuildStore((state) => state.builds);
  const activeBuildId = useBuildStore((state) => state.activeBuildId);

  // Compute builds with presets using useMemo for stable reference
  const builds = useMemo(() => {
    return useBuildStore.getState().getBuildsWithPresets();
  }, [userBuilds]);
  const loadBuild = useBuildStore((state) => state.loadBuild);
  const saveBuild = useBuildStore((state) => state.saveBuild);

  const equipment = useAppStore((state) => state.equipment);
  const inventory = useAppStore((state) => state.inventory);
  const equipItem = useAppStore((state) => state.equipItem);
  const unequipItem = useAppStore((state) => state.unequipItem);

  const activeBuild = builds.find((b) => b.id === activeBuildId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectBuild = async (build: Build) => {
    const loadout = loadBuild(build.id);
    if (!loadout) return;

    // Unequip all current items using simplified slot structure
    if (equipment.helm) await unequipItem({ type: 'helm' });
    if (equipment.mainhand) await unequipItem({ type: 'mainhand' });
    if (equipment.offhand) await unequipItem({ type: 'offhand' });

    // Unequip array slots
    for (let i = 0; i < equipment.hooks.length; i++) {
      await unequipItem({ type: 'hooks', index: i });
    }
    for (let i = 0; i < equipment.rings.length; i++) {
      await unequipItem({ type: 'rings', index: i });
    }
    for (let i = 0; i < equipment.spellbook.length; i++) {
      await unequipItem({ type: 'spellbook', index: i });
    }
    for (let i = 0; i < equipment.companions.length; i++) {
      await unequipItem({ type: 'companions', index: i });
    }
    for (let i = 0; i < equipment.trinkets.length; i++) {
      await unequipItem({ type: 'trinkets', index: i });
    }

    // Equip items from loadout using simplified structure
    if (loadout.helmId) await equipItem(loadout.helmId, { type: 'helm' });
    if (loadout.mainhandId) await equipItem(loadout.mainhandId, { type: 'mainhand' });
    if (loadout.offhandId) await equipItem(loadout.offhandId, { type: 'offhand' });

    for (const id of loadout.hookIds) {
      await equipItem(id, { type: 'hooks' });
    }
    for (const id of loadout.ringIds) {
      await equipItem(id, { type: 'rings' });
    }
    for (const id of loadout.spellbookIds) {
      await equipItem(id, { type: 'spellbook' });
    }
    for (const id of loadout.companionIds) {
      await equipItem(id, { type: 'companions' });
    }
    for (const id of loadout.trinketIds) {
      await equipItem(id, { type: 'trinkets' });
    }

    setIsOpen(false);
  };

  const handleSaveCurrentBuild = () => {
    // Create loadout from current equipment using simplified structure
    const currentLoadout: SavedLoadout = {
      helmId: equipment.helm?.id ?? null,
      hookIds: equipment.hooks.map((h: InventoryItem) => h.id),
      mainhandId: equipment.mainhand?.id ?? null,
      offhandId: equipment.offhand?.id ?? null,
      ringIds: equipment.rings.map((r: InventoryItem) => r.id),
      spellbookIds: equipment.spellbook.map((s: InventoryItem) => s.id),
      companionIds: equipment.companions.map((c: InventoryItem) => c.id),
      trinketIds: equipment.trinkets.map((t: InventoryItem) => t.id),
    };

    const name = `Build ${builds.filter((b) => !b.id.startsWith('preset_')).length + 1}`;
    saveBuild(name, 'I', currentLoadout, inventory);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
        style={{
          background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
          border: '1px solid var(--bg-tertiary)',
        }}
      >
        <span className="text-lg">{activeBuild?.icon || 'I'}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {activeBuild?.name || 'No Build'}
        </span>
        <svg
          className="w-3 h-3 transition-transform"
          style={{
            color: 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-56 rounded-lg shadow-lg overflow-hidden z-50"
          style={{
            background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
            border: '2px solid var(--bg-tertiary)',
          }}
        >
          {/* Quick save */}
          <button
            onClick={handleSaveCurrentBuild}
            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--accent)',
              borderBottom: '1px solid var(--bg-tertiary)',
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            Quick Save Current
          </button>

          {/* Builds list */}
          <div className="max-h-48 overflow-y-auto">
            {builds.map((build) => (
              <button
                key={build.id}
                onClick={() => handleSelectBuild(build)}
                className="w-full px-3 py-2 text-left flex items-center gap-2 transition-colors"
                style={{
                  background: build.id === activeBuildId ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                  borderLeft: build.id === activeBuildId ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                <span className="text-sm">{build.icon}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-medium truncate"
                    style={{ color: build.id === activeBuildId ? 'var(--accent)' : 'var(--text-primary)' }}
                  >
                    {build.name}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {(build.totalTokens / 1000).toFixed(1)}K ({((build.totalTokens / 200000) * 100).toFixed(1)}%)
                  </div>
                </div>
                {build.id.startsWith('preset_') && (
                  <span
                    className="px-1 py-0.5 text-[9px] rounded"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    Preset
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Manage button */}
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenManager();
            }}
            className="w-full px-3 py-2 text-xs flex items-center gap-2"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--bg-tertiary)',
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Manage Builds
          </button>
        </div>
      )}
    </div>
  );
}
