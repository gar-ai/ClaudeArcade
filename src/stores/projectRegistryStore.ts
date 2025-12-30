/**
 * Project Registry Store
 * Manages registered projects with their Claude configuration metadata
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type {
  RegisteredProject,
  ProjectScanResult,
  ProjectType,
} from '../types';
import {
  generateProjectId,
  extractProjectName,
  EMPTY_CLAUDE_ITEMS,
} from '../types/project';

interface ProjectRegistryState {
  registeredProjects: RegisteredProject[];
  isScanning: boolean;
  lastError: string | null;
}

interface ProjectRegistryActions {
  // Registration
  registerProject: (path: string) => Promise<RegisteredProject>;
  unregisterProject: (id: string) => void;

  // Updates
  updateProject: (id: string, updates: Partial<Pick<RegisteredProject, 'tags' | 'notes' | 'name'>>) => void;
  rescanProject: (id: string) => Promise<void>;

  // Auto-registration hook (called when project is opened)
  onProjectOpened: (path: string) => Promise<void>;

  // Queries
  getProject: (id: string) => RegisteredProject | undefined;
  getProjectByPath: (path: string) => RegisteredProject | undefined;
  getProjectsWithClaude: () => RegisteredProject[];
  getProjectsByTag: (tag: string) => RegisteredProject[];

  // Bulk operations
  rescanAllProjects: () => Promise<void>;
  clearRegistry: () => void;
}

/**
 * Scan a project's .claude folder via Tauri backend
 */
async function scanProject(path: string): Promise<ProjectScanResult> {
  return invoke<ProjectScanResult>('scan_project_claude_items', { path });
}

export const useProjectRegistryStore = create<ProjectRegistryState & ProjectRegistryActions>()(
  persist(
    (set, get) => ({
      // Initial state
      registeredProjects: [],
      isScanning: false,
      lastError: null,

      // Register a new project
      registerProject: async (path: string) => {
        const { registeredProjects } = get();

        // Check if already registered
        const existing = registeredProjects.find(p => p.path === path);
        if (existing) {
          // Update lastOpened and openCount
          set({
            registeredProjects: registeredProjects.map(p =>
              p.id === existing.id
                ? { ...p, lastOpened: Date.now(), openCount: p.openCount + 1 }
                : p
            ),
          });
          return existing;
        }

        set({ isScanning: true, lastError: null });

        try {
          const scanResult = await scanProject(path);

          const newProject: RegisteredProject = {
            id: generateProjectId(path),
            path,
            name: extractProjectName(path),
            type: scanResult.projectType as ProjectType,
            tags: [],
            notes: '',
            claudeItems: scanResult.claudeItems,
            createdAt: Date.now(),
            lastOpened: Date.now(),
            openCount: 1,
          };

          set((state) => ({
            registeredProjects: [...state.registeredProjects, newProject],
            isScanning: false,
          }));

          return newProject;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to scan project';
          set({ isScanning: false, lastError: errorMessage });

          // Still register but with empty claude items
          const newProject: RegisteredProject = {
            id: generateProjectId(path),
            path,
            name: extractProjectName(path),
            type: 'generic',
            tags: [],
            notes: '',
            claudeItems: EMPTY_CLAUDE_ITEMS,
            createdAt: Date.now(),
            lastOpened: Date.now(),
            openCount: 1,
          };

          set((state) => ({
            registeredProjects: [...state.registeredProjects, newProject],
          }));

          return newProject;
        }
      },

      // Unregister a project
      unregisterProject: (id: string) => {
        set((state) => ({
          registeredProjects: state.registeredProjects.filter(p => p.id !== id),
        }));
      },

      // Update project metadata
      updateProject: (id: string, updates) => {
        set((state) => ({
          registeredProjects: state.registeredProjects.map(p =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      // Rescan a project's .claude folder
      rescanProject: async (id: string) => {
        const { registeredProjects } = get();
        const project = registeredProjects.find(p => p.id === id);
        if (!project) return;

        set({ isScanning: true, lastError: null });

        try {
          const scanResult = await scanProject(project.path);

          set((state) => ({
            registeredProjects: state.registeredProjects.map(p =>
              p.id === id
                ? {
                    ...p,
                    type: scanResult.projectType as ProjectType,
                    claudeItems: scanResult.claudeItems,
                  }
                : p
            ),
            isScanning: false,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to rescan project';
          set({ isScanning: false, lastError: errorMessage });
        }
      },

      // Auto-registration hook
      onProjectOpened: async (path: string) => {
        const { registeredProjects, registerProject, rescanProject } = get();

        const existing = registeredProjects.find(p => p.path === path);
        if (existing) {
          // Update lastOpened and openCount
          set((state) => ({
            registeredProjects: state.registeredProjects.map(p =>
              p.id === existing.id
                ? { ...p, lastOpened: Date.now(), openCount: p.openCount + 1 }
                : p
            ),
          }));

          // Rescan to catch any changes
          await rescanProject(existing.id);
        } else {
          // Register new project
          await registerProject(path);
        }
      },

      // Get project by ID
      getProject: (id: string) => {
        return get().registeredProjects.find(p => p.id === id);
      },

      // Get project by path
      getProjectByPath: (path: string) => {
        return get().registeredProjects.find(p => p.path === path);
      },

      // Get projects that have Claude configuration
      getProjectsWithClaude: () => {
        return get().registeredProjects.filter(p =>
          p.claudeItems.hasClaudeFolder ||
          p.claudeItems.hasClaudeMd ||
          p.claudeItems.commandCount > 0 ||
          p.claudeItems.skillCount > 0 ||
          p.claudeItems.hookCount > 0 ||
          p.claudeItems.subagentCount > 0 ||
          p.claudeItems.mcpCount > 0
        );
      },

      // Get projects by tag
      getProjectsByTag: (tag: string) => {
        return get().registeredProjects.filter(p => p.tags.includes(tag));
      },

      // Rescan all registered projects
      rescanAllProjects: async () => {
        const { registeredProjects, rescanProject } = get();

        set({ isScanning: true });

        for (const project of registeredProjects) {
          await rescanProject(project.id);
        }

        set({ isScanning: false });
      },

      // Clear the entire registry
      clearRegistry: () => {
        set({ registeredProjects: [], lastError: null });
      },
    }),
    {
      name: 'claudearcade-project-registry',
      partialize: (state) => ({
        registeredProjects: state.registeredProjects,
      }),
    }
  )
);

// Selector for sorted projects (most recently opened first)
export const selectSortedProjects = (state: ProjectRegistryState) =>
  [...state.registeredProjects].sort((a, b) => b.lastOpened - a.lastOpened);

// Selector for projects with tags
export const selectAllTags = (state: ProjectRegistryState): string[] => {
  const tags = new Set<string>();
  state.registeredProjects.forEach(p => p.tags.forEach(t => tags.add(t)));
  return Array.from(tags).sort();
};
