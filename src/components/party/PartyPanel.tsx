import { useState, useRef, useEffect, useMemo } from 'react';
import { useTerminalStore, InstanceStatus, TerminalTab } from '../../stores/terminalStore';
import { useAppStore } from '../../stores/appStore';
import { useBuildStore } from '../../stores/buildStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useProjectRegistryStore, selectSortedProjects } from '../../stores/projectRegistryStore';
import { CONTEXT_BUDGET, CONTEXT_THRESHOLDS } from '../../types';
import { PROJECT_TYPE_INFO, hasClaudeConfiguration } from '../../types/project';
import type { RegisteredProject } from '../../types';

const STATUS_CONFIG: Record<InstanceStatus, { color: string; label: string; glow: string }> = {
  idle: { color: '#4ade80', label: 'Ready', glow: '0 0 6px #4ade80' },
  working: { color: '#fbbf24', label: 'Working', glow: '0 0 6px #fbbf24' },
  waiting: { color: '#60a5fa', label: 'Waiting', glow: '0 0 6px #60a5fa' },
  error: { color: '#f87171', label: 'Error', glow: '0 0 6px #f87171' },
  disconnected: { color: '#71717a', label: 'Offline', glow: 'none' },
};

interface PartyMemberProps {
  tab: TerminalTab;
  isActive: boolean;
  onClick: () => void;
  onRename: (newName: string) => void;
  onRes: () => void; // "Resurrect" - compact/reset context
  onSetLoadout: (loadoutId: string | null, loadoutName: string | null, tokens: number) => void;
  onSetSubagent: (subagentId: string | null, subagentName: string | null) => void;
  onSetProject: (projectPath: string | null, projectName: string | null) => void;
  availableLoadouts: { id: string; name: string; tokens: number }[];
  availableSubagents: { id: string; name: string; description: string }[];
  availableProjects: RegisteredProject[];
}

// Get health status based on context usage percentage
function getHealthStatus(contextUsage: number): { color: string; label: string; percentage: number } {
  const percentage = contextUsage / CONTEXT_BUDGET;

  if (percentage >= CONTEXT_THRESHOLDS.heavy) {
    // Dumbzone - critically low health
    return { color: '#ef4444', label: 'Critical', percentage };
  } else if (percentage >= CONTEXT_THRESHOLDS.healthy) {
    // Heavy usage - low health
    return { color: '#eab308', label: 'Weakened', percentage };
  } else if (percentage > 0.1) {
    // Some usage - healthy
    return { color: '#4ade80', label: 'Healthy', percentage };
  }
  // Fresh/full health
  return { color: '#22c55e', label: 'Full', percentage };
}

