import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

type PermissionLevel = 'allow' | 'ask' | 'deny';

interface Permission {
  pattern: string;
  level: PermissionLevel;
}

interface PermissionsConfig {
  allow: string[];
  ask: string[];
  deny: string[];
}

// Common permission patterns
const COMMON_PATTERNS = [
  { pattern: 'Bash(*)', description: 'All bash commands' },
  { pattern: 'Bash(npm:*)', description: 'npm commands' },
  { pattern: 'Bash(git:*)', description: 'Git commands' },
  { pattern: 'Bash(git push:*)', description: 'Git push operations' },
  { pattern: 'Read(*)', description: 'Read any file' },
  { pattern: 'Read(src/**)', description: 'Read source files' },
  { pattern: 'Read(.env*)', description: 'Read environment files' },
  { pattern: 'Edit(*)', description: 'Edit any file' },
  { pattern: 'Edit(src/**)', description: 'Edit source files' },
  { pattern: 'Write(*)', description: 'Write any file' },
  { pattern: 'WebFetch(*)', description: 'Fetch web content' },
  { pattern: 'mcp__*', description: 'All MCP tools' },
];

const LEVEL_CONFIG: Record<PermissionLevel, { color: string; bg: string; icon: string; label: string }> = {
  allow: { color: '#4ade80', bg: '#4ade8020', icon: '✓', label: 'Allow' },
  ask: { color: '#fbbf24', bg: '#fbbf2420', icon: '?', label: 'Ask' },
  deny: { color: '#f87171', bg: '#f8717120', icon: '✕', label: 'Deny' },
};

interface PermissionItemProps {
  pattern: string;
  level: PermissionLevel;
  onLevelChange: (newLevel: PermissionLevel) => void;
  onRemove: () => void;
}

function PermissionItem({ pattern, level, onLevelChange, onRemove }: PermissionItemProps) {
  const config = LEVEL_CONFIG[level];

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg transition-all"
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${config.color}40`,
      }}
    >
      {/* Level indicator */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold shrink-0"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.color}40`,
        }}
      >
        {config.icon}
      </div>

      {/* Pattern */}
      <div className="flex-1 min-w-0">
        <code
          className="text-sm font-mono truncate block"
          style={{ color: 'var(--text-primary)' }}
        >
          {pattern}
        </code>
      </div>

      {/* Level selector */}
      <div className="flex items-center gap-1">
        {(['allow', 'ask', 'deny'] as PermissionLevel[]).map((lvl) => {
          const lvlConfig = LEVEL_CONFIG[lvl];
          const isActive = level === lvl;
          return (
            <button
              key={lvl}
              onClick={() => onLevelChange(lvl)}
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: isActive ? lvlConfig.bg : 'transparent',
                color: isActive ? lvlConfig.color : 'var(--text-secondary)',
                border: isActive ? `1px solid ${lvlConfig.color}40` : '1px solid transparent',
              }}
              title={`Set to ${lvlConfig.label}`}
            >
              {lvlConfig.label}
            </button>
          );
        })}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1 rounded transition-all hover:opacity-80"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
        title="Remove permission"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface PermissionsEditorProps {
  onClose?: () => void;
}

