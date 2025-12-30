// Re-export project types
export * from './project';

// === INVENTORY ===

// Simplified item types mapped to Claude Code concepts (7 categories)
export type ItemType =
  | 'helm'      // CLAUDE.md, system prompts (mind/persona)
  | 'hooks'     // All hooks (Pre/PostToolUse, Session, Permissions)
  | 'mainhand'  // Primary framework plugin
  | 'offhand'   // Secondary plugin
  | 'ring'      // Slash commands (quick cast)
  | 'spell'     // Skills (from ~/.claude/skills/)
  | 'companion' // Subagents (isolated context party members)
  | 'trinket';  // MCP servers (passive external connections)

// Legacy type aliases for backward compatibility during migration
export type LegacyItemType = 'weapon' | 'armor' | 'amulet' | 'enchantment';

export type ItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type ItemSource =
  | 'plugin'      // Framework plugins from marketplace
  | 'skill'       // Skills from ~/.claude/skills/
  | 'subagent'    // Subagents from ~/.claude/agents/
  | 'hook'        // Hooks from settings.json
  | 'command'     // Slash commands from ~/.claude/commands/
  | 'mcp'         // MCP servers from .mcp.json
  | 'claudemd'    // CLAUDE.md memory files
  | 'permission'; // Permissions from settings.json

// Display-friendly labels for item sources
export const SOURCE_LABELS: Record<ItemSource, string> = {
  plugin: 'Framework',
  skill: 'Skill',
  subagent: 'Agent',
  hook: 'Hook',
  command: 'Command',
  mcp: 'MCP Server',
  claudemd: 'Memory',
  permission: 'Permission',
};

// Display-friendly source labels derived from itemType
// (Use this when source is unreliable, e.g., all items have source='plugin')
export const ITEM_TYPE_SOURCE_LABELS: Record<ItemType, string> = {
  helm: 'Memory',
  hooks: 'Hook',
  mainhand: 'Framework',
  offhand: 'Framework',
  ring: 'Command',
  spell: 'Skill',
  companion: 'Agent',
  trinket: 'MCP Server',
};

// Live status for items (especially MCP servers, hooks, skills)
export type ItemConnectionStatus = 'connected' | 'disconnected' | 'unknown' | 'connecting' | 'error';

export interface ItemStatus {
  connectionStatus?: ItemConnectionStatus;  // For MCP servers
  lastUsed?: number;                         // Timestamp of last use
  runCount?: number;                         // Times used this session
  isActive?: boolean;                        // Currently being used
  // Dynamic token tracking (for progressive disclosure)
  baseTokens?: number;                       // Base cost when not invoked
  invokedTokens?: number;                    // Full cost when invoked/active
  currentTokens?: number;                    // Current actual usage
  // For subagents - their isolated context
  isolatedContextUsage?: number;             // Tokens used in subagent's own context
  isolatedContextBudget?: number;            // Subagent's total budget (usually 200K)
  tasksCompleted?: number;                   // Number of tasks completed by subagent
  // Error tracking
  lastError?: string;                        // Most recent error message
  errorCount?: number;                       // Errors this session
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  itemType: ItemType;
  rarity: ItemRarity;
  source: ItemSource;
  sourcePath: string;
  tokenWeight: number;
  enabled: boolean;
  version?: string;
  author?: string;
  // Live status tracking
  status?: ItemStatus;
}

// === EQUIPMENT ===

// Simplified equipment structure (7 categories)
export interface Equipment {
  // Head slot - persona/mind
  helm: InventoryItem | null;           // CLAUDE.md (1 slot)
  // Hooks - all hook types consolidated
  hooks: InventoryItem[];               // All hooks: Pre/PostToolUse, Session, Permissions (max 6)
  // Weapon slots - plugins
  mainhand: InventoryItem | null;       // Primary framework plugin
  offhand: InventoryItem | null;        // Secondary plugin
  // Accessory slots - commands
  rings: InventoryItem[];               // Slash commands (max 2)
  // Magic slots - skills
  spellbook: InventoryItem[];           // Skills (max 6)
  // Party slots - subagents (isolated context!)
  companions: InventoryItem[];          // Subagents (max 3)
  // Trinket slots - MCPs (context hogs!)
  trinkets: InventoryItem[];            // MCP servers (max 3)
}

