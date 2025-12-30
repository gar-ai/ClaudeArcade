use std::fs;
use std::path::PathBuf;
use serde::Deserialize;

use crate::types::{InventoryItem, ItemType, ItemRarity, ItemSource};
use super::plugin::claude_config_dir;

/// Hook event type
#[derive(Debug, Clone, PartialEq)]
pub enum HookEvent {
    PreToolUse,       // Before tool execution (validation)
    PostToolUse,      // After tool execution (formatting, linting)
    SessionStart,     // On session start (context injection)
    Stop,             // On exit (cleanup)
    UserPromptSubmit, // Before processing user input
    PermissionRequest, // Permission dialog
}

impl HookEvent {
    fn from_str(s: &str) -> Option<Self> {
        match s {
            "PreToolUse" => Some(HookEvent::PreToolUse),
            "PostToolUse" => Some(HookEvent::PostToolUse),
            "SessionStart" => Some(HookEvent::SessionStart),
            "Stop" => Some(HookEvent::Stop),
            "UserPromptSubmit" => Some(HookEvent::UserPromptSubmit),
            "PermissionRequest" => Some(HookEvent::PermissionRequest),
            _ => None,
        }
    }

    fn description(&self) -> &str {
        match self {
            HookEvent::PreToolUse => "Guards operations before execution",
            HookEvent::PostToolUse => "Runs after tool execution (formatting, linting)",
            HookEvent::SessionStart => "Injects context at session start",
            HookEvent::Stop => "Intercepts exit attempts",
            HookEvent::UserPromptSubmit => "Processes user input before Claude",
            HookEvent::PermissionRequest => "Handles permission requests",
        }
    }

    fn as_str(&self) -> &str {
        match self {
            HookEvent::PreToolUse => "PreToolUse",
            HookEvent::PostToolUse => "PostToolUse",
            HookEvent::SessionStart => "SessionStart",
            HookEvent::Stop => "Stop",
            HookEvent::UserPromptSubmit => "UserPromptSubmit",
            HookEvent::PermissionRequest => "PermissionRequest",
        }
    }

    /// Get the ItemType for this hook event (simplified - all hooks are 'hooks' type)
    fn item_type(&self) -> ItemType {
        ItemType::Hooks  // All hooks are consolidated into one type
    }
}

/// Scope of the hook
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum HookScope {
    User,     // ~/.claude/settings.json
    Project,  // .claude/settings.json
}

impl HookScope {
    fn as_str(&self) -> &str {
        match self {
            HookScope::User => "user",
            HookScope::Project => "project",
        }
    }
}

/// Hook configuration from settings.json
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum HookConfig {
    CommandOnly(String),
    Full(HookEntry),
}

#[derive(Debug, Clone, Deserialize)]
struct HookEntry {
    matcher: Option<String>,
    command: Option<serde_json::Value>, // Can be string or array
    prompt: Option<String>,
    #[serde(default)]
    timeout: Option<u64>,
}

impl HookConfig {
    fn get_command(&self) -> Option<String> {
        match self {
            HookConfig::CommandOnly(cmd) => Some(cmd.clone()),
            HookConfig::Full(entry) => {
                if let Some(cmd) = &entry.command {
                    Some(format_command(cmd))
                } else if let Some(prompt) = &entry.prompt {
                    Some(format!("(prompt) {}", prompt))
                } else {
                    None
                }
            }
        }
    }

    fn get_matcher(&self) -> Option<String> {
        match self {
            HookConfig::CommandOnly(_) => None,
            HookConfig::Full(entry) => entry.matcher.clone(),
        }
    }
}

/// Format command from JSON value (string or array)
fn format_command(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Array(arr) => {
            arr.iter()
                .filter_map(|v| v.as_str())
                .collect::<Vec<_>>()
                .join(" ")
        }
        _ => value.to_string(),
    }
}

/// Settings file structure (partial)
#[derive(Debug, Default, Deserialize)]
struct SettingsFile {
    #[serde(default)]
    hooks: std::collections::HashMap<String, Vec<HookConfig>>,
}

/// Get the user settings file path
fn get_user_settings_path() -> Option<PathBuf> {
    claude_config_dir().map(|d| d.join("settings.json"))
}

/// Get the project settings file path
fn get_project_settings_path(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".claude")
        .join("settings.json")
}

/// Read and parse settings file
fn read_settings_file(path: &PathBuf) -> Option<SettingsFile> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

