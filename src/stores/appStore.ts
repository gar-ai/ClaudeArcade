import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type {
  InventoryItem,
  Equipment,
  ContextStats,
  RightPanelMode,
  BackpackFilter,
  EquipmentSlot,
  ContextStatus,
} from '../types';
import { CONTEXT_BUDGET, CONTEXT_THRESHOLDS } from '../types';
import type { ProjectInfo, Recommendation } from '../utils/recommendations';
import { getRecommendations } from '../utils/recommendations';
import { useItemStatusStore } from '../hooks/useItemStatus';

// Pending dumbzone equip state
interface PendingDumbzoneEquip {
  item: InventoryItem;
  slot: EquipmentSlot;
  currentUsage: number;
  projectedUsage: number;
  projectedPercentage: number;
}

interface AppState {
  // Core
  inventory: InventoryItem[];
  equipment: Equipment;
  stats: ContextStats;

  // UI
  rightPanelMode: RightPanelMode;
  backpackFilter: BackpackFilter;
  searchQuery: string;
  selectedItem: InventoryItem | null;
  isLoading: boolean;
  error: string | null;

  // Dumbzone modal
  pendingDumbzoneEquip: PendingDumbzoneEquip | null;

  // Terminal
  terminalReady: boolean;

  // Project & Recommendations
  projectPath: string | null;
  projectInfo: ProjectInfo | null;
  recommendations: Recommendation[];

  // Meta
  lastSyncTimestamp: number;
}

interface AppActions {
  // Inventory
  scanInventory: () => Promise<void>;
  setInventory: (items: InventoryItem[]) => void;

  // Equipment
  equipItem: (itemId: string, slot: EquipmentSlot) => Promise<void>;
  unequipItem: (slot: EquipmentSlot) => Promise<void>;
  forceEquipItem: () => Promise<void>;  // Equip even in dumbzone
  cancelDumbzoneEquip: () => void;
  _performEquip: (itemId: string, slot: EquipmentSlot) => Promise<void>;  // Internal

  // UI
  setRightPanelMode: (mode: RightPanelMode) => void;
  setBackpackFilter: (filter: BackpackFilter) => void;
  setSearchQuery: (query: string) => void;
  setSelectedItem: (item: InventoryItem | null) => void;
  setError: (error: string | null) => void;

  // Project & Recommendations
  setProjectPath: (path: string | null) => void;
  detectProject: (path: string) => Promise<void>;
  updateRecommendations: () => void;

  // Helpers
  getSlotItem: (slot: EquipmentSlot) => InventoryItem | null;
  getEquippedWeight: () => number;
  calculateStats: () => ContextStats;

  // Status integration
  getInventoryWithStatus: () => InventoryItem[];
  getEquipmentWithStatus: () => Equipment;
}

const defaultEquipment: Equipment = {
  helm: null,
  hooks: [],
  mainhand: null,
  offhand: null,
  rings: [],
  spellbook: [],
  companions: [],
  trinkets: [],
};

const defaultStats: ContextStats = {
  totalBudget: CONTEXT_BUDGET,
  equipped: 0,
  available: CONTEXT_BUDGET,
  loadPercentage: 0,
  status: 'healthy',
};

