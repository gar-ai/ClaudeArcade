import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProjectRegistryStore } from './projectRegistryStore';

interface ProjectState {
  // Current active project
  projectPath: string | null;
  projectName: string | null;

  // Recent projects (last 10)
  recentProjects: Array<{
    path: string;
    name: string;
    lastOpened: number;
  }>;

  // Terminal should auto-start claude
  autoStartClaude: boolean;

  // UI state for keyboard shortcut access
  showProjectPicker: boolean;
}

interface ProjectActions {
  setProject: (path: string | null) => void;
  addRecentProject: (path: string) => void;
  removeRecentProject: (path: string) => void;
  clearRecentProjects: () => void;
  setAutoStartClaude: (enabled: boolean) => void;
  setShowProjectPicker: (show: boolean) => void;
}

function getProjectName(path: string): string {
  // Extract folder name from path
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  persist(
    (set, get) => ({
      // Initial state
      projectPath: null,
      projectName: null,
      recentProjects: [],
      autoStartClaude: true, // Default to auto-start
      showProjectPicker: false,

      // Actions
      setProject: (path) => {
        if (path) {
          const name = getProjectName(path);
          // Also add to recent projects
          get().addRecentProject(path);
          set({ projectPath: path, projectName: name });

          // Auto-register in project registry (async, non-blocking)
          useProjectRegistryStore.getState().onProjectOpened(path).catch(console.error);
        } else {
          set({ projectPath: null, projectName: null });
        }
      },

      addRecentProject: (path) => {
        const name = getProjectName(path);
        const now = Date.now();

        set((state) => {
          // Remove if already exists (will re-add at top)
          const filtered = state.recentProjects.filter((p) => p.path !== path);

          // Add to beginning, keep last 10
          const updated = [
            { path, name, lastOpened: now },
            ...filtered,
          ].slice(0, 10);

          return { recentProjects: updated };
        });
      },

      removeRecentProject: (path) => {
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.path !== path),
        }));
      },

      clearRecentProjects: () => {
        set({ recentProjects: [] });
      },

      setAutoStartClaude: (enabled) => {
        set({ autoStartClaude: enabled });
      },

      setShowProjectPicker: (show) => {
        set({ showProjectPicker: show });
      },
    }),
    {
      name: 'claudearcade-project',
      partialize: (state) => ({
        projectPath: state.projectPath,
        projectName: state.projectName,
        recentProjects: state.recentProjects,
        autoStartClaude: state.autoStartClaude,
      }),
    }
  )
);
