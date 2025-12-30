import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InstanceStatus = 'idle' | 'working' | 'waiting' | 'error' | 'disconnected';

export interface TerminalTab {
  id: string;
  name: string;
  projectPath: string | null;
  projectName: string | null;
  ptyId: string | null;
  isConnected: boolean;
  // Party system additions
  status: InstanceStatus;
  currentTask: string;
  contextUsage: number; // Estimated tokens used in session
  lastActivity: number;
  icon: string; // Character icon/emoji
  // Per-instance loadout
  loadoutId: string | null; // ID of the applied loadout
  loadoutName: string | null; // Name of the applied loadout for display
  equippedTokens: number; // Total tokens from equipped items
  // Subagent assignment (from ~/.claude/agents/*.md)
  subagentId: string | null; // ID of the companion item to use as subagent
  subagentName: string | null; // Display name of the subagent
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  maxTabs: number;
}

interface TerminalActions {
  addTab: (projectPath?: string | null, projectName?: string | null) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  updateTabPty: (tabId: string, ptyId: string | null, isConnected: boolean) => void;
  getActiveTab: () => TerminalTab | null;
  canAddTab: () => boolean;
  // Party system actions
  setTabStatus: (tabId: string, status: InstanceStatus) => void;
  setTabTask: (tabId: string, task: string) => void;
  updateTabActivity: (tabId: string) => void;
  incrementContextUsage: (tabId: string, tokens: number) => void;
  resetContextUsage: (tabId: string) => void; // "Res" - resurrect/compact
  setContextUsage: (tabId: string, tokens: number) => void;
  // Per-instance loadout actions
  setTabLoadout: (tabId: string, loadoutId: string | null, loadoutName: string | null, equippedTokens: number) => void;
  clearTabLoadout: (tabId: string) => void;
  updateTabProject: (tabId: string, projectPath: string | null, projectName: string | null) => void;
  // Subagent assignment
  setTabSubagent: (tabId: string, subagentId: string | null, subagentName: string | null) => void;
}

function generateId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Default party member names (user can rename these)
const DEFAULT_PARTY_NAMES = ['Vanguard', 'Sentinel', 'Mystic', 'Sage', 'Oracle', 'Scribe'];
const PARTY_ICONS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function getTabName(projectName: string | null, index: number): string {
  if (projectName) return projectName;
  return DEFAULT_PARTY_NAMES[index % DEFAULT_PARTY_NAMES.length] || `Claude #${index + 1}`;
}

function getTabIcon(index: number): string {
  return PARTY_ICONS[index % PARTY_ICONS.length] || '#';
}

