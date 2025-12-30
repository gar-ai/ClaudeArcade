//! Scanner for CLAUDE.md memory files
//! These files shape Claude's behavior and provide system-level context.

use std::fs;
use std::path::PathBuf;

use crate::types::{InventoryItem, ItemType, ItemRarity, ItemSource};
use super::plugin::claude_config_dir;

/// Scope of the CLAUDE.md file
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ClaudeMdScope {
    UserGlobal,    // ~/.claude/CLAUDE.md
    ProjectRoot,   // ./CLAUDE.md (in project root)
    ProjectClaude, // ./.claude/CLAUDE.md
    ProjectLocal,  // ./CLAUDE.local.md (git-ignored)
}

impl ClaudeMdScope {
    fn as_str(&self) -> &str {
        match self {
            ClaudeMdScope::UserGlobal => "user-global",
            ClaudeMdScope::ProjectRoot => "project-root",
            ClaudeMdScope::ProjectClaude => "project-claude",
            ClaudeMdScope::ProjectLocal => "project-local",
        }
    }

    fn description(&self) -> &str {
        match self {
            ClaudeMdScope::UserGlobal => "Global user memory (applies to all projects)",
            ClaudeMdScope::ProjectRoot => "Project memory (shared with team via git)",
            ClaudeMdScope::ProjectClaude => "Project memory (in .claude folder)",
            ClaudeMdScope::ProjectLocal => "Local project notes (git-ignored, personal)",
        }
    }

    fn rarity(&self) -> ItemRarity {
        match self {
            ClaudeMdScope::UserGlobal => ItemRarity::Epic,     // Global = very important
            ClaudeMdScope::ProjectRoot => ItemRarity::Rare,    // Team shared = important
            ClaudeMdScope::ProjectClaude => ItemRarity::Rare,
            ClaudeMdScope::ProjectLocal => ItemRarity::Uncommon, // Personal notes
        }
    }
}

/// Get the user global CLAUDE.md path
fn get_user_global_claudemd() -> Option<PathBuf> {
    claude_config_dir().map(|d| d.join("CLAUDE.md"))
}

/// Estimate token weight from file content
fn estimate_claudemd_weight(content: &str) -> u32 {
    // Roughly 4 characters per token
    let tokens = (content.len() / 4) as u32;
    // Add some overhead for parsing
    tokens.clamp(500, 50000)
}

/// Extract first meaningful line as name/title
fn extract_title(content: &str) -> Option<String> {
    // Look for first heading
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("# ") {
            return Some(trimmed[2..].trim().to_string());
        }
    }
    None
}

/// Extract description from content
fn extract_description(content: &str) -> String {
    // Skip headings, find first meaningful paragraph
    let mut found_heading = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('#') {
            found_heading = true;
            continue;
        }
        if found_heading && !trimmed.is_empty() {
            let desc = if trimmed.len() > 150 {
                format!("{}...", &trimmed[..150])
            } else {
                trimmed.to_string()
            };
            return desc;
        }
    }
    "Claude memory and instructions".to_string()
}

/// Scan a specific CLAUDE.md location
fn scan_claudemd_file(path: &PathBuf, scope: ClaudeMdScope) -> Option<InventoryItem> {
    if !path.exists() {
        return None;
    }

    let content = fs::read_to_string(path).ok()?;

    if content.trim().is_empty() {
        return None;
    }

    let _file_name = path.file_name()?.to_str()?;

    // Generate display name
    let display_name = extract_title(&content)
        .unwrap_or_else(|| {
            match scope {
                ClaudeMdScope::UserGlobal => "Global Memory".to_string(),
                ClaudeMdScope::ProjectRoot => "Project Memory".to_string(),
                ClaudeMdScope::ProjectClaude => "Project Memory".to_string(),
                ClaudeMdScope::ProjectLocal => "Local Notes".to_string(),
            }
        });

    let description = format!("{} - {}", scope.description(), extract_description(&content));

    let token_weight = estimate_claudemd_weight(&content);

    let id = format!("claudemd_{}_{}", scope.as_str(),
        path.to_string_lossy()
            .replace(['/', '\\', '.', ' '], "_")
            .chars()
            .take(50)
            .collect::<String>()
    );

    Some(InventoryItem {
        id,
        name: display_name,
        description,
        item_type: ItemType::Helm,  // CLAUDE.md files are Helms (mind/persona)
        rarity: scope.rarity(),
        source: ItemSource::ClaudeMd,
        source_path: path.to_string_lossy().to_string(),
        token_weight,
        enabled: true,  // CLAUDE.md files are always active
        version: None,
        author: None,
        status: None,
    })
}

/// Scan all CLAUDE.md locations and return inventory items
pub fn scan_claudemd(project_path: Option<&str>) -> Vec<InventoryItem> {
    let mut all_items = Vec::new();

    // Scan user global CLAUDE.md (~/.claude/CLAUDE.md)
    if let Some(user_path) = get_user_global_claudemd() {
        if let Some(item) = scan_claudemd_file(&user_path, ClaudeMdScope::UserGlobal) {
            all_items.push(item);
        }
    }

    // Scan project locations if project path provided
    if let Some(path) = project_path {
        let project_root = PathBuf::from(path);

        // Project root CLAUDE.md
        let root_md = project_root.join("CLAUDE.md");
        if let Some(item) = scan_claudemd_file(&root_md, ClaudeMdScope::ProjectRoot) {
            all_items.push(item);
        }

        // .claude/CLAUDE.md
        let claude_folder_md = project_root.join(".claude").join("CLAUDE.md");
        if let Some(item) = scan_claudemd_file(&claude_folder_md, ClaudeMdScope::ProjectClaude) {
            all_items.push(item);
        }

        // CLAUDE.local.md (git-ignored)
        let local_md = project_root.join("CLAUDE.local.md");
        if let Some(item) = scan_claudemd_file(&local_md, ClaudeMdScope::ProjectLocal) {
            all_items.push(item);
        }
    }

    // Sort by scope importance (global first)
    all_items.sort_by(|a, b| {
        // Epic > Rare > Uncommon
        match (&b.rarity, &a.rarity) {
            (ItemRarity::Epic, ItemRarity::Epic) => std::cmp::Ordering::Equal,
            (ItemRarity::Epic, _) => std::cmp::Ordering::Less,
            (_, ItemRarity::Epic) => std::cmp::Ordering::Greater,
            (ItemRarity::Rare, ItemRarity::Rare) => std::cmp::Ordering::Equal,
            (ItemRarity::Rare, _) => std::cmp::Ordering::Less,
            (_, ItemRarity::Rare) => std::cmp::Ordering::Greater,
            _ => std::cmp::Ordering::Equal,
        }
    });

    all_items
}