export type EquipmentSlotType =
  | 'helm'
  | 'hooks'
  | 'mainhand'
  | 'offhand'
  | 'rings'
  | 'spellbook'
  | 'companions'
  | 'trinkets';

// Position for simplified layout around character
export type SlotPosition =
  | 'helm'
  | 'hook-1' | 'hook-2' | 'hook-3' | 'hook-4' | 'hook-5' | 'hook-6'
  | 'mainhand'
  | 'offhand'
  | 'ring-left'
  | 'ring-right'
  | 'trinket-1' | 'trinket-2' | 'trinket-3'
  | 'spell-1' | 'spell-2' | 'spell-3' | 'spell-4' | 'spell-5' | 'spell-6'
  | 'companion-1' | 'companion-2' | 'companion-3';

export interface EquipmentSlot {
  type: EquipmentSlotType;
  position?: SlotPosition;
  index?: number;
}

// === STATS ===

export type ContextStatus = 'healthy' | 'heavy' | 'dumbzone';

export interface ContextStats {
  totalBudget: number;
  equipped: number;
  available: number;
  loadPercentage: number;
  status: ContextStatus;
}

// === PERSONA / BUILD PROFILES ===

export type AvatarType = 'mage' | 'warrior' | 'rogue' | 'cleric' | 'ranger' | 'warlock';

export type ThemeType = 'fantasy' | 'dark' | 'light' | 'hacker' | 'royal';

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
}

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentDark: string;
  terminal: TerminalTheme;
}

// Saved equipment loadout for a persona (simplified)
export interface SavedLoadout {
  // Head
  helmId: string | null;              // CLAUDE.md
  // Hooks (consolidated)
  hookIds: string[];                  // All hooks (max 6)
  // Weapons (plugins)
  mainhandId: string | null;          // Primary plugin
  offhandId: string | null;           // Secondary plugin
  // Accessories
  ringIds: string[];                  // Slash commands
  // Magic
  spellbookIds: string[];             // Skills
  // Party
  companionIds: string[];             // Subagents
  // Trinkets
  trinketIds: string[];               // MCP servers
}

// Legacy loadout for migration
export interface LegacySavedLoadout {
  weaponId: string | null;
  armorId: string | null;
  amuletId: string | null;
  spellbookIds: string[];
  companionIds: string[];
  enchantmentIds: string[];
}

export interface Persona {
  id: string;
  name: string;
  title: string;  // e.g., "Code Mage", "Debug Knight"
  avatar: AvatarType;
  theme: ThemeType;
  loadout: SavedLoadout;
  claudeMdPath?: string;  // Custom CLAUDE.md for this persona
  createdAt: number;
  lastUsed: number;
}

// Default persona for new users
export const DEFAULT_PERSONA: Omit<Persona, 'id' | 'createdAt' | 'lastUsed'> = {
  name: 'Claude',
  title: 'Code Mage',
  avatar: 'mage',
  theme: 'fantasy',
  loadout: {
    helmId: null,
    hookIds: [],
    mainhandId: null,
    offhandId: null,
    ringIds: [],
    spellbookIds: [],
    companionIds: [],
    trinketIds: [],
  },
};

// Empty loadout helper
export const EMPTY_LOADOUT: SavedLoadout = {
  helmId: null,
  hookIds: [],
  mainhandId: null,
  offhandId: null,
  ringIds: [],
  spellbookIds: [],
  companionIds: [],
  trinketIds: [],
};

// Empty equipment helper
export const EMPTY_EQUIPMENT: Equipment = {
  helm: null,
  hooks: [],
  mainhand: null,
  offhand: null,
  rings: [],
  spellbook: [],
  companions: [],
  trinkets: [],
};