export const useTerminalStore = create<TerminalState & TerminalActions>()(
  persist(
    (set, get) => ({
      // Initial state - start with one tab
      tabs: [],
      activeTabId: null,
      maxTabs: 5,

      // Actions
      addTab: (projectPath = null, projectName = null) => {
        const { tabs, maxTabs } = get();
        if (tabs.length >= maxTabs) {
          console.warn('Maximum number of terminal tabs reached');
          return tabs[0]?.id ?? '';
        }

        const id = generateId();
        const name = getTabName(projectName, tabs.length);

        const newTab: TerminalTab = {
          id,
          name,
          projectPath,
          projectName,
          ptyId: null,
          isConnected: false,
          status: 'disconnected',
          currentTask: '',
          contextUsage: 0,
          lastActivity: Date.now(),
          icon: getTabIcon(tabs.length),
          loadoutId: null,
          loadoutName: null,
          equippedTokens: 0,
          subagentId: null,
          subagentName: null,
        };

        set({
          tabs: [...tabs, newTab],
          activeTabId: id,
        });

        return id;
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex((t) => t.id === tabId);

        if (tabIndex === -1) return;

        // Don't close the last tab
        if (tabs.length === 1) {
          console.warn('Cannot close the last terminal tab');
          return;
        }

        const newTabs = tabs.filter((t) => t.id !== tabId);

        // If closing active tab, switch to adjacent tab
        let newActiveId = activeTabId;
        if (activeTabId === tabId) {
          if (tabIndex < newTabs.length) {
            newActiveId = newTabs[tabIndex].id;
          } else {
            newActiveId = newTabs[newTabs.length - 1].id;
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveId,
        });
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      renameTab: (tabId, name) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, name } : t
          ),
        }));
      },

      updateTabPty: (tabId, ptyId, isConnected) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  ptyId,
                  isConnected,
                  status: isConnected ? 'idle' : 'disconnected',
                  lastActivity: Date.now(),
                }
              : t
          ),
        }));
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId) ?? null;
      },

      canAddTab: () => {
        const { tabs, maxTabs } = get();
        return tabs.length < maxTabs;
      },

      // Party system actions
      setTabStatus: (tabId, status) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, status, lastActivity: Date.now() } : t
          ),
        }));
      },

      setTabTask: (tabId, task) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, currentTask: task, lastActivity: Date.now() } : t
          ),
        }));
      },

      updateTabActivity: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, lastActivity: Date.now() } : t
          ),
        }));
      },

      incrementContextUsage: (tabId, tokens) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, contextUsage: t.contextUsage + tokens } : t
          ),
        }));
      },

      resetContextUsage: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, contextUsage: 0, lastActivity: Date.now() } : t
          ),
        }));
      },

      setContextUsage: (tabId, tokens) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, contextUsage: tokens } : t
          ),
        }));
      },

      // Per-instance loadout actions
      setTabLoadout: (tabId, loadoutId, loadoutName, equippedTokens) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, loadoutId, loadoutName, equippedTokens, lastActivity: Date.now() }
              : t
          ),
        }));
      },

      clearTabLoadout: (tabId) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, loadoutId: null, loadoutName: null, equippedTokens: 0 }
              : t
          ),
        }));
      },

      updateTabProject: (tabId, projectPath, projectName) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, projectPath, projectName, lastActivity: Date.now() }
              : t
          ),
        }));
      },

      setTabSubagent: (tabId, subagentId, subagentName) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? { ...t, subagentId, subagentName }
              : t
          ),
        }));
      },
    }),
    {
      name: 'claudearcade-terminals',
      version: 2, // Increment when schema changes
      partialize: (state) => ({
        // Only persist tab metadata, not connection state
        tabs: state.tabs.map((t) => ({
          ...t,
          ptyId: null,
          isConnected: false,
          status: 'disconnected' as InstanceStatus,
          currentTask: '',
        })),
        activeTabId: state.activeTabId,
        maxTabs: state.maxTabs,
      }),
      // Migrate old persisted data to include new fields
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { tabs?: TerminalTab[]; activeTabId?: string | null; maxTabs?: number };

        if (version < 2 && state?.tabs) {
          // Migrate tabs to include new fields
          state.tabs = state.tabs.map((t, i) => ({
            ...t,
            status: t.status || ('disconnected' as InstanceStatus),
            currentTask: t.currentTask || '',
            contextUsage: t.contextUsage || 0,
            lastActivity: t.lastActivity || Date.now(),
            icon: t.icon || getTabIcon(i),
            loadoutId: t.loadoutId ?? null,
            loadoutName: t.loadoutName ?? null,
            equippedTokens: t.equippedTokens || 0,
            subagentId: t.subagentId ?? null,
            subagentName: t.subagentName ?? null,
          }));
        }

        // Ensure maxTabs has a default value
        if (!state.maxTabs) {
          state.maxTabs = 5;
        }

        return state as TerminalState;
      },
    }
  )
);

// Helper to parse Claude output and detect status
export function parseClaudeOutput(output: string): {
  status?: InstanceStatus;
  task?: string;
} {
  const result: { status?: InstanceStatus; task?: string } = {};

  // Detect thinking/working state
  if (output.includes('Thinking') || output.includes('...')) {
    result.status = 'working';
  }

  // Detect waiting for input
  if (output.match(/[$>]\s*$/)) {
    result.status = 'idle';
  }

  // Detect errors
  if (output.includes('Error') || output.includes('error:') || output.includes('failed')) {
    result.status = 'error';
  }

  // Try to extract task description
  const taskMatch = output.match(/(?:I'll|Let me|I'm going to|I will)\s+([^.]+)/i);
  if (taskMatch) {
    result.task = taskMatch[1].slice(0, 50) + (taskMatch[1].length > 50 ? '...' : '');
  }

  return result;
}