export function PermissionsEditor({ onClose }: PermissionsEditorProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPattern, setNewPattern] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config = await invoke<PermissionsConfig>('get_permissions');
      const allPermissions: Permission[] = [
        ...config.allow.map((p) => ({ pattern: p, level: 'allow' as PermissionLevel })),
        ...config.ask.map((p) => ({ pattern: p, level: 'ask' as PermissionLevel })),
        ...config.deny.map((p) => ({ pattern: p, level: 'deny' as PermissionLevel })),
      ];
      // Sort by pattern
      allPermissions.sort((a, b) => a.pattern.localeCompare(b.pattern));
      setPermissions(allPermissions);
    } catch (e) {
      // If command doesn't exist yet, start with empty
      console.log('Permissions not loaded (command may not exist yet):', e);
      setPermissions([]);
    }
    setIsLoading(false);
  };

  const savePermissions = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const config: PermissionsConfig = {
        allow: permissions.filter((p) => p.level === 'allow').map((p) => p.pattern),
        ask: permissions.filter((p) => p.level === 'ask').map((p) => p.pattern),
        deny: permissions.filter((p) => p.level === 'deny').map((p) => p.pattern),
      };
      await invoke('set_permissions', { permissions: config });
    } catch (e) {
      console.error('Failed to save permissions:', e);
      setError('Failed to save permissions');
    }
    setIsSaving(false);
  };

  const handleLevelChange = (index: number, newLevel: PermissionLevel) => {
    setPermissions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], level: newLevel };
      return updated;
    });
  };

  const handleRemove = (index: number) => {
    setPermissions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPattern = (pattern: string) => {
    if (!pattern.trim()) return;
    if (permissions.some((p) => p.pattern === pattern)) {
      setError('Pattern already exists');
      return;
    }
    setPermissions((prev) => [...prev, { pattern: pattern.trim(), level: 'ask' }]);
    setNewPattern('');
    setShowSuggestions(false);
  };

  // Filter suggestions based on input
  const filteredSuggestions = COMMON_PATTERNS.filter(
    (s) =>
      s.pattern.toLowerCase().includes(newPattern.toLowerCase()) &&
      !permissions.some((p) => p.pattern === s.pattern)
  );

  // Count by level
  const allowCount = permissions.filter((p) => p.level === 'allow').length;
  const askCount = permissions.filter((p) => p.level === 'ask').length;
  const denyCount = permissions.filter((p) => p.level === 'deny').length;

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
            <h2 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
              Permissions Editor
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Configure tool access permissions for Claude Code
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={savePermissions}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
                color: 'var(--bg-primary)',
                border: '1px solid var(--accent)',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded transition-all hover:opacity-80"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div
          className="flex items-center gap-6 px-4 py-3 rounded-lg"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--bg-tertiary)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: LEVEL_CONFIG.allow.color }} />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {allowCount} Allowed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: LEVEL_CONFIG.ask.color }} />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {askCount} Ask
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: LEVEL_CONFIG.deny.color }} />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {denyCount} Denied
            </span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mx-6 mt-4 p-3 rounded-lg flex items-center gap-2"
          style={{
            background: '#f8717120',
            border: '1px solid #f8717140',
          }}
        >
          <span style={{ color: '#f87171' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto"
            style={{ color: '#f87171' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Add new permission */}
      <div className="px-6 py-4 shrink-0">
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => {
                setNewPattern(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Add permission pattern (e.g., Bash(npm:*))"
              className="flex-1 px-4 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-tertiary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPattern(newPattern);
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
            />
            <button
              onClick={() => handleAddPattern(newPattern)}
              disabled={!newPattern.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            >
              Add
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-10"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            >
              {filteredSuggestions.slice(0, 6).map((suggestion) => (
                <button
                  key={suggestion.pattern}
                  onClick={() => handleAddPattern(suggestion.pattern)}
                  className="w-full px-4 py-2 text-left text-sm transition-all hover:opacity-80 flex items-center justify-between"
                  style={{
                    background: 'transparent',
                    borderBottom: '1px solid var(--bg-tertiary)',
                  }}
                >
                  <code style={{ color: 'var(--accent)' }}>{suggestion.pattern}</code>
                  <span style={{ color: 'var(--text-secondary)' }}>{suggestion.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Permissions list */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading permissions...
            </div>
          </div>
        ) : permissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'var(--bg-secondary)',
                border: '2px solid var(--bg-tertiary)',
              }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: 'var(--text-secondary)' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              No Permissions Configured
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Add patterns to control tool access
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {permissions.map((permission, index) => (
              <PermissionItem
                key={`${permission.pattern}-${index}`}
                pattern={permission.pattern}
                level={permission.level}
                onLevelChange={(newLevel) => handleLevelChange(index, newLevel)}
                onRemove={() => handleRemove(index)}
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
        Patterns use glob syntax. Examples: Bash(*), Read(src/**), mcp__github__*
      </div>
    </div>
  );
}
