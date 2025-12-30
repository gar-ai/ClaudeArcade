/**
 * Project Manager - Manage registered projects with Claude configuration
 */

import { useState, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useProjectRegistryStore, selectSortedProjects, selectAllTags } from '../../stores/projectRegistryStore';
import { useProjectStore } from '../../stores/projectStore';
import { PROJECT_TYPE_INFO, hasClaudeConfiguration, getTotalItemCount } from '../../types/project';
import type { RegisteredProject } from '../../types';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectManager({ isOpen, onClose }: ProjectManagerProps) {
  const [editingProject, setEditingProject] = useState<RegisteredProject | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showOnlyWithClaude, setShowOnlyWithClaude] = useState(false);

  // Registry store
  const registeredProjects = useProjectRegistryStore((state) => state.registeredProjects);
  const isScanning = useProjectRegistryStore((state) => state.isScanning);
  const registerProject = useProjectRegistryStore((state) => state.registerProject);
  const unregisterProject = useProjectRegistryStore((state) => state.unregisterProject);
  const updateProject = useProjectRegistryStore((state) => state.updateProject);
  const rescanProject = useProjectRegistryStore((state) => state.rescanProject);

  // Project store (for setting active project)
  const setProject = useProjectStore((state) => state.setProject);
  const currentProjectPath = useProjectStore((state) => state.projectPath);

  // Computed values
  const sortedProjects = useMemo(() => selectSortedProjects({ registeredProjects, isScanning, lastError: null }), [registeredProjects]);
  const allTags = useMemo(() => selectAllTags({ registeredProjects, isScanning, lastError: null }), [registeredProjects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let projects = sortedProjects;
    if (filterTag) {
      projects = projects.filter(p => p.tags.includes(filterTag));
    }
    if (showOnlyWithClaude) {
      projects = projects.filter(p => hasClaudeConfiguration(p.claudeItems));
    }
    return projects;
  }, [sortedProjects, filterTag, showOnlyWithClaude]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleAddProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder',
      });

      if (selected && typeof selected === 'string') {
        await registerProject(selected);
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  const handleOpenProject = (project: RegisteredProject) => {
    setProject(project.path);
    onClose();
  };

  const handleEditProject = (project: RegisteredProject) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditNotes(project.notes);
    setEditTags(project.tags.join(', '));
  };

  const handleSaveEdit = () => {
    if (!editingProject) return;

    const tags = editTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    updateProject(editingProject.id, {
      name: editName,
      notes: editNotes,
      tags,
    });
    setEditingProject(null);
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
  };

  const handleRemoveProject = (id: string) => {
    if (confirm('Remove this project from the registry? (The folder will not be deleted)')) {
      unregisterProject(id);
    }
  };

  const handleRescan = async (id: string) => {
    await rescanProject(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] rounded-lg overflow-hidden flex flex-col"
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
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
              Project Registry
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {registeredProjects.length} registered project{registeredProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
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

        {/* Toolbar */}
        <div
          className="px-4 py-2 flex items-center gap-2 shrink-0"
          style={{ borderBottom: '1px solid var(--bg-tertiary)' }}
        >
          <button
            onClick={handleAddProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Project
          </button>

          {/* Filter by tag */}
          {allTags.length > 0 && (
            <select
              value={filterTag || ''}
              onChange={(e) => setFilterTag(e.target.value || null)}
              className="px-2 py-1.5 rounded text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                border: 'none',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          {/* Claude filter */}
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={showOnlyWithClaude}
              onChange={(e) => setShowOnlyWithClaude(e.target.checked)}
              className="rounded"
            />
            .claude only
          </label>

          {/* Scanning indicator */}
          {isScanning && (
            <span className="text-xs animate-pulse" style={{ color: 'var(--accent)' }}>
              Scanning...
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {editingProject ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Project Name
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
                  placeholder="Enter project name..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  placeholder="work, frontend, react..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm resize-none"
                  rows={3}
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  placeholder="Add notes about this project..."
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
            <div className="space-y-2">
              {filteredProjects.length === 0 ? (
                <div
                  className="text-center py-12 rounded"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <p className="text-sm">No projects registered</p>
                  <p className="text-xs mt-1">Click "Add Project" to register a project folder</p>
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isActive={project.path === currentProjectPath}
                    onOpen={() => handleOpenProject(project)}
                    onEdit={() => handleEditProject(project)}
                    onRemove={() => handleRemoveProject(project.id)}
                    onRescan={() => handleRescan(project.id)}
                    isScanning={isScanning}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: RegisteredProject;
  isActive: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onRescan: () => void;
  isScanning: boolean;
}

function ProjectCard({ project, isActive, onOpen, onEdit, onRemove, onRescan, isScanning }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  const typeInfo = PROJECT_TYPE_INFO[project.type] || PROJECT_TYPE_INFO.generic;
  const hasClaude = hasClaudeConfiguration(project.claudeItems);
  const itemCount = getTotalItemCount(project.claudeItems);

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{
        background: isActive ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--bg-tertiary)',
        border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
      }}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Type Badge */}
        <div
          className="w-10 h-10 rounded flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: typeInfo.color + '20', color: typeInfo.color }}
        >
          {typeInfo.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-medium truncate"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {project.name}
            </span>
            {hasClaude && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: '#22c55e20', color: '#22c55e' }}
                title={`${itemCount} Claude item${itemCount !== 1 ? 's' : ''}`}
              >
                .claude
              </span>
            )}
            {project.tags.map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="truncate" title={project.path}>{project.path}</span>
            <span>•</span>
            <span>{project.openCount}x</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {hasClaude && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Show Claude items"
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
          <button
            onClick={onOpen}
            className="px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
              color: isActive ? 'var(--bg-primary)' : 'var(--text-primary)',
            }}
          >
            {isActive ? 'Active' : 'Open'}
          </button>
          <button
            onClick={onRescan}
            disabled={isScanning}
            className="p-1.5 rounded transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
            title="Rescan .claude folder"
          >
            <svg className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Edit project"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Remove from registry"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Claude Items */}
      {expanded && hasClaude && (
        <div
          className="px-3 pb-3 pt-0"
          style={{ borderTop: '1px solid var(--bg-secondary)' }}
        >
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            {project.claudeItems.hasClaudeMd && (
              <div className="flex items-center gap-1.5 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <span style={{ color: 'var(--accent)' }}>CLAUDE.md</span>
              </div>
            )}
            {project.claudeItems.commandCount > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <span style={{ color: '#60a5fa' }}>{project.claudeItems.commandCount} Commands</span>
              </div>
            )}
            {project.claudeItems.skillCount > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <span style={{ color: '#a78bfa' }}>{project.claudeItems.skillCount} Skills</span>
              </div>
            )}
            {project.claudeItems.subagentCount > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <span style={{ color: '#f472b6' }}>{project.claudeItems.subagentCount} Agents</span>
              </div>
            )}
            {project.claudeItems.hookCount > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <span style={{ color: '#fbbf24' }}>{project.claudeItems.hookCount} Hooks</span>
              </div>
            )}
            {project.claudeItems.mcpCount > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <span style={{ color: '#34d399' }}>{project.claudeItems.mcpCount} MCP Servers</span>
              </div>
            )}
          </div>

          {/* Token estimate */}
          {project.claudeItems.totalTokenEstimate > 0 && (
            <div className="mt-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              Est. {project.claudeItems.totalTokenEstimate.toLocaleString()} tokens in .claude/
            </div>
          )}

          {/* Item lists */}
          {project.claudeItems.commands.length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Commands:</span>
              <span className="text-[10px] ml-1" style={{ color: 'var(--text-primary)' }}>
                {project.claudeItems.commands.join(', ')}
              </span>
            </div>
          )}
          {project.claudeItems.skills.length > 0 && (
            <div className="mt-1">
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Skills:</span>
              <span className="text-[10px] ml-1" style={{ color: 'var(--text-primary)' }}>
                {project.claudeItems.skills.join(', ')}
              </span>
            </div>
          )}
          {project.claudeItems.subagents.length > 0 && (
            <div className="mt-1">
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Agents:</span>
              <span className="text-[10px] ml-1" style={{ color: 'var(--text-primary)' }}>
                {project.claudeItems.subagents.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