function calculateStatus(percentage: number): ContextStatus {
  if (percentage >= CONTEXT_THRESHOLDS.heavy) return 'dumbzone';
  if (percentage >= CONTEXT_THRESHOLDS.healthy) return 'heavy';
  return 'healthy';
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  // Initial state
  inventory: [],
  equipment: defaultEquipment,
  stats: defaultStats,
  rightPanelMode: 'backpack',
  backpackFilter: 'all',
  searchQuery: '',
  selectedItem: null,
  isLoading: false,
  error: null,
  pendingDumbzoneEquip: null,
  terminalReady: false,
  projectPath: null,
  projectInfo: null,
  recommendations: [],
  lastSyncTimestamp: 0,

  // Actions
  scanInventory: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await invoke<{ items: InventoryItem[]; errors: string[]; scanDurationMs: number }>('scan_inventory');

      // Calculate stats from enabled items
      const enabledItems = result.items.filter(item => item.enabled);
      const equippedWeight = enabledItems.reduce((acc, item) => acc + item.tokenWeight, 0);
      const loadPercentage = equippedWeight / CONTEXT_BUDGET;

      // Build equipment from enabled items using simplified slots
      const equipment: Equipment = {
        helm: enabledItems.find(i => i.itemType === 'helm') ?? null,
        hooks: enabledItems.filter(i => i.itemType === 'hooks'),
        mainhand: enabledItems.find(i => i.itemType === 'mainhand') ?? null,
        offhand: enabledItems.find(i => i.itemType === 'offhand') ?? null,
        rings: enabledItems.filter(i => i.itemType === 'ring'),
        spellbook: enabledItems.filter(i => i.itemType === 'spell'),
        companions: enabledItems.filter(i => i.itemType === 'companion'),
        trinkets: enabledItems.filter(i => i.itemType === 'trinket'),
      };

      set({
        inventory: result.items,
        equipment,
        stats: {
          totalBudget: CONTEXT_BUDGET,
          equipped: equippedWeight,
          available: CONTEXT_BUDGET - equippedWeight,
          loadPercentage,
          status: calculateStatus(loadPercentage),
        },
        lastSyncTimestamp: Date.now(),
        isLoading: false,
      });

      // Log any scanner errors
      if (result.errors.length > 0) {
        console.warn('Scanner warnings:', result.errors);
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  setInventory: (items) => {
    set({ inventory: items });
  },

  equipItem: async (itemId, slot) => {
    const state = get();
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) return;

    // Calculate projected usage
    const currentUsage = state.stats.equipped;
    const projectedUsage = currentUsage + item.tokenWeight;
    const projectedPercentage = projectedUsage / CONTEXT_BUDGET;

    // Check if this would push us into dumbzone (>50%)
    if (projectedPercentage > CONTEXT_THRESHOLDS.heavy) {
      // Show confirmation modal instead of equipping directly
      set({
        pendingDumbzoneEquip: {
          item,
          slot,
          currentUsage,
          projectedUsage,
          projectedPercentage,
        },
      });
      return;
    }

    // Safe to equip directly
    await get()._performEquip(itemId, slot);
  },

  // Internal function to actually perform the equip
  _performEquip: async (itemId: string, slot: EquipmentSlot) => {
    const state = get();

    try {
      await invoke('equip_item', { itemId, slot });

      // Update inventory item as enabled
      const updatedInventory = state.inventory.map(i =>
        i.id === itemId ? { ...i, enabled: true } : i
      );

      // Rebuild equipment from enabled items using simplified slots
      const enabledItems = updatedInventory.filter(i => i.enabled);
      const equipment: Equipment = {
        helm: enabledItems.find(i => i.itemType === 'helm') ?? null,
        hooks: enabledItems.filter(i => i.itemType === 'hooks'),
        mainhand: enabledItems.find(i => i.itemType === 'mainhand') ?? null,
        offhand: enabledItems.find(i => i.itemType === 'offhand') ?? null,
        rings: enabledItems.filter(i => i.itemType === 'ring'),
        spellbook: enabledItems.filter(i => i.itemType === 'spell'),
        companions: enabledItems.filter(i => i.itemType === 'companion'),
        trinkets: enabledItems.filter(i => i.itemType === 'trinket'),
      };

      const equippedWeight = enabledItems.reduce((acc, i) => acc + i.tokenWeight, 0);
      const loadPercentage = equippedWeight / CONTEXT_BUDGET;

      set({
        inventory: updatedInventory,
        equipment,
        stats: {
          totalBudget: CONTEXT_BUDGET,
          equipped: equippedWeight,
          available: CONTEXT_BUDGET - equippedWeight,
          loadPercentage,
          status: calculateStatus(loadPercentage),
        },
        pendingDumbzoneEquip: null,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  forceEquipItem: async () => {
    const state = get();
    if (!state.pendingDumbzoneEquip) return;

    const { item, slot } = state.pendingDumbzoneEquip;
    await get()._performEquip(item.id, slot);
  },

  cancelDumbzoneEquip: () => {
    set({ pendingDumbzoneEquip: null });
  },

  unequipItem: async (slot) => {
    const state = get();

    // Find the item in the slot using simplified slots
    let itemId: string | null = null;

    // Single slots
    if (slot.type === 'helm' && state.equipment.helm) {
      itemId = state.equipment.helm.id;
    } else if (slot.type === 'mainhand' && state.equipment.mainhand) {
      itemId = state.equipment.mainhand.id;
    } else if (slot.type === 'offhand' && state.equipment.offhand) {
      itemId = state.equipment.offhand.id;
    }
    // Array slots
    else if (slot.type === 'hooks' && slot.index !== undefined) {
      itemId = state.equipment.hooks[slot.index]?.id ?? null;
    } else if (slot.type === 'rings' && slot.index !== undefined) {
      itemId = state.equipment.rings[slot.index]?.id ?? null;
    } else if (slot.type === 'spellbook' && slot.index !== undefined) {
      itemId = state.equipment.spellbook[slot.index]?.id ?? null;
    } else if (slot.type === 'companions' && slot.index !== undefined) {
      itemId = state.equipment.companions[slot.index]?.id ?? null;
    } else if (slot.type === 'trinkets' && slot.index !== undefined) {
      itemId = state.equipment.trinkets[slot.index]?.id ?? null;
    }

    if (!itemId) return;

    try {
      await invoke('unequip_item', { itemId });

      // Update inventory item as disabled
      const updatedInventory = state.inventory.map(i =>
        i.id === itemId ? { ...i, enabled: false } : i
      );

      // Rebuild equipment from enabled items using simplified slots
      const enabledItems = updatedInventory.filter(i => i.enabled);
      const equipment: Equipment = {
        helm: enabledItems.find(i => i.itemType === 'helm') ?? null,
        hooks: enabledItems.filter(i => i.itemType === 'hooks'),
        mainhand: enabledItems.find(i => i.itemType === 'mainhand') ?? null,
        offhand: enabledItems.find(i => i.itemType === 'offhand') ?? null,
        rings: enabledItems.filter(i => i.itemType === 'ring'),
        spellbook: enabledItems.filter(i => i.itemType === 'spell'),
        companions: enabledItems.filter(i => i.itemType === 'companion'),
        trinkets: enabledItems.filter(i => i.itemType === 'trinket'),
      };

      const equippedWeight = enabledItems.reduce((acc, i) => acc + i.tokenWeight, 0);
      const loadPercentage = equippedWeight / CONTEXT_BUDGET;

      set({
        inventory: updatedInventory,
        equipment,
        stats: {
          totalBudget: CONTEXT_BUDGET,
          equipped: equippedWeight,
          available: CONTEXT_BUDGET - equippedWeight,
          loadPercentage,
          status: calculateStatus(loadPercentage),
        },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
  setBackpackFilter: (filter) => set({ backpackFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedItem: (item) => set({ selectedItem: item }),
  setError: (error) => set({ error }),

  setProjectPath: (path) => set({ projectPath: path }),

  detectProject: async (path) => {
    try {
      const projectInfo = await invoke<ProjectInfo>('detect_project_type', { path });
      const state = get();
      const recommendations = getRecommendations(projectInfo, state.inventory, state.equipment);
      set({ projectPath: path, projectInfo, recommendations });
    } catch (err) {
      console.warn('Failed to detect project type:', err);
      set({ projectPath: path, projectInfo: null, recommendations: [] });
    }
  },

  updateRecommendations: () => {
    const state = get();
    const recommendations = getRecommendations(state.projectInfo, state.inventory, state.equipment);
    set({ recommendations });
  },

  getSlotItem: (slot) => {
    const { equipment } = get();
    // Single slots
    if (slot.type === 'helm') return equipment.helm;
    if (slot.type === 'mainhand') return equipment.mainhand;
    if (slot.type === 'offhand') return equipment.offhand;
    // Array slots
    if (slot.type === 'hooks') return equipment.hooks[slot.index ?? 0] ?? null;
    if (slot.type === 'rings') return equipment.rings[slot.index ?? 0] ?? null;
    if (slot.type === 'spellbook') return equipment.spellbook[slot.index ?? 0] ?? null;
    if (slot.type === 'companions') return equipment.companions[slot.index ?? 0] ?? null;
    if (slot.type === 'trinkets') return equipment.trinkets[slot.index ?? 0] ?? null;
    return null;
  },

  getEquippedWeight: () => {
    const { inventory } = get();
    return inventory
      .filter(item => item.enabled)
      .reduce((acc, item) => acc + item.tokenWeight, 0);
  },

  calculateStats: () => {
    const equipped = get().getEquippedWeight();
    const loadPercentage = equipped / CONTEXT_BUDGET;
    return {
      totalBudget: CONTEXT_BUDGET,
      equipped,
      available: CONTEXT_BUDGET - equipped,
      loadPercentage,
      status: calculateStatus(loadPercentage),
    };
  },

  // Merge inventory items with their live statuses
  getInventoryWithStatus: () => {
    const { inventory } = get();
    const statuses = useItemStatusStore.getState().statuses;

    return inventory.map((item) => ({
      ...item,
      status: statuses[item.id] || item.status,
    }));
  },

  // Merge equipment items with their live statuses
  getEquipmentWithStatus: () => {
    const { equipment } = get();
    const statuses = useItemStatusStore.getState().statuses;

    const mergeStatus = (item: InventoryItem | null): InventoryItem | null => {
      if (!item) return null;
      return {
        ...item,
        status: statuses[item.id] || item.status,
      };
    };

    const mergeArray = (items: InventoryItem[]) =>
      items.map((item) => ({
        ...item,
        status: statuses[item.id] || item.status,
      }));

    return {
      // Single slots
      helm: mergeStatus(equipment.helm),
      mainhand: mergeStatus(equipment.mainhand),
      offhand: mergeStatus(equipment.offhand),
      // Array slots
      hooks: mergeArray(equipment.hooks),
      rings: mergeArray(equipment.rings),
      spellbook: mergeArray(equipment.spellbook),
      companions: mergeArray(equipment.companions),
      trinkets: mergeArray(equipment.trinkets),
    };
  },
}));
