use std::fs;
use std::path::PathBuf;
use serde::Deserialize;

use crate::types::{InventoryItem, ItemType, ItemRarity, ItemSource};
use super::plugin::claude_config_dir;

/// Slash command metadata from YAML frontmatter
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct CommandFrontmatter {
    description: Option<String>,
    allowed_tools: Option<Vec<String>>,
}

/// Scope of the slash command
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CommandScope {
    User,     // ~/.claude/commands/
    Project,  // .claude/commands/
    Plugin,   // From a plugin
}

impl CommandScope {
    fn as_str(&self) -> &str {
        match self {
            CommandScope::User => "user",
            CommandScope::Project => "project",
            CommandScope::Plugin => "plugin",
        }
    }
}

/// Get the user commands directory
fn get_user_commands_dir() -> Option<PathBuf> {
    claude_config_dir().map(|d| d.join("commands"))
}

/// Get the project commands directory for a given project path
fn get_project_commands_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join(".claude").join("commands")
}

/// Parse YAML frontmatter from markdown content
fn parse_frontmatter(content: &str) -> Option<CommandFrontmatter> {
    // Check if content starts with ---
    let content = content.trim();
    if !content.starts_with("---") {
        return None;
    }

    // Find the closing ---
    let after_first = &content[3..];
    let end_pos = after_first.find("---")?;
    let yaml_content = &after_first[..end_pos].trim();

    // Parse the YAML
    serde_yaml::from_str(yaml_content).ok()
}

/// Extract first non-empty, non-heading line as description
fn extract_description_from_content(content: &str) -> Option<String> {
    // Skip frontmatter if present
    let body = if content.trim().starts_with("---") {
        if let Some(pos) = content[3..].find("---") {
            &content[pos + 6..]
        } else {
            content
        }
    } else {
        content
    };

    // Find first meaningful line
    body.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty() && !line.starts_with('#'))
        .map(|s| {
            // Truncate if too long
            if s.len() > 100 {
                format!("{}...", &s[..100])
            } else {
                s.to_string()
            }
        })
}

/// Determine rarity based on command properties
fn determine_command_rarity(frontmatter: &Option<CommandFrontmatter>, scope: CommandScope) -> ItemRarity {
    // Plugin commands are more special
    if scope == CommandScope::Plugin {
        return ItemRarity::Rare;
    }

    // Commands with allowed-tools are more powerful
    if let Some(fm) = frontmatter {
        if let Some(tools) = &fm.allowed_tools {
            if tools.len() > 3 {
                return ItemRarity::Epic;
            }
            if !tools.is_empty() {
                return ItemRarity::Rare;
            }
        }
    }

    // User commands are uncommon, project commands are common
    match scope {
        CommandScope::User => ItemRarity::Uncommon,
        CommandScope::Project => ItemRarity::Common,
        CommandScope::Plugin => ItemRarity::Rare,
    }
}

/// Estimate token weight for a command
fn estimate_command_weight(content: &str) -> u32 {
    // Basic estimation: 4 chars per token
    let base_tokens = (content.len() / 4) as u32;

    // Add overhead for command infrastructure
    let with_overhead = base_tokens + 500;

    // Clamp to reasonable range
    with_overhead.clamp(500, 10000)
}

/// Format command name from filename
fn format_command_name(filename: &str) -> String {
    // Remove .md extension
    let name = filename.strip_suffix(".md").unwrap_or(filename);

    // Convert kebab-case to Title Case
    name.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Scan a directory for slash command .md files
fn scan_commands_dir(dir: &PathBuf, scope: CommandScope) -> Vec<InventoryItem> {
    let mut commands = Vec::new();

    if !dir.exists() {
        return commands;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return commands,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();

        // Only process .md files
        if path.extension().map_or(true, |e| e != "md") {
            continue;
        }

        let filename = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        // Read file content
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Parse frontmatter
        let frontmatter = parse_frontmatter(&content);

        // Get description
        let description = frontmatter
            .as_ref()
            .and_then(|fm| fm.description.clone())
            .or_else(|| extract_description_from_content(&content))
            .unwrap_or_else(|| format!("Slash command: /{}", filename.strip_suffix(".md").unwrap_or(&filename)));

        // Get command name (without .md)
        let command_name = filename.strip_suffix(".md").unwrap_or(&filename);
        let display_name = format_command_name(&filename);

        // Determine rarity
        let rarity = determine_command_rarity(&frontmatter, scope);

        // Estimate token weight
        let token_weight = estimate_command_weight(&content);

        // Create unique ID including scope
        let id = format!("cmd_{}_{}", scope.as_str(), command_name);

        commands.push(InventoryItem {
            id,
            name: display_name,
            description,
            item_type: ItemType::Ring,  // Slash commands are Rings (quick cast)
            rarity,
            source: ItemSource::Command,  // Using Command source
            source_path: path.to_string_lossy().to_string(),
            token_weight,
            enabled: true, // Commands are always "enabled"
            version: None,
            author: None,
            status: None,
        });
    }

    commands
}

/// Scan all slash command locations and return inventory items
pub fn scan_slash_commands(project_path: Option<&str>) -> Vec<InventoryItem> {
    let mut all_commands = Vec::new();

    // Scan user commands (~/.claude/commands/)
    if let Some(user_dir) = get_user_commands_dir() {
        let user_commands = scan_commands_dir(&user_dir, CommandScope::User);
        all_commands.extend(user_commands);
    }

    // Scan project commands (.claude/commands/) if project path provided
    if let Some(path) = project_path {
        let project_dir = get_project_commands_dir(path);
        let project_commands = scan_commands_dir(&project_dir, CommandScope::Project);
        all_commands.extend(project_commands);
    }

    // Sort by name
    all_commands.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    all_commands
}

/// List of built-in Claude Code commands (for reference/display)
pub fn get_builtin_commands() -> Vec<InventoryItem> {
    let builtins = vec![
        ("context", "Show context usage visualization"),
        ("compact", "Compress conversation context"),
        ("review", "Review code changes"),
        ("pr-comments", "Generate PR comments"),
        ("security-review", "Security analysis of code"),
        ("todo", "Manage task list"),
        ("vim", "Toggle vim mode"),
        ("model", "Switch AI model"),
        ("resume", "Resume previous session"),
        ("add", "Add files to context"),
        ("hooks", "Manage hooks"),
        ("mcp", "MCP server management"),
        ("config", "Show configuration"),
        ("init", "Initialize Claude in project"),
        ("memory", "Manage memory"),
        ("help", "Show help"),
        ("clear", "Clear conversation"),
    ];

    builtins
        .into_iter()
        .map(|(name, desc)| InventoryItem {
            id: format!("builtin_{}", name),
            name: format!("/{}", name),
            description: desc.to_string(),
            item_type: ItemType::Ring,  // Built-in commands are also Rings
            rarity: ItemRarity::Common,
            source: ItemSource::Command,  // Built-in commands
            source_path: String::new(),
            token_weight: 0, // Built-ins don't consume context
            enabled: true,
            version: None,
            author: Some("Anthropic".to_string()),
            status: None,
        })
        .collect()
}