/// Determine rarity based on hook properties
fn determine_hook_rarity(event: &HookEvent, has_matcher: bool, command: &str) -> ItemRarity {
    // Security hooks (PreToolUse with matchers) are more valuable
    if *event == HookEvent::PreToolUse && has_matcher {
        return ItemRarity::Rare;
    }

    // Hooks with complex commands are more sophisticated
    if command.contains("&&") || command.len() > 50 {
        return ItemRarity::Rare;
    }

    // PostToolUse hooks (linting/formatting) are useful
    if *event == HookEvent::PostToolUse {
        return ItemRarity::Uncommon;
    }

    ItemRarity::Common
}

/// Estimate token weight for a hook
fn estimate_hook_weight(command: &str) -> u32 {
    // Base weight for hook infrastructure
    let base = 500;

    // Add weight based on command complexity
    let cmd_tokens = (command.len() / 4) as u32;

    (base + cmd_tokens).clamp(500, 5000)
}

/// Generate a display name for a hook
fn generate_hook_name(event: &HookEvent, matcher: &Option<String>, command: &str, _index: usize) -> String {
    // Try to create a descriptive name
    if let Some(matcher) = matcher {
        format!("{} Guard: {}", event.as_str(), matcher)
    } else if command.contains("eslint") {
        format!("{}: ESLint", event.as_str())
    } else if command.contains("prettier") {
        format!("{}: Prettier", event.as_str())
    } else if command.contains("git") {
        format!("{}: Git", event.as_str())
    } else {
        // Extract first word of command as name
        let first_word = command
            .split_whitespace()
            .next()
            .unwrap_or("Hook")
            .split('/')
            .last()
            .unwrap_or("Hook");
        format!("{}: {}", event.as_str(), first_word)
    }
}

/// Generate a description for a hook
fn generate_hook_description(event: &HookEvent, matcher: &Option<String>, command: &str) -> String {
    let base_desc = event.description();

    if let Some(matcher) = matcher {
        format!("{}. Matches: {}. Runs: {}", base_desc, matcher, command)
    } else {
        format!("{}. Runs: {}", base_desc, command)
    }
}

/// Scan hooks from a settings file
fn scan_hooks_from_settings(settings: &SettingsFile, scope: HookScope) -> Vec<InventoryItem> {
    let mut hooks = Vec::new();

    for (event_name, hook_configs) in &settings.hooks {
        let event = match HookEvent::from_str(event_name) {
            Some(e) => e,
            None => continue, // Skip unknown events
        };

        for (index, config) in hook_configs.iter().enumerate() {
            let command = match config.get_command() {
                Some(cmd) => cmd,
                None => continue,
            };

            let matcher = config.get_matcher();

            // Generate name and description
            let name = generate_hook_name(&event, &matcher, &command, index);
            let description = generate_hook_description(&event, &matcher, &command);

            // Determine rarity
            let rarity = determine_hook_rarity(&event, matcher.is_some(), &command);

            // Estimate token weight
            let token_weight = estimate_hook_weight(&command);

            // Create unique ID
            let id = format!("hook_{}_{}_{}", scope.as_str(), event.as_str().to_lowercase(), index);

            hooks.push(InventoryItem {
                id,
                name,
                description,
                item_type: event.item_type(), // Map to armor slot based on hook event
                rarity,
                source: ItemSource::Hook,
                source_path: String::new(),
                token_weight,
                enabled: true, // Hooks in settings are always active
                version: None,
                author: None,
                status: None,
            });
        }
    }

    hooks
}

/// Scan all hook locations and return inventory items
pub fn scan_hooks(project_path: Option<&str>) -> Vec<InventoryItem> {
    let mut all_hooks = Vec::new();

    // Scan user hooks (~/.claude/settings.json)
    if let Some(user_path) = get_user_settings_path() {
        if let Some(settings) = read_settings_file(&user_path) {
            let user_hooks = scan_hooks_from_settings(&settings, HookScope::User);
            all_hooks.extend(user_hooks);
        }
    }

    // Scan project hooks (.claude/settings.json) if project path provided
    if let Some(path) = project_path {
        let project_path = get_project_settings_path(path);
        if let Some(settings) = read_settings_file(&project_path) {
            let project_hooks = scan_hooks_from_settings(&settings, HookScope::Project);
            all_hooks.extend(project_hooks);
        }
    }

    // Sort by name
    all_hooks.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    all_hooks
}
