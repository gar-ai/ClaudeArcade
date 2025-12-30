use serde::{Deserialize, Serialize};

// Simplified item types mapped to Claude Code concepts (7 categories)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ItemType {
    Helm,      // CLAUDE.md, system prompts (mind/persona)
    Hooks,     // All hooks (Pre/PostToolUse, Session, Permissions)
    Mainhand,  // Primary framework plugin
    Offhand,   // Secondary plugin
    Ring,      // Slash commands (quick cast)
    Spell,     // Skills (from ~/.claude/skills/)
    Companion, // Subagents (isolated context party members)
    Trinket,   // MCP servers (passive external connections)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ItemRarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ItemSource {
    Plugin,     // Framework plugins from marketplace
    Skill,      // Skills from ~/.claude/skills/
    Subagent,   // Subagents from ~/.claude/agents/
    Hook,       // Hooks from settings.json
    Command,    // Slash commands from ~/.claude/commands/
    Mcp,        // MCP servers from .mcp.json
    ClaudeMd,   // CLAUDE.md memory files
    Permission, // Permissions from settings.json
}

// Connection status for items (especially MCP servers)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ItemConnectionStatus {
    Connected,
    Disconnected,
    Unknown,
    Connecting,
    Error,
}

// Live status tracking for items
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ItemStatus {
    pub connection_status: Option<ItemConnectionStatus>,
    pub last_used: Option<u64>,
    pub run_count: Option<u32>,
    pub is_active: Option<bool>,
    // Dynamic token tracking (for progressive disclosure)
    pub base_tokens: Option<u32>,
    pub invoked_tokens: Option<u32>,
    pub current_tokens: Option<u32>,
    // For subagents - their isolated context
    pub isolated_context_usage: Option<u32>,
    pub isolated_context_budget: Option<u32>,
    pub tasks_completed: Option<u32>,
    // Error tracking
    pub last_error: Option<String>,
    pub error_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub item_type: ItemType,
    pub rarity: ItemRarity,
    pub source: ItemSource,
    pub source_path: String,
    pub token_weight: u32,
    pub enabled: bool,
    pub version: Option<String>,
    pub author: Option<String>,
    // Live status tracking
    pub status: Option<ItemStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub items: Vec<InventoryItem>,
    pub errors: Vec<String>,
    pub scan_duration_ms: u64,
}

// Simplified equipment slot types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum EquipmentSlotType {
    Helm,
    Hooks,
    Mainhand,
    Offhand,
    Rings,
    Spellbook,
    Companions,
    Trinkets,
}

// Position for simplified layout around character
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SlotPosition {
    Helm,
    Hook1, Hook2, Hook3, Hook4, Hook5, Hook6,
    Mainhand,
    Offhand,
    RingLeft,
    RingRight,
    Trinket1, Trinket2, Trinket3,
    Spell1, Spell2, Spell3, Spell4, Spell5, Spell6,
    Companion1, Companion2, Companion3,
}

// Equipment slot matching TypeScript interface
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentSlot {
    #[serde(rename = "type")]
    pub slot_type: EquipmentSlotType,
    pub position: Option<SlotPosition>,
    pub index: Option<usize>,
}

// Simplified equipment structure (7 categories)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct Equipment {
    // Head slot - persona/mind
    pub helm: Option<InventoryItem>,           // CLAUDE.md (1 slot)
    // Hooks - all hook types consolidated
    pub hooks: Vec<InventoryItem>,             // All hooks (max 6)
    // Weapon slots - plugins
    pub mainhand: Option<InventoryItem>,       // Primary framework plugin
    pub offhand: Option<InventoryItem>,        // Secondary plugin
    // Accessory slots - commands
    pub rings: Vec<InventoryItem>,             // Slash commands (max 2)
    // Magic slots - skills
    pub spellbook: Vec<InventoryItem>,         // Skills (max 6)
    // Party slots - subagents (isolated context!)
    pub companions: Vec<InventoryItem>,        // Subagents (max 3)
    // Trinket slots - MCPs (context hogs!)
    pub trinkets: Vec<InventoryItem>,          // MCP servers (max 3)
}

impl Default for Equipment {
    fn default() -> Self {
        Self {
            helm: None,
            hooks: Vec::new(),
            mainhand: None,
            offhand: None,
            rings: Vec::new(),
            spellbook: Vec::new(),
            companions: Vec::new(),
            trinkets: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipResult {
    pub success: bool,
    pub new_context_stats: ContextStats,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextStats {
    pub total_budget: u32,
    pub equipped: u32,
    pub available: u32,
    pub load_percentage: f64,
    pub status: String,
}

impl Default for ContextStats {
    fn default() -> Self {
        Self {
            total_budget: 200_000,
            equipped: 0,
            available: 200_000,
            load_percentage: 0.0,
            status: "healthy".to_string(),
        }
    }
}

// Slot limits for array-based equipment slots
pub const SLOT_LIMITS: SlotLimits = SlotLimits {
    hooks: 6,
    rings: 2,
    spellbook: 6,
    companions: 3,
    trinkets: 3,
};

pub struct SlotLimits {
    pub hooks: usize,
    pub rings: usize,
    pub spellbook: usize,
    pub companions: usize,
    pub trinkets: usize,
}

// Helper to map ItemType to EquipmentSlotType
impl ItemType {
    pub fn to_slot_type(&self) -> EquipmentSlotType {
        match self {
            ItemType::Helm => EquipmentSlotType::Helm,
            ItemType::Hooks => EquipmentSlotType::Hooks,
            ItemType::Mainhand => EquipmentSlotType::Mainhand,
            ItemType::Offhand => EquipmentSlotType::Offhand,
            ItemType::Ring => EquipmentSlotType::Rings,
            ItemType::Spell => EquipmentSlotType::Spellbook,
            ItemType::Companion => EquipmentSlotType::Companions,
            ItemType::Trinket => EquipmentSlotType::Trinkets,
        }
    }
}