// Theme presets
export const THEME_PRESETS: Record<ThemeType, ThemeColors> = {
  fantasy: {
    bgPrimary: '#1c1712',
    bgSecondary: '#2a231c',
    bgTertiary: '#3d3328',
    textPrimary: '#f5e6d3',
    textSecondary: '#b8a894',
    accent: '#c9a227',
    accentDark: '#8b7019',
    terminal: {
      background: '#1c1712',
      foreground: '#f5e6d3',
      cursor: '#c9a227',
      selection: '#c9a22740',
    },
  },
  dark: {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgTertiary: '#1a1a25',
    textPrimary: '#e4e4e7',
    textSecondary: '#a1a1aa',
    accent: '#6366f1',
    accentDark: '#4f46e5',
    terminal: {
      background: '#0a0a0f',
      foreground: '#e4e4e7',
      cursor: '#6366f1',
      selection: '#6366f140',
    },
  },
  light: {
    bgPrimary: '#fafaf9',
    bgSecondary: '#f5f5f4',
    bgTertiary: '#e7e5e4',
    textPrimary: '#1c1917',
    textSecondary: '#57534e',
    accent: '#059669',
    accentDark: '#047857',
    terminal: {
      background: '#1c1917',
      foreground: '#fafaf9',
      cursor: '#059669',
      selection: '#05966940',
    },
  },
  hacker: {
    bgPrimary: '#0d0d0d',
    bgSecondary: '#1a1a1a',
    bgTertiary: '#262626',
    textPrimary: '#00ff00',
    textSecondary: '#00cc00',
    accent: '#00ff00',
    accentDark: '#00cc00',
    terminal: {
      background: '#0d0d0d',
      foreground: '#00ff00',
      cursor: '#00ff00',
      selection: '#00ff0040',
    },
  },
  royal: {
    bgPrimary: '#1a1625',
    bgSecondary: '#231f30',
    bgTertiary: '#2d2840',
    textPrimary: '#e8e4f0',
    textSecondary: '#a8a0b8',
    accent: '#9333ea',
    accentDark: '#7e22ce',
    terminal: {
      background: '#1a1625',
      foreground: '#e8e4f0',
      cursor: '#9333ea',
      selection: '#9333ea40',
    },
  },
};

// === BUILD PROFILES ===

export interface Build {
  id: string;
  name: string;
  description?: string;
  icon: string; // emoji
  loadout: SavedLoadout;
  totalTokens: number; // cached token count
  createdAt: number;
  lastUsed?: number;
}

// Preset builds that ship with the app
export const PRESET_BUILDS: Omit<Build, 'id' | 'createdAt'>[] = [
  {
    name: 'Minimal',
    description: 'No plugins - maximum context for conversations',
    icon: '-',
    loadout: { ...EMPTY_LOADOUT },
    totalTokens: 0,
  },
];

// === APP STATE ===

export type RightPanelMode = 'backpack' | 'terminal' | 'split' | 'party';
export type BackpackFilter = ItemType | 'all';

// Backpack filter categories for UI (grouped filters) - simplified
export const BACKPACK_FILTER_GROUPS = {
  all: { label: 'All', types: [] as ItemType[] },
  memory: {
    label: 'Memory',
    types: ['helm'] as ItemType[],
    description: 'CLAUDE.md files',
  },
  hooks: {
    label: 'Hooks',
    types: ['hooks'] as ItemType[],
    description: 'Pre/PostToolUse, Session hooks',
  },
  plugins: {
    label: 'Plugins',
    types: ['mainhand', 'offhand'] as ItemType[],
    description: 'Framework Plugins',
  },
  commands: {
    label: 'Commands',
    types: ['ring'] as ItemType[],
    description: 'Slash Commands',
  },
  skills: {
    label: 'Skills',
    types: ['spell'] as ItemType[],
    description: 'Procedural Knowledge',
  },
  agents: {
    label: 'Agents',
    types: ['companion'] as ItemType[],
    description: 'Subagents (Isolated Context)',
  },
  mcps: {
    label: 'MCPs',
    types: ['trinket'] as ItemType[],
    description: 'External Connections',
  },
} as const;

// Helper to get slot type from item type
export function getSlotTypeFromItemType(itemType: ItemType): EquipmentSlotType {
  switch (itemType) {
    case 'helm': return 'helm';
    case 'hooks': return 'hooks';
    case 'mainhand': return 'mainhand';
    case 'offhand': return 'offhand';
    case 'ring': return 'rings';
    case 'spell': return 'spellbook';
    case 'companion': return 'companions';
    case 'trinket': return 'trinkets';
  }
}

// === CONSTANTS ===

export const CONTEXT_BUDGET = 200_000;

export const CONTEXT_THRESHOLDS = {
  healthy: 0.25,
  heavy: 0.50,
  dumbzone: 1.00,
} as const;

