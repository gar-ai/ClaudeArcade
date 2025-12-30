import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Build, SavedLoadout, InventoryItem } from '../types';
import { PRESET_BUILDS } from '../types';

interface BuildState {
  builds: Build[];
  activeBuildId: string | null;
}

interface BuildActions {
  // Build management
  saveBuild: (name: string, icon: string, loadout: SavedLoadout, inventory: InventoryItem[], description?: string) => Build;
  loadBuild: (buildId: string) => SavedLoadout | null;
  deleteBuild: (buildId: string) => void;
  updateBuild: (buildId: string, updates: Partial<Omit<Build, 'id' | 'createdAt'>>) => void;
  setActiveBuild: (buildId: string | null) => void;

  // Helpers
  getBuild: (buildId: string) => Build | undefined;
  getBuildsWithPresets: () => Build[];
}

function generateId(): string {
  return `build_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function calculateTotalTokens(loadout: SavedLoadout, inventory: InventoryItem[]): number {
  const itemIds = [
    loadout.helmId,
    loadout.mainhandId,
    loadout.offhandId,
    ...loadout.hookIds,
    ...loadout.ringIds,
    ...loadout.spellbookIds,
    ...loadout.companionIds,
    ...loadout.trinketIds,
  ].filter(Boolean) as string[];

  return itemIds.reduce((total, id) => {
    const item = inventory.find(i => i.id === id);
    return total + (item?.tokenWeight ?? 0);
  }, 0);
}

// Initialize preset builds with IDs
const initializePresets = (): Build[] => {
  return PRESET_BUILDS.map((preset, index) => ({
    ...preset,
    id: `preset_${index}`,
    createdAt: 0, // Presets have timestamp 0
  }));
};

export const useBuildStore = create<BuildState & BuildActions>()(
  persist(
    (set, get) => ({
      // Initial state
      builds: [],
      activeBuildId: null,

      // Actions
      saveBuild: (name, icon, loadout, inventory, description) => {
        const totalTokens = calculateTotalTokens(loadout, inventory);

        const newBuild: Build = {
          id: generateId(),
          name,
          icon,
          description,
          loadout,
          totalTokens,
          createdAt: Date.now(),
        };

        set((state) => ({
          builds: [...state.builds, newBuild],
          activeBuildId: newBuild.id,
        }));

        return newBuild;
      },

      loadBuild: (buildId) => {
        const { builds, getBuildsWithPresets } = get();
        const allBuilds = getBuildsWithPresets();
        const build = allBuilds.find(b => b.id === buildId);

        if (build) {
          set({ activeBuildId: buildId });

          // Update lastUsed for user builds
          if (!buildId.startsWith('preset_')) {
            set({
              builds: builds.map(b =>
                b.id === buildId ? { ...b, lastUsed: Date.now() } : b
              ),
            });
          }

          return build.loadout;
        }
        return null;
      },

      deleteBuild: (buildId) => {
        // Can't delete presets
        if (buildId.startsWith('preset_')) return;

        set((state) => ({
          builds: state.builds.filter(b => b.id !== buildId),
          activeBuildId: state.activeBuildId === buildId ? null : state.activeBuildId,
        }));
      },

      updateBuild: (buildId, updates) => {
        // Can't update presets
        if (buildId.startsWith('preset_')) return;

        set((state) => ({
          builds: state.builds.map(b =>
            b.id === buildId ? { ...b, ...updates } : b
          ),
        }));
      },

      setActiveBuild: (buildId) => {
        set({ activeBuildId: buildId });
      },

      getBuild: (buildId) => {
        const allBuilds = get().getBuildsWithPresets();
        return allBuilds.find(b => b.id === buildId);
      },

      getBuildsWithPresets: () => {
        const { builds } = get();
        const presets = initializePresets();
        return [...presets, ...builds];
      },
    }),
    {
      name: 'claudearcade-builds',
      partialize: (state) => ({
        builds: state.builds,
        activeBuildId: state.activeBuildId,
      }),
    }
  )
);
