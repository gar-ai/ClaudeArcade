use std::time::Instant;
use crate::scanner::{
    scan_plugins, scan_slash_commands, scan_skills,
    scan_hooks, scan_subagents, scan_claudemd
};
use crate::types::{ScanResult, InventoryItem};

/// Scan for all available plugins, skills, MCPs, hooks, subagents, and CLAUDE.md files
#[tauri::command]
pub async fn scan_inventory(project_path: Option<String>) -> Result<ScanResult, String> {
    let start = Instant::now();
    let mut all_items: Vec<InventoryItem> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    // Get project path as &str for scanner functions
    let project_path_ref = project_path.as_deref();

    // Scan plugins (MCPs, frameworks)
    let plugin_result = scan_plugins();
    all_items.extend(plugin_result.items);
    errors.extend(plugin_result.errors);

    // Scan slash commands (~/.claude/commands/, .claude/commands/)
    let commands = scan_slash_commands(project_path_ref);
    all_items.extend(commands);

    // Scan skills (~/.claude/skills/)
    let skills = scan_skills(project_path_ref);
    all_items.extend(skills);

    // Scan hooks (from settings.json)
    let hooks = scan_hooks(project_path_ref);
    all_items.extend(hooks);

    // Scan subagents (~/.claude/agents/, .claude/agents/)
    let subagents = scan_subagents(project_path_ref);
    all_items.extend(subagents);

    // Scan CLAUDE.md files (various locations)
    let claudemd = scan_claudemd(project_path_ref);
    all_items.extend(claudemd);

    let duration = start.elapsed();

    Ok(ScanResult {
        items: all_items,
        errors,
        scan_duration_ms: duration.as_millis() as u64,
    })
}
