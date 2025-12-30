import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { MarketplaceCard } from './MarketplaceCard';
import {
  fetchOfficialSkills,
  fetchOfficialMCPServers,
  fetchHuggingFaceSkills,
  getEnterpriseSkills,
  clearCache,
} from '../../services/github';
import type { MarketplaceItem } from '../../types/mcp';
import mcpCatalogData from '../../data/mcp-catalog.json';

interface MarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
  installedServers: Record<string, unknown>;
  onRefresh: () => void;
}

type TabType = 'skills' | 'mcp' | 'huggingface' | 'enterprise';

export function Marketplace({ isOpen, onClose, installedServers, onRefresh }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState<TabType>('skills');
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Track installed skills
  const [installedSkills, setInstalledSkills] = useState<Record<string, boolean>>({});

  // Items from various sources
  const [officialSkills, setOfficialSkills] = useState<MarketplaceItem[]>([]);
  const [officialMCP, setOfficialMCP] = useState<MarketplaceItem[]>([]);
  const [huggingFaceSkills, setHuggingFaceSkills] = useState<MarketplaceItem[]>([]);
  const enterpriseSkills = useMemo(() => {
    return getEnterpriseSkills().map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      source: skill.source,
      type: 'skill' as const,
      icon: 'E',
      repoUrl: skill.repoUrl,
    }));
  }, []);

  // Static MCP catalog (fallback/additional)
  const staticMCP = useMemo<MarketplaceItem[]>(() => {
    return mcpCatalogData.servers.map((server) => ({
      id: server.id,
      name: server.name,
      description: server.description,
      category: server.category,
      source: 'official' as const,
      type: 'mcp' as const,
      icon: server.icon,
      command: server.command,
      args: server.args,
      requiresEnv: server.requiresEnv,
    }));
  }, []);

  // Fetch installed skills from backend
  const fetchInstalledSkills = useCallback(async () => {
    try {
      const skills = await invoke<Array<{ id: string }>>('list_installed_skills', {
        projectPath: null,
      });
      const skillMap: Record<string, boolean> = {};
      skills.forEach((s) => {
        skillMap[s.id] = true;
      });
      setInstalledSkills(skillMap);
    } catch (err) {
      console.error('Failed to fetch installed skills:', err);
    }
  }, []);

  // Fetch GitHub data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [skills, mcp, hfSkills] = await Promise.all([
        fetchOfficialSkills(),
        fetchOfficialMCPServers(),
        fetchHuggingFaceSkills(),
      ]);

      // Also fetch installed skills
      await fetchInstalledSkills();

      // Convert to MarketplaceItem format
      setOfficialSkills(
        skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          source: skill.source,
          type: 'skill' as const,
          icon: 'S',
          repoUrl: skill.repoUrl,
        }))
      );

      setOfficialMCP(
        mcp.map((server) => ({
          id: server.id,
          name: server.name,
          description: server.description,
          category: 'core',
          source: server.source,
          type: 'mcp' as const,
          icon: 'M',
          repoUrl: server.repoUrl,
        }))
      );

      setHuggingFaceSkills(
        hfSkills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          source: skill.source,
          type: 'skill' as const,
          icon: '🤗',
          repoUrl: skill.repoUrl,
        }))
      );
    } catch (err) {
      setError('Failed to fetch from GitHub. Using cached data.');
      console.error('Marketplace fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInstalledSkills]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Get items for current tab
  const currentItems = useMemo(() => {
    let items: MarketplaceItem[] = [];

    switch (activeTab) {
      case 'skills':
        items = officialSkills;
        break;
      case 'mcp':
        // Merge GitHub MCP with static catalog, preferring static for install info
        const mcpMap = new Map<string, MarketplaceItem>();
        officialMCP.forEach((item) => mcpMap.set(item.id, item));
        staticMCP.forEach((item) => mcpMap.set(item.id, item));
        items = Array.from(mcpMap.values());
        break;
      case 'huggingface':
        items = huggingFaceSkills;
        break;
      case 'enterprise':
        items = enterpriseSkills;
        break;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    return items;
  }, [activeTab, officialSkills, officialMCP, staticMCP, huggingFaceSkills, enterpriseSkills, searchQuery]);

  const handleInstall = async (item: MarketplaceItem) => {
    setInstalling(item.id);
    setError(null);

    try {
      if (item.type === 'skill') {
        // Install skill via download_skill command
        await invoke('download_skill', {
          skillId: item.id,
          skillName: item.name,
          isGlobal: true,
          projectPath: null,
        });
        await fetchInstalledSkills();
      } else if (item.type === 'mcp') {
        // Install MCP server
        if (!item.command) {
          setError(`Cannot install ${item.name}: No install command available`);
          setInstalling(null);
          return;
        }
        await invoke('install_mcp_server', {
          serverId: item.id,
          command: item.command,
          args: item.args || [],
        });
        onRefresh();
      }
    } catch (err) {
      setError(`Failed to install ${item.name}: ${err}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleRemove = async (item: MarketplaceItem) => {
    setInstalling(item.id);
    setError(null);

    try {
      if (item.type === 'skill') {
        // Remove skill
        await invoke('remove_skill', {
          skillId: item.id,
          isGlobal: true,
          projectPath: null,
        });
        await fetchInstalledSkills();
      } else if (item.type === 'mcp') {
        // Remove MCP server
        await invoke('remove_mcp_server', { serverId: item.id });
        onRefresh();
      }
    } catch (err) {
      setError(`Failed to remove ${item.name}: ${err}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleViewRepo = (item: MarketplaceItem) => {
    if (item.repoUrl) {
      openUrl(item.repoUrl);
    }
  };

  const handleRefresh = () => {
    clearCache();
    fetchData();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: string; count: number }[] = [
    { id: 'skills', label: 'Skills', icon: 'S', count: officialSkills.length },
    { id: 'mcp', label: 'MCP Servers', icon: 'M', count: staticMCP.length },
    { id: 'huggingface', label: 'HuggingFace', icon: '🤗', count: huggingFaceSkills.length },
    { id: 'enterprise', label: 'Enterprise', icon: 'E', count: enterpriseSkills.length },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
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
              Marketplace
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#b8a894' }}>
              Browse official skills, MCP servers, and enterprise integrations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded transition-all"
              style={{
                background: '#3d3328',
                color: '#b8a894',
                border: '1px solid #4a3f32',
              }}
              title="Refresh"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
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
        </div>

        {/* Tabs */}
        <div
          className="px-4 pt-3 flex items-center gap-1"
          style={{ borderBottom: '1px solid #4a3f32' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-t text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: activeTab === tab.id ? '#1a1410' : 'transparent',
                color: activeTab === tab.id ? '#c9a227' : '#7a6f62',
                borderBottom: activeTab === tab.id ? '2px solid #c9a227' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === tab.id ? 'rgba(201, 162, 39, 0.2)' : '#2d261e',
                  color: activeTab === tab.id ? '#c9a227' : '#7a6f62',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-4" style={{ borderBottom: '1px solid #4a3f32' }}>
          <div className="relative">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
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

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-2xl mb-2 animate-pulse">...</div>
                <p style={{ color: '#b8a894' }}>Loading from GitHub...</p>
              </div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#7a6f62' }}>
              <p className="text-lg mb-2">No items found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentItems.map((item) => (
                <MarketplaceCard
                  key={item.id}
                  item={item}
                  isInstalled={
                    item.type === 'skill'
                      ? item.id in installedSkills
                      : item.id in installedServers
                  }
                  isLoading={installing === item.id}
                  onInstall={() => handleInstall(item)}
                  onRemove={() => handleRemove(item)}
                  onViewRepo={() => handleViewRepo(item)}
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
          <div className="flex items-center gap-4">
            <span className="text-xs" style={{ color: '#7a6f62' }}>
              {Object.keys(installedSkills).length} skill(s) | {Object.keys(installedServers).length} MCP server(s)
            </span>
            <a
              href="https://github.com/anthropics/skills"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline"
              style={{ color: '#c9a227' }}
            >
              View on GitHub
            </a>
          </div>
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
