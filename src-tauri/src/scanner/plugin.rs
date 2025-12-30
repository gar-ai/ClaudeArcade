use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use serde::Deserialize;

use crate::types::{InventoryItem, ItemType, ItemRarity, ItemSource, ScanResult};
use super::settings::read_settings;

/// Installed plugin entry from installed_plugins.json
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstalledPluginEntry {
    #[serde(rename = "scope")]
    _scope: String,
    install_path: String,
    version: String,
    #[serde(default, rename = "isLocal")]
    _is_local: bool,
}

/// Installed plugins file structure
#[derive(Debug, Deserialize)]
struct InstalledPluginsFile {
    #[serde(rename = "version")]
    _version: u32,
    plugins: HashMap<String, Vec<InstalledPluginEntry>>,
}

/// Plugin metadata from marketplace.json
#[derive(Debug, Clone, Deserialize)]
struct PluginMetadata {
    name: String,
    description: String,
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    author: Option<AuthorInfo>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum AuthorInfo {
    Object { name: String },
    String(String),
}

impl AuthorInfo {
    fn name(&self) -> &str {
        match self {
            AuthorInfo::Object { name } => name,
            AuthorInfo::String(s) => s,
        }
    }
}

/// Marketplace catalog structure
#[derive(Debug, Deserialize)]
struct MarketplaceCatalog {
    #[serde(rename = "name")]
    _name: String,
    plugins: Vec<PluginMetadata>,
}

/// Get Claude config directory
pub fn claude_config_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude"))
}

/// Read installed plugins from installed_plugins.json
fn read_installed_plugins() -> HashMap<String, InstalledPluginEntry> {
    let path = claude_config_dir()
        .map(|d| d.join("plugins").join("installed_plugins.json"));

    let content = match path.and_then(|p| fs::read_to_string(p).ok()) {
        Some(c) => c,
        None => return HashMap::new(),
    };

    let file: InstalledPluginsFile = match serde_json::from_str(&content) {
        Ok(f) => f,
        Err(_) => return HashMap::new(),
    };

    // Flatten the nested structure - take the first entry for each plugin
    file.plugins
        .into_iter()
        .filter_map(|(id, entries)| {
            entries.into_iter().next().map(|e| (id, e))
        })
        .collect()
}

/// Read plugin metadata from marketplace catalogs
fn read_marketplace_catalog() -> HashMap<String, PluginMetadata> {
    let mut catalog = HashMap::new();

    let marketplaces_dir = match claude_config_dir() {
        Some(d) => d.join("plugins").join("marketplaces"),
        None => return catalog,
    };

    if !marketplaces_dir.exists() {
        return catalog;
    }

    // Scan each marketplace directory
    if let Ok(entries) = fs::read_dir(&marketplaces_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let marketplace_path = entry.path();
            let marketplace_name = entry.file_name().to_string_lossy().to_string();

            // Read the marketplace.json file
            let catalog_path = marketplace_path
                .join(".claude-plugin")
                .join("marketplace.json");

            if let Ok(content) = fs::read_to_string(&catalog_path) {
                if let Ok(mc) = serde_json::from_str::<MarketplaceCatalog>(&content) {
                    for plugin in mc.plugins {
                        // Key is "plugin-name@marketplace-name"
                        let key = format!("{}@{}", plugin.name, marketplace_name);
                        catalog.insert(key, plugin);
                    }
                }
            }
        }
    }

    catalog
}

/// Map category to ItemType
/// Plugins are mapped to weapon/trinket slots based on their purpose
fn category_to_item_type(category: Option<&str>) -> ItemType {
    match category.unwrap_or("development") {
        "development" => ItemType::Mainhand,   // Dev tools are primary weapons
        "productivity" => ItemType::Offhand,   // Productivity is secondary
        "learning" => ItemType::Spell,         // Learning = knowledge spells
        "security" => ItemType::Hooks,         // Security = hooks/guards
        "testing" => ItemType::Spell,          // Testing knowledge
        "database" => ItemType::Trinket,       // External connections
        "deployment" => ItemType::Trinket,     // External connections
        "monitoring" => ItemType::Trinket,     // External connections
        "design" => ItemType::Spell,           // Design knowledge
        "mcp" => ItemType::Trinket,            // MCP servers
        _ => ItemType::Mainhand,               // Default to primary weapon
    }
}

/// Determine rarity based on plugin features
fn determine_rarity(metadata: Option<&PluginMetadata>, has_lsp: bool, has_mcp: bool) -> ItemRarity {
    if has_mcp {
        return ItemRarity::Epic;
    }
    if has_lsp {
        return ItemRarity::Rare;
    }

    // Check if it's from Anthropic
    if let Some(meta) = metadata {
        if let Some(ref author) = meta.author {
            if author.name().to_lowercase().contains("anthropic") {
                return ItemRarity::Rare;
            }
        }
    }

    ItemRarity::Common
}

