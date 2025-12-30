import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface MCPServer {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  status?: 'connected' | 'disconnected' | 'unknown';
}

interface MCPServersResponse {
  [key: string]: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
}

// Common MCP server templates
const MCP_TEMPLATES = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub integration for issues, PRs, and repos',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-github'],
    icon: 'GH',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Query and manage SQLite databases',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-sqlite'],
    icon: 'DB',
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Safe filesystem operations',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-filesystem'],
    icon: 'FS',
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent memory for Claude',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-memory'],
    icon: 'MEM',
  },
];

const STATUS_CONFIG = {
  connected: { color: '#4ade80', label: 'Connected' },
  disconnected: { color: '#f87171', label: 'Disconnected' },
  unknown: { color: '#71717a', label: 'Unknown' },
};

interface MCPServerCardProps {
  server: MCPServer;
  onRemove: () => void;
}

function MCPServerCard({ server, onRemove }: MCPServerCardProps) {
  const status = server.status || 'unknown';
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div
      className="p-4 rounded-lg transition-all"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--bg-tertiary)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3f362c 0%, #2d261e 100%)',
            border: '2px solid var(--accent)',
            color: 'var(--accent)',
          }}
        >
          MCP
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className="font-semibold text-sm truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {server.id}
            </h4>
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
          </div>

          <div
            className="text-xs font-mono truncate mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {server.command} {server.args.join(' ')}
          </div>

          {/* Environment variables */}
          {server.env && Object.keys(server.env).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.keys(server.env).map((key) => (
                <span
                  key={key}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="p-1.5 rounded transition-all hover:opacity-80"
          style={{
            background: 'var(--bg-tertiary)',
            color: '#f87171',
          }}
          title="Remove server"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface MCPManagerProps {
  onClose?: () => void;
}

export function MCPManager({ onClose }: MCPManagerProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServerId, setNewServerId] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newArgs, setNewArgs] = useState('');

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invoke<MCPServersResponse>('get_mcp_servers');
      const serverList: MCPServer[] = Object.entries(response).map(([id, config]) => ({
        id,
        command: config.command,
        args: config.args,
        env: config.env,
        status: 'unknown' as const,
      }));
      setServers(serverList);
    } catch (e) {
      console.error('Failed to load MCP servers:', e);
      setError('Failed to load MCP servers');
    }
    setIsLoading(false);
  };

  const handleRemoveServer = async (serverId: string) => {
    try {
      await invoke('remove_mcp_server', { serverId });
      setServers((prev) => prev.filter((s) => s.id !== serverId));
    } catch (e) {
      console.error('Failed to remove server:', e);
      setError('Failed to remove server');
    }
  };

  const handleAddServer = async () => {
    if (!newServerId.trim() || !newCommand.trim()) {
      setError('Server ID and command are required');
      return;
    }

    const args = newArgs.split(' ').filter((a) => a.trim());

    try {
      await invoke('install_mcp_server', {
        serverId: newServerId.trim(),
        command: newCommand.trim(),
        args,
      });
      await loadServers();
      setNewServerId('');
      setNewCommand('');
      setNewArgs('');
      setShowAddForm(false);
    } catch (e) {
      console.error('Failed to add server:', e);
      setError('Failed to add server');
    }
  };

  const handleInstallTemplate = async (template: typeof MCP_TEMPLATES[0]) => {
    try {
      await invoke('install_mcp_server', {
        serverId: template.id,
        command: template.command,
        args: template.args,
      });
      await loadServers();
    } catch (e) {
      console.error('Failed to install template:', e);
      setError('Failed to install server');
    }
  };

  // Filter templates that aren't already installed
  const availableTemplates = MCP_TEMPLATES.filter(
    (t) => !servers.some((s) => s.id === t.id)
  );

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
              MCP Server Manager
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Configure Model Context Protocol servers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all hover:opacity-90"
              style={{
                background: showAddForm
                  ? 'var(--bg-tertiary)'
                  : 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
                color: showAddForm ? 'var(--text-secondary)' : 'var(--bg-primary)',
                border: showAddForm ? '1px solid var(--bg-tertiary)' : '1px solid var(--accent)',
              }}
            >
              {showAddForm ? 'Cancel' : 'Add Server'}
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

        {/* Summary */}
        <div
          className="flex items-center gap-4 px-4 py-3 rounded-lg"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--bg-tertiary)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {servers.length} server{servers.length !== 1 ? 's' : ''} configured
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

      {/* Add server form */}
      {showAddForm && (
        <div
          className="mx-6 mt-4 p-4 rounded-lg"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--accent)',
          }}
        >
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--accent)' }}>
            Add Custom Server
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newServerId}
              onChange={(e) => setNewServerId(e.target.value)}
              placeholder="Server ID (e.g., my-server)"
              className="w-full px-4 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            />
            <input
              type="text"
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              placeholder="Command (e.g., npx)"
              className="w-full px-4 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            />
            <input
              type="text"
              value={newArgs}
              onChange={(e) => setNewArgs(e.target.value)}
              placeholder="Arguments (space-separated)"
              className="w-full px-4 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--bg-tertiary)',
              }}
            />
            <button
              onClick={handleAddServer}
              className="w-full py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
                color: 'var(--bg-primary)',
                border: '1px solid var(--accent)',
              }}
            >
              Add Server
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading servers...
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Installed servers */}
            {servers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>
                  Installed Servers
                </h3>
                <div className="space-y-2">
                  {servers.map((server) => (
                    <MCPServerCard
                      key={server.id}
                      server={server}
                      onRemove={() => handleRemoveServer(server.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick install templates */}
            {availableTemplates.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Quick Install
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {availableTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleInstallTemplate(template)}
                      className="p-3 rounded-lg text-left transition-all hover:opacity-80"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--bg-tertiary)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: 'var(--accent)',
                            color: 'var(--bg-primary)',
                          }}
                        >
                          {template.icon}
                        </span>
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {template.name}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {servers.length === 0 && availableTemplates.length === 0 && (
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
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  No MCP Servers
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Add servers to extend Claude&apos;s capabilities
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-2 text-center text-xs shrink-0"
        style={{
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--bg-tertiary)',
        }}
      >
        MCP servers connect Claude to external tools and services
      </div>
    </div>
  );
}
