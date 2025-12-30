import { useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MCPCard } from './MCPCard';
import mcpCatalogData from '../../data/mcp-catalog.json';
import type { MCPCatalog, MCPServer } from '../../types/mcp';

const mcpCatalog = mcpCatalogData as MCPCatalog;

interface MCPBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  installedServers: Record<string, unknown>;
  onRefresh: () => void;
}

type CategoryFilter = 'all' | 'core' | 'integrations' | 'utilities';

export function MCPBrowser({ isOpen, onClose, installedServers, onRefresh }: MCPBrowserProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredServers = useMemo(() => {
    return mcpCatalog.servers.filter((server) => {
      // Filter by category
      if (filter !== 'all' && server.category !== filter) {
        return false;
      }

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          server.name.toLowerCase().includes(query) ||
          server.description.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [filter, searchQuery]);

  const handleInstall = async (server: MCPServer) => {
    setInstalling(server.id);
    setError(null);

    try {
      await invoke('install_mcp_server', {
        serverId: server.id,
        command: server.command,
        args: server.args,
      });
      onRefresh();
    } catch (err) {
      setError(`Failed to install ${server.name}: ${err}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleRemove = async (server: MCPServer) => {
    setInstalling(server.id);
    setError(null);

    try {
      await invoke('remove_mcp_server', { serverId: server.id });
      onRefresh();
    } catch (err) {
      setError(`Failed to remove ${server.name}: ${err}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #2a231c 0%, #1a1410 100%)',
          border: '3px solid #c9a227',
          boxShadow: '0 0 24px rgba(201, 162, 39, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(180deg, rgba(201, 162, 39, 0.15) 0%, transparent 100%)',
            borderBottom: '2px solid rgba(201, 162, 39, 0.4)',
          }}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{
                color: '#c9a227',
                fontFamily: "'Cinzel', serif",
                textShadow: '0 0 8px rgba(201, 162, 39, 0.5)',
              }}
            >
              MCP Server Browser
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#b8a894' }}>
              Browse and install official MCP servers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded transition-all"
            style={{
              background: '#3d3328',
              color: '#b8a894',
              border: '1px solid #4a3f32',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div
          className="p-4 flex items-center gap-4"
          style={{ borderBottom: '1px solid #4a3f32' }}
        >
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded text-sm"
              style={{
                background: '#1a1410',
                border: '1px solid #4a3f32',
                color: '#f5e6d3',
              }}
            />
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#7a6f62' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>

          {/* Category Filters */}
          <div className="flex gap-1">
            {(['all', 'core', 'integrations', 'utilities'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="px-3 py-1.5 rounded text-xs font-medium capitalize transition-all"
                style={{
                  background: filter === cat ? '#c9a227' : 'transparent',
                  color: filter === cat ? '#1a1410' : '#b8a894',
                  border: filter === cat ? '1px solid #c9a227' : '1px solid #4a3f32',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mx-4 mt-4 px-3 py-2 rounded text-xs"
            style={{
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              color: '#f87171',
            }}
          >
            {error}
          </div>
        )}

        {/* Server Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredServers.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#7a6f62' }}>
              <p className="text-lg mb-2">No servers found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServers.map((server) => (
                <MCPCard
                  key={server.id}
                  server={server}
                  isInstalled={server.id in installedServers}
                  isLoading={installing === server.id}
                  onInstall={() => handleInstall(server)}
                  onRemove={() => handleRemove(server)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderTop: '1px solid #4a3f32' }}
        >
          <span className="text-xs" style={{ color: '#7a6f62' }}>
            {Object.keys(installedServers).length} server(s) installed
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium transition-all"
            style={{
              background: 'linear-gradient(180deg, #3d3328 0%, #2a231c 100%)',
              color: '#b8a894',
              border: '1px solid #4a3f32',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
