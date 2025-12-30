export interface MCPServer {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  category: 'core' | 'integrations' | 'utilities';
  official: boolean;
  icon: string;
  requiresEnv?: string[];
}

export interface MCPCategory {
  name: string;
  description: string;
}

export interface MCPCatalog {
  servers: MCPServer[];
  categories: Record<string, MCPCategory>;
}

export interface InstalledMCPServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// Marketplace types for unified skills/MCP browser
export type MarketplaceSource = 'official' | 'community' | 'enterprise';
export type MarketplaceItemType = 'skill' | 'mcp';

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  source: MarketplaceSource;
  type: MarketplaceItemType;
  icon: string;
  repoUrl?: string;
  // For MCP servers
  command?: string;
  args?: string[];
  requiresEnv?: string[];
}