function PartyMember({ tab, isActive, onClick, onRename, onRes, onSetLoadout, onSetSubagent, onSetProject, availableLoadouts, availableSubagents, availableProjects }: PartyMemberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  const [showLoadoutMenu, setShowLoadoutMenu] = useState(false);
  const [showSubagentMenu, setShowSubagentMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadoutMenuRef = useRef<HTMLDivElement>(null);
  const subagentMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close loadout menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (loadoutMenuRef.current && !loadoutMenuRef.current.contains(e.target as Node)) {
        setShowLoadoutMenu(false);
      }
    };
    if (showLoadoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLoadoutMenu]);

  // Close subagent menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subagentMenuRef.current && !subagentMenuRef.current.contains(e.target as Node)) {
        setShowSubagentMenu(false);
      }
    };
    if (showSubagentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSubagentMenu]);

  // Close project menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false);
      }
    };
    if (showProjectMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProjectMenu]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(tab.name);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== tab.name) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditName(tab.name);
      setIsEditing(false);
    }
  };
  // Safely access fields with defaults for old persisted data
  const status = tab.status || 'disconnected';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
  const lastActivity = tab.lastActivity || Date.now();
  const timeSinceActivity = Date.now() - lastActivity;
  const isRecent = timeSinceActivity < 60000; // Active in last minute
  const icon = tab.icon || 'I';
  const contextUsage = tab.contextUsage || 0;
  const healthStatus = getHealthStatus(contextUsage);
  const healthPercentage = Math.min(100, healthStatus.percentage * 100);
  const needsRes = healthStatus.percentage >= CONTEXT_THRESHOLDS.heavy;
  // Subagent fields (added later, may be missing from persisted data)
  const subagentId = tab.subagentId ?? null;
  const subagentName = tab.subagentName ?? null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="w-full flex items-center gap-3 p-2 rounded-lg transition-all group cursor-pointer"
      style={{
        background: isActive
          ? 'linear-gradient(180deg, rgba(201, 162, 39, 0.15) 0%, rgba(201, 162, 39, 0.05) 100%)'
          : 'var(--bg-tertiary)',
        border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
      }}
    >
      {/* Avatar/Icon */}
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-lg font-bold shrink-0 relative"
        style={{
          background: 'linear-gradient(135deg, #3f362c 0%, #2d261e 100%)',
          border: `2px solid ${statusConfig.color}50`,
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        {icon}
        {/* Status dot */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
          style={{
            background: statusConfig.color,
            boxShadow: statusConfig.glow,
            border: '2px solid var(--bg-tertiary)',
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="font-medium text-sm bg-transparent border-b outline-none w-full"
              style={{
                color: 'var(--accent)',
                borderColor: 'var(--accent)',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="font-medium text-sm truncate cursor-text"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
              onDoubleClick={handleDoubleClick}
              title="Double-click to rename"
            >
              {tab.name}
            </span>
          )}
          {!isEditing && tab.isConnected && isRecent && (
            <span
              className="text-[9px] px-1 rounded"
              style={{
                background: `${statusConfig.color}20`,
                color: statusConfig.color,
              }}
            >
              {statusConfig.label}
            </span>
          )}
        </div>

        {/* Current task or project */}
        <div
          className="text-[10px] truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {tab.currentTask || tab.projectName || 'No active task'}
        </div>

        {/* Loadout selector */}
        <div className="relative mt-0.5" ref={loadoutMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLoadoutMenu(!showLoadoutMenu);
            }}
            className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-all hover:opacity-80"
            style={{
              background: tab.loadoutName ? 'rgba(201, 162, 39, 0.15)' : 'var(--bg-primary)',
              color: tab.loadoutName ? 'var(--accent)' : 'var(--text-secondary)',
              border: tab.loadoutName ? '1px solid rgba(201, 162, 39, 0.3)' : '1px solid var(--bg-tertiary)',
            }}
            title={tab.loadoutName ? `Loadout: ${tab.loadoutName} (${(tab.equippedTokens / 1000).toFixed(1)}K tokens)` : 'Assign loadout'}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            {tab.loadoutName || 'No loadout'}
            <svg className="w-2 h-2 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Loadout dropdown menu */}
          {showLoadoutMenu && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded shadow-lg overflow-hidden min-w-[140px]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            >
              {/* Clear option */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetLoadout(null, null, 0);
                  setShowLoadoutMenu(false);
                }}
                className="w-full px-2 py-1.5 text-left text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                None
              </button>
              {/* Loadout options */}
              {availableLoadouts.map((loadout) => (
                <button
                  key={loadout.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetLoadout(loadout.id, loadout.name, loadout.tokens);
                    setShowLoadoutMenu(false);
                  }}
                  className="w-full px-2 py-1.5 text-left text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between"
                  style={{
                    color: tab.loadoutId === loadout.id ? 'var(--accent)' : 'var(--text-primary)',
                    background: tab.loadoutId === loadout.id ? 'rgba(201, 162, 39, 0.1)' : undefined,
                  }}
                >
                  <span className="truncate">{loadout.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{(loadout.tokens / 1000).toFixed(0)}K</span>
                </button>
              ))}
              {availableLoadouts.length === 0 && (
                <div className="px-2 py-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  No saved loadouts
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subagent selector */}
        <div className="relative mt-0.5" ref={subagentMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSubagentMenu(!showSubagentMenu);
            }}
            className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-all hover:opacity-80"
            style={{
              background: subagentName ? 'rgba(96, 165, 250, 0.15)' : 'var(--bg-primary)',
              color: subagentName ? '#60a5fa' : 'var(--text-secondary)',
              border: subagentName ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid var(--bg-tertiary)',
            }}
            title={subagentName ? `Subagent: ${subagentName}` : 'Assign subagent personality'}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            {subagentName || 'No agent'}
            <svg className="w-2 h-2 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Subagent dropdown menu */}
          {showSubagentMenu && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded shadow-lg overflow-hidden min-w-[160px]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            >
              {/* Clear option */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetSubagent(null, null);
                  setShowSubagentMenu(false);
                }}
                className="w-full px-2 py-1.5 text-left text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                None (Main Claude)
              </button>
              {/* Subagent options */}
              {availableSubagents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetSubagent(agent.id, agent.name);
                    setShowSubagentMenu(false);
                  }}
                  className="w-full px-2 py-1.5 text-left text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{
                    color: subagentId === agent.id ? '#60a5fa' : 'var(--text-primary)',
                    background: subagentId === agent.id ? 'rgba(96, 165, 250, 0.1)' : undefined,
                  }}
                  title={agent.description}
                >
                  <span className="truncate block">{agent.name}</span>
                </button>
              ))}
              {availableSubagents.length === 0 && (
                <div className="px-2 py-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  No agents in ~/.claude/agents/
                </div>
              )}
            </div>
          )}
        </div>

        {/* Project selector */}
        <div className="relative mt-0.5" ref={projectMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowProjectMenu(!showProjectMenu);
            }}
            className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 transition-all hover:opacity-80"
            style={{
              background: tab.projectPath ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-primary)',
              color: tab.projectPath ? '#22c55e' : 'var(--text-secondary)',
              border: tab.projectPath ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--bg-tertiary)',
            }}
            title={tab.projectPath ? `Project: ${tab.projectPath}` : 'Assign project folder'}
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
            {tab.projectName || 'No project'}
            <svg className="w-2 h-2 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Project dropdown menu */}
          {showProjectMenu && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded shadow-lg overflow-hidden min-w-[180px] max-h-[200px] overflow-y-auto"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            >
              {/* Clear option */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetProject(null, null);
                  setShowProjectMenu(false);
                }}
                className="w-full px-2 py-1.5 text-left text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                None
              </button>
              {/* Project options */}
              {availableProjects.map((project) => {
                const typeInfo = PROJECT_TYPE_INFO[project.type] || PROJECT_TYPE_INFO.generic;
                const hasClaude = hasClaudeConfiguration(project.claudeItems);
                const isSelected = tab.projectPath === project.path;

                return (
                  <button
                    key={project.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetProject(project.path, project.name);
                      setShowProjectMenu(false);
                    }}
                    className="w-full px-2 py-1.5 text-left text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-1.5"
                    style={{
                      color: isSelected ? '#22c55e' : 'var(--text-primary)',
                      background: isSelected ? 'rgba(34, 197, 94, 0.1)' : undefined,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                      style={{ background: typeInfo.color + '20', color: typeInfo.color }}
                    >
                      {typeInfo.icon}
                    </span>
                    <span className="truncate flex-1">{project.name}</span>
                    {hasClaude && (
                      <span
                        className="text-[8px] px-1 rounded shrink-0"
                        style={{ background: '#22c55e20', color: '#22c55e' }}
                      >
                        .c
                      </span>
                    )}
                  </button>
                );
              })}
              {availableProjects.length === 0 && (
                <div className="px-2 py-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  No registered projects
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Health bar (context as HP) */}
      <div className="shrink-0 flex items-center gap-2">
        <div className="w-16">
          {/* HP Bar */}
          <div
            className="h-2 rounded-full overflow-hidden relative"
            style={{
              background: 'var(--bg-primary)',
              border: `1px solid ${healthStatus.color}40`,
            }}
            title={`${healthStatus.label}: ${(contextUsage / 1000).toFixed(1)}K / ${(CONTEXT_BUDGET / 1000)}K tokens`}
          >
            {/* Remaining HP (inverted - lower usage = more HP) */}
            <div
              className="absolute h-full transition-all duration-300"
              style={{
                width: `${100 - healthPercentage}%`,
                background: `linear-gradient(90deg, ${healthStatus.color} 0%, ${healthStatus.color}80 100%)`,
                boxShadow: `0 0 4px ${healthStatus.color}40`,
              }}
            />
          </div>
          <div className="flex justify-between text-[8px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: healthStatus.color }}>{healthStatus.label}</span>
            <span>{Math.round(100 - healthPercentage)}%</span>
          </div>
        </div>

        {/* Res button - only show when in dumbzone */}
        {needsRes && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRes();
            }}
            className="px-1.5 py-0.5 rounded text-[9px] font-bold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff',
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
              border: '1px solid #4ade80',
            }}
            title="Resurrect: Compact context to restore health"
          >
            RES
          </button>
        )}
      </div>
    </div>
  );
}