/// Scan all plugin sources and return inventory items
pub fn scan_plugins() -> ScanResult {
    let start = std::time::Instant::now();
    let mut items = Vec::new();
    let errors = Vec::new();

    // Get enabled plugins from settings
    let settings = read_settings();
    let enabled_plugins = &settings.enabled_plugins;

    // Get installed plugins
    let installed = read_installed_plugins();

    // Get marketplace metadata
    let catalog = read_marketplace_catalog();

    // Process each installed plugin
    for (plugin_id, entry) in &installed {
        let metadata = catalog.get(plugin_id);

        // Extract name from ID (e.g., "rust-analyzer-lsp@claude-plugins-official")
        let name: String = plugin_id.split('@').next().unwrap_or(plugin_id).to_string();

        // Get display name and description from metadata
        let display_name = metadata
            .map(|m| m.name.clone())
            .unwrap_or_else(|| name.clone());

        let description = metadata
            .map(|m| m.description.clone())
            .unwrap_or_else(|| format!("Plugin: {}", name));

        // Check if it has LSP servers (indicates development tool)
        let has_lsp = metadata
            .map(|m| m.description.to_lowercase().contains("lsp")
                   || m.description.to_lowercase().contains("language server"))
            .unwrap_or(false);

        // Check if it has MCP servers
        let has_mcp = metadata
            .map(|m| m.description.to_lowercase().contains("mcp"))
            .unwrap_or(false);

        // Determine item type - MCPs override category-based detection
        let category = metadata.and_then(|m| m.category.as_deref());
        let item_type = if has_mcp {
            ItemType::Trinket  // MCPs are always trinkets
        } else {
            category_to_item_type(category)
        };

        let rarity = determine_rarity(metadata, has_lsp, has_mcp);

        // Estimate token weight from install path content
        let token_weight = estimate_plugin_weight(&entry.install_path);

        // Check if enabled
        let enabled = enabled_plugins.get(plugin_id).copied().unwrap_or(false);

        let author = metadata
            .and_then(|m| m.author.as_ref())
            .map(|a| a.name().to_string());

        items.push(InventoryItem {
            id: plugin_id.clone(),
            name: display_name,
            description,
            item_type,
            rarity,
            source: ItemSource::Plugin,
            source_path: entry.install_path.clone(),
            token_weight,
            enabled,
            version: Some(entry.version.clone()),
            author,
            status: None,
        });
    }

    // Also scan for available (but not installed) plugins from marketplace
    for (plugin_id, metadata) in &catalog {
        if !installed.contains_key(plugin_id) {
            let has_lsp = metadata.description.to_lowercase().contains("lsp")
                || metadata.description.to_lowercase().contains("language server");
            let has_mcp = metadata.description.to_lowercase().contains("mcp");

            // Determine item type - MCPs override category-based detection
            let category = metadata.category.as_deref();
            let item_type = if has_mcp {
                ItemType::Trinket  // MCPs are always trinkets
            } else {
                category_to_item_type(category)
            };

            let rarity = determine_rarity(Some(metadata), has_lsp, has_mcp);

            let author = metadata.author.as_ref().map(|a| a.name().to_string());

            items.push(InventoryItem {
                id: plugin_id.clone(),
                name: metadata.name.clone(),
                description: metadata.description.clone(),
                item_type,
                rarity,
                source: ItemSource::Plugin,
                source_path: String::new(), // Not installed
                token_weight: 5000, // Estimated base weight
                enabled: false,
                version: metadata.version.clone(),
                author,
                status: None,
            });
        }
    }

    // Sort by name
    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Note: Other item types (commands, skills, hooks, subagents, claudemd)
    // are now scanned by inventory.rs for proper project context support

    ScanResult {
        items,
        errors,
        scan_duration_ms: start.elapsed().as_millis() as u64,
    }
}

/// Estimate token weight for a plugin based on its install path
fn estimate_plugin_weight(install_path: &str) -> u32 {
    if install_path.is_empty() {
        return 5000; // Base estimate for non-installed plugins
    }

    let path = PathBuf::from(install_path);
    if !path.exists() {
        return 5000;
    }

    let mut total_chars = 0u64;

    // Walk directory and sum up file sizes for relevant files
    if let Ok(entries) = fs::read_dir(&path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let entry_path = entry.path();

            // Count markdown and JSON files
            if let Some(ext) = entry_path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if ext_str == "md" || ext_str == "json" {
                    if let Ok(content) = fs::read_to_string(&entry_path) {
                        total_chars += content.len() as u64;
                    }
                }
            }
        }
    }

    // Convert chars to tokens (rough estimate: 4 chars per token)
    // Add base overhead for plugin infrastructure
    let tokens = (total_chars / 4) as u32 + 1000;

    // Clamp to reasonable range
    tokens.clamp(1000, 50000)
}
