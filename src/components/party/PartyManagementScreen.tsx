import { useState, useRef, useEffect } from 'react';
import { useTerminalStore, InstanceStatus, TerminalTab } from '../../stores/terminalStore';
import { useAppStore } from '../../stores/appStore';
import { useProjectStore } from '../../stores/projectStore';
import { CONTEXT_BUDGET, CONTEXT_THRESHOLDS } from '../../types';

const STATUS_CONFIG: Record<InstanceStatus, { color: string; label: string; glow: string; icon: string }> = {
  idle: { color: '#4ade80', label: 'Ready', glow: '0 0 8px #4ade80', icon: '●' },
  working: { color: '#fbbf24', label: 'Working', glow: '0 0 8px #fbbf24', icon: '◐' },
  waiting: { color: '#60a5fa', label: 'Waiting', glow: '0 0 8px #60a5fa', icon: '◌' },
  error: { color: '#f87171', label: 'Error', glow: '0 0 8px #f87171', icon: '✕' },
  disconnected: { color: '#71717a', label: 'Offline', glow: 'none', icon: '○' },
};

function getHealthStatus(contextUsage: number): { color: string; label: string; percentage: number } {
  const percentage = contextUsage / CONTEXT_BUDGET;

  if (percentage >= CONTEXT_THRESHOLDS.heavy) {
    return { color: '#ef4444', label: 'Critical', percentage };
  } else if (percentage >= CONTEXT_THRESHOLDS.healthy) {
    return { color: '#eab308', label: 'Weakened', percentage };
  } else if (percentage > 0.1) {
    return { color: '#4ade80', label: 'Healthy', percentage };
  }
  return { color: '#22c55e', label: 'Full', percentage };
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface PartyMemberCardProps {
  tab: TerminalTab;
  isActive: boolean;
  onFocus: () => void;
  onRename: (newName: string) => void;
  onRes: () => void;
  onKill: () => void;
  onChangeProject: () => void;
}

function PartyMemberCard({
  tab,
  isActive,
  onFocus,
  onRename,
  onRes,
  onKill,
  onChangeProject,
}: PartyMemberCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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

  const status = tab.status || 'disconnected';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
  const contextUsage = tab.contextUsage || 0;
  const healthStatus = getHealthStatus(contextUsage);
  const healthPercentage = Math.min(100, healthStatus.percentage * 100);
  const needsRes = healthStatus.percentage >= CONTEXT_THRESHOLDS.heavy;
  const lastActivity = tab.lastActivity || Date.now();

  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        background: isActive
          ? 'linear-gradient(180deg, rgba(201, 162, 39, 0.12) 0%, rgba(201, 162, 39, 0.04) 100%)'
          : 'var(--bg-secondary)',
        border: isActive ? '2px solid var(--accent)' : '2px solid var(--bg-tertiary)',
        boxShadow: isActive ? '0 0 16px rgba(201, 162, 39, 0.15)' : 'none',
      }}
    >
      {/* Header with icon and name */}
      <div className="flex items-start gap-3 mb-4">
        {/* Large Avatar */}
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold relative shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3f362c 0%, #2d261e 100%)',
            border: `3px solid ${statusConfig.color}50`,
            color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          }}
        >
          {tab.icon || 'I'}
          {/* Status indicator */}
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
            style={{
              background: 'var(--bg-secondary)',
              border: `2px solid ${statusConfig.color}`,
              color: statusConfig.color,
              boxShadow: statusConfig.glow,
            }}
          >
            {statusConfig.icon}
          </div>
        </div>

        {/* Name and status */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="font-semibold text-base bg-transparent border-b outline-none w-full mb-1"
              style={{
                color: 'var(--accent)',
                borderColor: 'var(--accent)',
              }}
            />
          ) : (
            <h4
              className="font-semibold text-base truncate cursor-text mb-1"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}
              onDoubleClick={handleDoubleClick}
              title="Double-click to rename"
            >
              {tab.name}
            </h4>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: `${statusConfig.color}20`,
                color: statusConfig.color,
                border: `1px solid ${statusConfig.color}40`,
              }}
            >
              {statusConfig.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formatTimeAgo(lastActivity)}
            </span>
          </div>
        </div>
      </div>

      {/* Project info */}
      <div className="mb-4">
        <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
          Project
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--bg-tertiary)',
          }}
        >
          <svg
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--accent)' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span
            className="text-sm truncate flex-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {tab.projectName || tab.projectPath || 'No project selected'}
          </span>
          <button
            onClick={onChangeProject}
            className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            Change
          </button>
        </div>
      </div>

      {/* Current task */}
      {tab.currentTask && (
        <div className="mb-4">
          <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            Current Task
          </div>
          <div
            className="text-sm px-3 py-2 rounded"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            {tab.currentTask}
          </div>
        </div>
      )}

      {/* Health bar (Context as HP) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Context (HP)
          </div>
          <div className="text-xs" style={{ color: healthStatus.color }}>
            {formatTokens(CONTEXT_BUDGET - contextUsage)} / {formatTokens(CONTEXT_BUDGET)}
          </div>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden relative"
          style={{
            background: 'var(--bg-primary)',
            border: `1px solid ${healthStatus.color}40`,
          }}
        >
          {/* Remaining HP (inverted - lower usage = more HP) */}
          <div
            className="absolute h-full transition-all duration-500"
            style={{
              width: `${100 - healthPercentage}%`,
              background: `linear-gradient(90deg, ${healthStatus.color} 0%, ${healthStatus.color}80 100%)`,
              boxShadow: `0 0 8px ${healthStatus.color}40`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span style={{ color: healthStatus.color }}>{healthStatus.label}</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {Math.round(100 - healthPercentage)}% remaining
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFocus}
          className="flex-1 px-3 py-2 rounded text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
            color: 'var(--bg-primary)',
            border: '1px solid var(--accent)',
          }}
        >
          Focus
        </button>

        {needsRes && (
          <button
            onClick={onRes}
            className="px-3 py-2 rounded text-sm font-medium transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff',
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
              border: '1px solid #4ade80',
            }}
            title="Resurrect: Send /compact to restore health"
          >
            RES
          </button>
        )}

        <button
          onClick={onKill}
          className="p-2 rounded transition-all hover:opacity-80"
          style={{
            background: 'var(--bg-tertiary)',
            color: '#f87171',
          }}
          title="Kill this instance"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function PartyManagementScreen() {
  const tabs = useTerminalStore((state) => state.tabs);
  const activeTabId = useTerminalStore((state) => state.activeTabId);
  const setActiveTab = useTerminalStore((state) => state.setActiveTab);
  const addTab = useTerminalStore((state) => state.addTab);
  const closeTab = useTerminalStore((state) => state.closeTab);
  const canAddTab = useTerminalStore((state) => state.canAddTab);
  const renameTab = useTerminalStore((state) => state.renameTab);
  const resetContextUsage = useTerminalStore((state) => state.resetContextUsage);
  const setRightPanelMode = useAppStore((state) => state.setRightPanelMode);
  const setShowProjectPicker = useProjectStore((state) => state.setShowProjectPicker);

  const handleFocus = (tabId: string) => {
    setActiveTab(tabId);
    setRightPanelMode('terminal');
  };

  const handleAddMember = () => {
    if (canAddTab()) {
      addTab();
    }
  };

  const handleChangeProject = (tabId: string) => {
    setActiveTab(tabId);
    setShowProjectPicker(true);
  };

  // Calculate party stats
  const connectedCount = tabs.filter((t) => t.isConnected).length;
  const workingCount = tabs.filter((t) => (t.status || 'disconnected') === 'working').length;
  const totalContextUsage = tabs.reduce((sum, t) => sum + (t.contextUsage || 0), 0);
  const criticalCount = tabs.filter((t) => (t.contextUsage || 0) / CONTEXT_BUDGET >= CONTEXT_THRESHOLDS.heavy).length;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="px-6 py-4 shrink-0"
        style={{
          background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
          borderBottom: '2px solid var(--bg-tertiary)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--accent)' }}
            >
              Party Management
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Manage your Claude instances
            </p>
          </div>

          {canAddTab() && (
            <button
              onClick={handleAddMember}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
                color: 'var(--bg-primary)',
                border: '1px solid var(--accent)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Member
            </button>
          )}
        </div>

        {/* Party stats bar */}
        <div
          className="flex items-center gap-6 px-4 py-3 rounded-lg"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--bg-tertiary)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: connectedCount > 0 ? '#4ade80' : '#71717a' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {connectedCount}/{tabs.length} Online
            </span>
          </div>

          {workingCount > 0 && (
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#fbbf24' }}
              />
              <span className="text-sm" style={{ color: '#fbbf24' }}>
                {workingCount} Working
              </span>
            </div>
          )}

          {criticalCount > 0 && (
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: '#ef4444' }}
              />
              <span className="text-sm" style={{ color: '#ef4444' }}>
                {criticalCount} Critical
              </span>
            </div>
          )}

          <div className="flex-1" />

          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Total: {formatTokens(totalContextUsage)} tokens
          </div>
        </div>
      </div>

      {/* Party member grid */}
      <div className="flex-1 overflow-auto p-6">
        {tabs.length === 0 ? (
          <div
            className="h-full flex flex-col items-center justify-center text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'var(--bg-secondary)',
                border: '2px solid var(--bg-tertiary)',
              }}
            >
              <svg
                className="w-10 h-10"
                style={{ color: 'var(--text-secondary)' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              No Party Members
            </h3>
            <p className="text-sm mb-4">
              Add a Claude instance to get started
            </p>
            <button
              onClick={handleAddMember}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
                color: 'var(--bg-primary)',
                border: '1px solid var(--accent)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add First Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tabs.map((tab) => (
              <PartyMemberCard
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onFocus={() => handleFocus(tab.id)}
                onRename={(newName) => renameTab(tab.id, newName)}
                onRes={() => resetContextUsage(tab.id)}
                onKill={() => closeTab(tab.id)}
                onChangeProject={() => handleChangeProject(tab.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div
        className="px-6 py-2 text-center text-xs shrink-0"
        style={{
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--bg-tertiary)',
        }}
      >
        Up to 5 party members allowed. Double-click names to rename.
      </div>
    </div>
  );
}