export function PartyPanel() {
  const tabs = useTerminalStore((state) => state.tabs);
  const activeTabId = useTerminalStore((state) => state.activeTabId);
  const setActiveTab = useTerminalStore((state) => state.setActiveTab);
  const addTab = useTerminalStore((state) => state.addTab);
  const canAddTab = useTerminalStore((state) => state.canAddTab);
  const renameTab = useTerminalStore((state) => state.renameTab);
  const resetContextUsage = useTerminalStore((state) => state.resetContextUsage);
  const setTabLoadout = useTerminalStore((state) => state.setTabLoadout);
  const setTabSubagent = useTerminalStore((state) => state.setTabSubagent);
  const updateTabProject = useTerminalStore((state) => state.updateTabProject);
  const setRightPanelMode = useAppStore((state) => state.setRightPanelMode);
  const inventory = useAppStore((state) => state.inventory);
  const getBuildsWithPresets = useBuildStore((state) => state.getBuildsWithPresets);
  const openWorkflowEditor = useWorkflowStore((state) => state.openEditor);

  // Get registered projects
  const registeredProjects = useProjectRegistryStore((state) => state.registeredProjects);
  const availableProjects = useMemo(
    () => selectSortedProjects({ registeredProjects, isScanning: false, lastError: null }),
    [registeredProjects]
  );

  // Get available loadouts for selection
  const availableLoadouts = getBuildsWithPresets().map((build) => ({
    id: build.id,
    name: build.name,
    tokens: build.totalTokens,
  }));

  // Get available subagents (companion type items from inventory)
  const availableSubagents = inventory
    .filter((item) => item.itemType === 'companion')
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
    }));

  const handleMemberClick = (tabId: string) => {
    setActiveTab(tabId);
    setRightPanelMode('terminal');
  };

  const handleAddMember = () => {
    if (canAddTab()) {
      addTab();
      setRightPanelMode('terminal');
    }
  };

  // Calculate party stats with safe defaults
  const connectedCount = tabs.filter((t) => t.isConnected).length;
  const workingCount = tabs.filter((t) => (t.status || 'disconnected') === 'working').length;
  const totalContextUsage = tabs.reduce((sum, t) => sum + (t.contextUsage || 0), 0);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--accent)' }}
          >
            Party
          </h3>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            {connectedCount}/{tabs.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Workflow button */}
          <button
            onClick={() => openWorkflowEditor()}
            className="p-1 rounded transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
              color: '#a78bfa',
              border: '1px solid rgba(147, 51, 234, 0.3)',
            }}
            title="Open Workflow Editor (Cmd+W)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 17h6M17 14v6" />
            </svg>
          </button>

          {/* Add member button */}
          {canAddTab() && (
            <button
              onClick={handleAddMember}
              className="p-1 rounded transition-all"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
              title="Add Claude Instance"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Party stats summary */}
      {(workingCount > 0 || totalContextUsage > 0) && (
        <div
          className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded text-[10px]"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--bg-tertiary)',
          }}
        >
          {workingCount > 0 && (
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#fbbf24' }}
              />
              <span style={{ color: '#fbbf24' }}>{workingCount} working</span>
            </div>
          )}
          {totalContextUsage > 0 && (
            <div style={{ color: 'var(--text-secondary)' }}>
              {(totalContextUsage / 1000).toFixed(1)}K total tokens
            </div>
          )}
        </div>
      )}

      {/* Party members */}
      <div className="space-y-1.5">
        {tabs.map((tab) => (
          <PartyMember
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onClick={() => handleMemberClick(tab.id)}
            onRename={(newName) => renameTab(tab.id, newName)}
            onRes={() => resetContextUsage(tab.id)}
            onSetLoadout={(loadoutId, loadoutName, tokens) => setTabLoadout(tab.id, loadoutId, loadoutName, tokens)}
            onSetSubagent={(subagentId, subagentName) => setTabSubagent(tab.id, subagentId, subagentName)}
            onSetProject={(projectPath, projectName) => updateTabProject(tab.id, projectPath, projectName)}
            availableLoadouts={availableLoadouts}
            availableSubagents={availableSubagents}
            availableProjects={availableProjects}
          />
        ))}
      </div>
    </div>
  );
}