export const SLOT_LIMITS = {
  // Hooks (consolidated)
  hooks: 6,        // All hooks combined
  // Accessory slots
  rings: 2,        // Slash commands
  // Magic slots
  spellbook: 6,    // Skills
  // Party slots
  companions: 3,   // Subagents
  // Trinket slots
  trinkets: 3,     // MCP servers
} as const;

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  helm: 'Mind',
  hooks: 'Hook',
  mainhand: 'Tool',
  offhand: 'Tool',
  ring: 'Command',
  spell: 'Skill',
  companion: 'Agent',
  trinket: 'MCP',
} as const;

// Extended info for each item type with Claude Code context
export interface ItemTypeInfo {
  label: string;
  shortLabel: string;
  description: string;
  claudeConcept: string;
  icon: string;
  // Token cost info for dashboard
  typicalBaseTokens?: string;      // e.g., "2-10K"
  typicalInvokedTokens?: string;   // e.g., "+5-15K" for skills
  contextBehavior: 'static' | 'progressive' | 'isolated';  // How it uses context
}

export const ITEM_TYPE_INFO: Record<ItemType, ItemTypeInfo> = {
  helm: {
    label: 'Mind',
    shortLabel: 'Mind',
    description: 'System prompt and persona',
    claudeConcept: 'CLAUDE.md memory files that shape Claude\'s behavior',
    icon: 'Crown',
    typicalBaseTokens: '2-10K',
    contextBehavior: 'static',
  },
  hooks: {
    label: 'Hook',
    shortLabel: 'Hook',
    description: 'Event-driven automation',
    claudeConcept: 'Hooks (PreToolUse, PostToolUse, Session events)',
    icon: 'ShieldAlert',
    typicalBaseTokens: '0.5-2K',
    contextBehavior: 'static',
  },
  mainhand: {
    label: 'Tool',
    shortLabel: 'Tool',
    description: 'Primary development framework',
    claudeConcept: 'Framework plugins (TypeScript, Python, React)',
    icon: 'Sword',
    typicalBaseTokens: '5-20K',
    contextBehavior: 'static',
  },
  offhand: {
    label: 'Tool',
    shortLabel: 'Tool',
    description: 'Secondary plugin or tool',
    claudeConcept: 'Secondary framework or LSP plugin',
    icon: 'Shield',
    typicalBaseTokens: '5-20K',
    contextBehavior: 'static',
  },
  ring: {
    label: 'Command',
    shortLabel: 'Cmd',
    description: 'Quick-cast commands',
    claudeConcept: 'Slash commands from ~/.claude/commands/',
    icon: 'Circle',
    typicalBaseTokens: '0.5-2K',
    contextBehavior: 'static',
  },
  spell: {
    label: 'Skill',
    shortLabel: 'Skl',
    description: 'Learned procedural knowledge',
    claudeConcept: 'Skills from ~/.claude/skills/ (progressive disclosure)',
    icon: 'Wand2',
    typicalBaseTokens: '~1K',
    typicalInvokedTokens: '+5-15K',
    contextBehavior: 'progressive',  // Only loads ~1K until invoked!
  },
  companion: {
    label: 'Agent',
    shortLabel: 'Agt',
    description: 'Autonomous party member',
    claudeConcept: 'Subagents with ISOLATED context (own 200K window)',
    icon: 'Users',
    typicalBaseTokens: '0',
    typicalInvokedTokens: 'Own 200K',
    contextBehavior: 'isolated',  // Doesn't pollute main context!
  },
  trinket: {
    label: 'MCP',
    shortLabel: 'MCP',
    description: 'External tool connection',
    claudeConcept: 'MCP servers (GitHub, databases, APIs) - context hogs!',
    icon: 'Sparkles',
    typicalBaseTokens: '5-50K',
    contextBehavior: 'static',
  },
} as const;

// WoW-style rarity colors
export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9d9d9d',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
} as const;

export const STATUS_COLORS: Record<ContextStatus, string> = {
  healthy: '#4ade80',
  heavy: '#fbbf24',
  dumbzone: '#f87171',
} as const;

// Rarity glow class names
export const RARITY_GLOW: Record<ItemRarity, string> = {
  common: 'glow-common',
  uncommon: 'glow-uncommon',
  rare: 'glow-rare',
  epic: 'glow-epic',
  legendary: 'glow-legendary',
} as const;
