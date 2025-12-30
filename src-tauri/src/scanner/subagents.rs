//! Scanner for Claude subagents (from ~/.claude/agents/ and .claude/agents/)
//! Subagents are specialized AI assistants with isolated context windows.

use std::fs;
use std::path::PathBuf;
use serde::Deserialize;

use crate::types::{InventoryItem, ItemType, ItemRarity, ItemSource};
use super::plugin::claude_config_dir;

/// Subagent metadata from YAML frontmatter
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct SubagentFrontmatter {
    name: Option<String>,
    description: Option<String>,
    tools: Option<Vec<String>>,
    model: Option<String>,
    permission_mode: Option<String>,
    skills: Option<Vec<String>>,
}

/// Scope of the subagent
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SubagentScope {
    User,     // ~/.claude/agents/
    Project,  // .claude/agents/
}

impl SubagentScope {
    fn as_str(&self) -> &str {
        match self {
            SubagentScope::User => "user",
            SubagentScope::Project => "project",
        }
    }
}

/// Get the user agents directory
fn get_user_agents_dir() -> Option<PathBuf> {
    claude_config_dir().map(|d| d.join("agents"))
}

/// Get the project agents directory for a given project path
fn get_project_agents_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join(".claude").join("agents")
}

/// Parse YAML frontmatter from markdown content
fn parse_frontmatter(content: &str) -> Option<SubagentFrontmatter> {
    let content = content.trim();
    if !content.starts_with("---") {
        return None;
    }

    let after_first = &content[3..];
    let end_pos = after_first.find("---")?;
    let yaml_content = &after_first[..end_pos].trim();

    serde_yaml::from_str(yaml_content).ok()
}

/// Extract first non-empty, non-heading line as description
fn extract_description_from_content(content: &str) -> Option<String> {
    let body = if content.trim().starts_with("---") {
        if let Some(pos) = content[3..].find("---") {
            &content[pos + 6..]
        } else {
            content
        }
    } else {
        content
    };

    body.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty() && !line.starts_with('#'))
        .map(|s| {
            if s.len() > 150 {
                format!("{}...", &s[..150])
            } else {
                s.to_string()
            }
        })
}

/// Determine rarity based on subagent properties
fn determine_subagent_rarity(frontmatter: &Option<SubagentFrontmatter>, scope: SubagentScope, agent_id: &str) -> ItemRarity {
    // Known powerful agents
    let legendary_agents = ["code-reviewer", "architect", "security-auditor"];
    let epic_agents = ["test-runner", "documentation-writer", "refactor-assistant"];

    if legendary_agents.contains(&agent_id) {
        return ItemRarity::Legendary;
    }

    if epic_agents.contains(&agent_id) {
        return ItemRarity::Epic;
    }

    // Agents with many tools or skills are more powerful
    if let Some(fm) = frontmatter {
        let tool_count = fm.tools.as_ref().map_or(0, |t| t.len());
        let skill_count = fm.skills.as_ref().map_or(0, |s| s.len());
        let total = tool_count + skill_count;

        if total > 8 {
            return ItemRarity::Epic;
        }
        if total > 4 {
            return ItemRarity::Rare;
        }

        // Agents with specific models are more specialized
        if fm.model.is_some() {
            return ItemRarity::Rare;
        }
    }

    match scope {
        SubagentScope::User => ItemRarity::Uncommon,
        SubagentScope::Project => ItemRarity::Common,
    }
}

/// Estimate token weight for a subagent
/// Note: Subagents have ISOLATED context, so this is just for display
fn estimate_subagent_weight(agent_file: &PathBuf) -> u32 {
    // Subagents don't consume main context!
    // But we show a small "management overhead" cost
    if let Ok(content) = fs::read_to_string(agent_file) {
        let chars = content.len() as u32;
        // Very small overhead - subagents are efficient
        (chars / 10).clamp(100, 500)
    } else {
        200
    }
}

/// Format agent name from file name
fn format_agent_name(file_name: &str) -> String {
    // Remove .md extension and convert kebab-case to Title Case
    let name = file_name.trim_end_matches(".md");
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

/// Scan a directory for subagent files
fn scan_agents_dir(dir: &PathBuf, scope: SubagentScope) -> Vec<InventoryItem> {
    let mut agents = Vec::new();

    if !dir.exists() {
        return agents;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return agents,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();

        // Only process .md files
        if !path.is_file() {
            continue;
        }

        let extension = path.extension().and_then(|e| e.to_str());
        if extension != Some("md") {
            continue;
        }

        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        let agent_id = file_name.trim_end_matches(".md").to_string();

        let content = fs::read_to_string(&path).unwrap_or_default();
        let frontmatter = parse_frontmatter(&content);

        // Get name from frontmatter or file name
        let display_name = frontmatter
            .as_ref()
            .and_then(|fm| fm.name.clone())
            .unwrap_or_else(|| format_agent_name(&file_name));

        // Get description
        let description = frontmatter
            .as_ref()
            .and_then(|fm| fm.description.clone())
            .or_else(|| extract_description_from_content(&content))
            .unwrap_or_else(|| format!("Subagent: {} (isolated context)", display_name));

        // Determine rarity
        let rarity = determine_subagent_rarity(&frontmatter, scope, &agent_id);

        // Estimate token weight (subagents are very lightweight in main context!)
        let token_weight = estimate_subagent_weight(&path);

        // Create unique ID including scope
        let id = format!("subagent_{}_{}", scope.as_str(), agent_id);

        agents.push(InventoryItem {
            id,
            name: display_name,
            description,
            item_type: ItemType::Companion,  // Subagents are Companions (party members)
            rarity,
            source: ItemSource::Subagent,
            source_path: path.to_string_lossy().to_string(),
            token_weight,
            enabled: true,
            version: None,
            author: None,
            status: None,
        });
    }

    agents
}

/// Scan all subagent locations and return inventory items
pub fn scan_subagents(project_path: Option<&str>) -> Vec<InventoryItem> {
    let mut all_agents = Vec::new();

    // Scan user agents (~/.claude/agents/)
    if let Some(user_dir) = get_user_agents_dir() {
        let user_agents = scan_agents_dir(&user_dir, SubagentScope::User);
        all_agents.extend(user_agents);
    }

    // Scan project agents (.claude/agents/) if project path provided
    if let Some(path) = project_path {
        let project_dir = get_project_agents_dir(path);
        let project_agents = scan_agents_dir(&project_dir, SubagentScope::Project);
        all_agents.extend(project_agents);
    }

    // Sort by name
    all_agents.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    all_agents
}
