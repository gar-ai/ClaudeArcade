import { useState, useMemo } from 'react';
import { useBuildStore } from '../../stores/buildStore';
import { useAppStore } from '../../stores/appStore';
import type { Build, SavedLoadout, InventoryItem } from '../../types';
import { CONTEXT_BUDGET } from '../../types';

interface BuildManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_OPTIONS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'Z', '*'];

export function BuildManager({ isOpen, onClose }: BuildManagerProps) {
  const [editingBuild, setEditingBuild] = useState<Build | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Select raw state to avoid infinite loop - getBuildsWithPresets creates new array each call
  const userBuildsState = useBuildStore((state) => state.builds);
  const activeBuildId = useBuildStore((state) => state.activeBuildId);

  // Compute builds with presets using useMemo for stable reference
  const builds = useMemo(() => {
    return useBuildStore.getState().getBuildsWithPresets();
  }, [userBuildsState]);
  const saveBuild = useBuildStore((state) => state.saveBuild);
  const deleteBuild = useBuildStore((state) => state.deleteBuild);
  const updateBuild = useBuildStore((state) => state.updateBuild);
  const loadBuild = useBuildStore((state) => state.loadBuild);

  const equipment = useAppStore((state) => state.equipment);
  const inventory = useAppStore((state) => state.inventory);
  const equipItem = useAppStore((state) => state.equipItem);
  const unequipItem = useAppStore((state) => state.unequipItem);

  if (!isOpen) return null;

  const userBuilds = builds.filter((b) => !b.id.startsWith('preset_'));
  const presetBuilds = builds.filter((b) => b.id.startsWith('preset_'));

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEditBuild = (build: Build) => {
    if (build.id.startsWith('preset_')) return;
    setEditingBuild(build);
    setEditName(build.name);
    setEditIcon(build.icon);
    setEditDescription(build.description ?? '');
  };

  const handleSaveEdit = () => {
    if (!editingBuild) return;
    updateBuild(editingBuild.id, {
      name: editName,
      icon: editIcon,
      description: editDescription || undefined,
    });
    setEditingBuild(null);
  };

  const handleCancelEdit = () => {
    setEditingBuild(null);
  };

  const handleDeleteBuild = (buildId: string) => {
    if (buildId.startsWith('preset_')) return;
    if (confirm('Delete this build?')) {
      deleteBuild(buildId);
    }
  };

  const handleLoadBuild = async (build: Build) => {
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

    onClose();
  };

  const handleCreateBuild = () => {
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

    const name = `Build ${userBuilds.length + 1}`;
    const newBuild = saveBuild(name, 'I', currentLoadout, inventory);
    handleEditBuild(newBuild);
  };

  const getLoadPercentage = (tokens: number) => ((tokens / CONTEXT_BUDGET) * 100).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] rounded-lg overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
          border: '3px solid var(--bg-tertiary)',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{
            background: 'linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
            borderBottom: '2px solid var(--bg-tertiary)',
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
            Build Profiles
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {editingBuild ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Build Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  placeholder="Enter build name..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setEditIcon(emoji)}
                      className="w-10 h-10 rounded flex items-center justify-center text-xl transition-all"
                      style={{
                        background: editIcon === emoji ? 'var(--accent)' : 'var(--bg-tertiary)',
                        border: editIcon === emoji ? '2px solid var(--accent)' : '2px solid transparent',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm resize-none"
                  rows={2}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  placeholder="Describe this build..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 rounded font-medium text-sm"
                  style={{
                    background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
                    color: 'var(--bg-primary)',
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded font-medium text-sm"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* List Mode */
            <div className="space-y-4">
              {/* User Builds */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Your Builds
                  </h3>
                  <button
                    onClick={handleCreateBuild}
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--accent)',
                    }}
                  >
                    + New Build
                  </button>
                </div>

                {userBuilds.length === 0 ? (
                  <div
                    className="text-center py-8 rounded"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <p className="text-sm">No saved builds yet</p>
                    <p className="text-xs mt-1">Create a build to save your current equipment setup</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userBuilds.map((build) => (
                      <BuildCard
                        key={build.id}
                        build={build}
                        isActive={build.id === activeBuildId}
                        onLoad={() => handleLoadBuild(build)}
                        onEdit={() => handleEditBuild(build)}
                        onDelete={() => handleDeleteBuild(build.id)}
                        loadPercentage={getLoadPercentage(build.totalTokens)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Preset Builds */}
              <div>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Presets
                </h3>
                <div className="space-y-2">
                  {presetBuilds.map((build) => (
                    <BuildCard
                      key={build.id}
                      build={build}
                      isActive={build.id === activeBuildId}
                      onLoad={() => handleLoadBuild(build)}
                      isPreset
                      loadPercentage={getLoadPercentage(build.totalTokens)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface BuildCardProps {
  build: Build;
  isActive: boolean;
  onLoad: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isPreset?: boolean;
  loadPercentage: string;
}

function BuildCard({ build, isActive, onLoad, onEdit, onDelete, isPreset, loadPercentage }: BuildCardProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg transition-all"
      style={{
        background: isActive ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--bg-tertiary)',
        border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
      }}
    >
      <div
        className="w-12 h-12 rounded flex items-center justify-center text-2xl shrink-0"
        style={{ background: 'var(--bg-primary)' }}
      >
        {build.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-medium truncate"
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
          >
            {build.name}
          </span>
          {isPreset && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              Preset
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {build.description || `${build.totalTokens.toLocaleString()} tokens (${loadPercentage}%)`}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onLoad}
          className="px-3 py-1.5 rounded text-xs font-medium transition-all"
          style={{
            background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
            color: isActive ? 'var(--bg-primary)' : 'var(--text-primary)',
          }}
        >
          {isActive ? 'Active' : 'Load'}
        </button>

        {!isPreset && onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}

        {!isPreset && onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
