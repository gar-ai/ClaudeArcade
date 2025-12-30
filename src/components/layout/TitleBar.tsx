import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PersonaSelector } from '../persona/PersonaSelector';
import { ClaudeMdEditor } from '../editor/ClaudeMdEditor';
import { ProjectPicker } from '../project/ProjectPicker';
import { BuildSelector } from '../builds/BuildSelector';
import { BuildManager } from '../builds/BuildManager';
import { Marketplace } from '../marketplace/Marketplace';

export function TitleBar() {
  const [showClaudeMdEditor, setShowClaudeMdEditor] = useState(false);
  const [showBuildManager, setShowBuildManager] = useState(false);
  const [showMCPBrowser, setShowMCPBrowser] = useState(false);
  const [installedMCPServers, setInstalledMCPServers] = useState<Record<string, unknown>>({});

  const fetchMCPServers = useCallback(async () => {
    try {
      const servers = await invoke<Record<string, unknown>>('get_mcp_servers');
      setInstalledMCPServers(servers);
    } catch (err) {
      console.error('Failed to fetch MCP servers:', err);
    }
  }, []);

  useEffect(() => {
    fetchMCPServers();
  }, [fetchMCPServers]);

  return (
    <>
      <header
        className="h-12 flex items-center justify-between px-4 select-none"
        style={{
          background: `linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)`,
          borderBottom: '2px solid var(--bg-tertiary)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.3)',
        }}
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3">
          {/* Logo with accent styling */}
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)`,
              border: '2px solid var(--accent)',
              boxShadow: '0 0 8px rgba(var(--accent), 0.3)',
            }}
          >
            <span className="font-bold text-sm" style={{ color: 'var(--bg-primary)' }}>CA</span>
          </div>
          <div>
            <span className="fantasy-title text-lg">ClaudeArcade</span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ background: 'var(--bg-tertiary)' }} />

          {/* Project Picker */}
          <ProjectPicker />

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ background: 'var(--bg-tertiary)' }} />

          {/* Build Selector */}
          <BuildSelector onOpenManager={() => setShowBuildManager(true)} />
        </div>

        {/* Center - Persona Selector */}
        <div className="flex-1 flex justify-center">
          <PersonaSelector />
        </div>

        <div className="flex items-center gap-2">
          {/* MCP Server Browser Button */}
          <button
            onClick={() => setShowMCPBrowser(true)}
            className="p-1.5 rounded transition-colors relative"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.background = 'rgba(var(--accent), 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Marketplace"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <circle cx="12" cy="10" r="2" />
            </svg>
            {Object.keys(installedMCPServers).length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg-primary)',
                }}
              >
                {Object.keys(installedMCPServers).length}
              </span>
            )}
          </button>

          {/* CLAUDE.md Editor Button */}
          <button
            onClick={() => setShowClaudeMdEditor(true)}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.background = 'rgba(var(--accent), 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Edit CLAUDE.md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
          </button>

          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: `linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)`,
              border: '1px solid var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            v1.0.0
          </span>
        </div>
      </header>

      {/* CLAUDE.md Editor Modal */}
      <ClaudeMdEditor isOpen={showClaudeMdEditor} onClose={() => setShowClaudeMdEditor(false)} />

      {/* Build Manager Modal */}
      <BuildManager isOpen={showBuildManager} onClose={() => setShowBuildManager(false)} />

      {/* Marketplace Modal */}
      <Marketplace
        isOpen={showMCPBrowser}
        onClose={() => setShowMCPBrowser(false)}
        installedServers={installedMCPServers}
        onRefresh={fetchMCPServers}
      />
    </>
  );
}
