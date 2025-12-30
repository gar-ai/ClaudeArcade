import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ItemStatus, ItemConnectionStatus } from '../types';

interface ItemStatusState {
  // Map of item ID to status
  statuses: Record<string, ItemStatus>;

  // Session-level tracking
  sessionStartTime: number;

  // Actions
  updateStatus: (itemId: string, status: Partial<ItemStatus>) => void;
  recordUsage: (itemId: string) => void;
  setConnectionStatus: (itemId: string, status: ItemConnectionStatus) => void;
  resetSession: () => void;

  // Polling
  pollMCPStatus: (serverIds: string[]) => Promise<void>;
}

export const useItemStatusStore = create<ItemStatusState>((set, get) => ({
  statuses: {},
  sessionStartTime: Date.now(),

  updateStatus: (itemId, status) => {
    set((state) => ({
      statuses: {
        ...state.statuses,
        [itemId]: {
          ...state.statuses[itemId],
          ...status,
        },
      },
    }));
  },

  recordUsage: (itemId) => {
    const currentStatus = get().statuses[itemId] || {};
    set((state) => ({
      statuses: {
        ...state.statuses,
        [itemId]: {
          ...currentStatus,
          lastUsed: Date.now(),
          runCount: (currentStatus.runCount || 0) + 1,
          isActive: true,
        },
      },
    }));

    // Clear isActive after a short delay
    setTimeout(() => {
      set((state) => ({
        statuses: {
          ...state.statuses,
          [itemId]: {
            ...state.statuses[itemId],
            isActive: false,
          },
        },
      }));
    }, 2000);
  },

  setConnectionStatus: (itemId, connectionStatus) => {
    set((state) => ({
      statuses: {
        ...state.statuses,
        [itemId]: {
          ...state.statuses[itemId],
          connectionStatus,
        },
      },
    }));
  },

  resetSession: () => {
    set({
      statuses: {},
      sessionStartTime: Date.now(),
    });
  },

  pollMCPStatus: async (serverIds) => {
    // Try to check MCP server status via backend
    try {
      const statusMap = await invoke<Record<string, string>>('check_mcp_status', { serverIds });

      Object.entries(statusMap).forEach(([serverId, status]) => {
        get().setConnectionStatus(serverId, status as ItemConnectionStatus);
      });
    } catch (e) {
      // If the command doesn't exist yet, set all to unknown
      console.debug('MCP status check not available:', e);
      serverIds.forEach((id) => {
        get().setConnectionStatus(id, 'unknown');
      });
    }
  },
}));

// Hook to get status for a specific item with real-time updates
export function useItemStatus(itemId: string): ItemStatus | undefined {
  return useItemStatusStore((state) => state.statuses[itemId]);
}

// Hook to get all statuses
export function useAllItemStatuses(): Record<string, ItemStatus> {
  return useItemStatusStore((state) => state.statuses);
}

// Terminal output patterns for detecting item usage
export const USAGE_PATTERNS = {
  // Skill/companion invocation patterns
  skill: [
    /Using skill: (\S+)/i,
    /Invoking agent: (\S+)/i,
    /\[skill:(\S+)\]/i,
  ],

  // Hook execution patterns
  hook: [
    /Running hook: (\S+)/i,
    /\[hook:(\S+)\]/i,
    /PreToolUse: (\S+)/i,
    /PostToolUse: (\S+)/i,
  ],

  // MCP tool usage patterns
  mcp: [
    /mcp__(\S+)__\S+/,
    /Using MCP server: (\S+)/i,
  ],

  // Slash command patterns
  command: [
    /^\/(\S+)/,
    /Running command: \/(\S+)/i,
  ],
};

// Function to parse terminal output and detect item usage
export function parseTerminalForUsage(
  output: string,
  itemIds: Record<string, string[]> // type -> ids mapping
): { itemId: string; type: string }[] {
  const detectedUsage: { itemId: string; type: string }[] = [];

  Object.entries(USAGE_PATTERNS).forEach(([type, patterns]) => {
    patterns.forEach((pattern) => {
      const matches = output.matchAll(new RegExp(pattern, 'g'));
      for (const match of matches) {
        const name = match[1]?.toLowerCase();
        if (name && itemIds[type]) {
          // Find matching item ID
          const matchingId = itemIds[type].find(
            (id) => id.toLowerCase().includes(name) || name.includes(id.toLowerCase())
          );
          if (matchingId) {
            detectedUsage.push({ itemId: matchingId, type });
          }
        }
      }
    });
  });

  return detectedUsage;
}
