use std::fs;
use std::path::PathBuf;
use serde::Deserialize;

use crate::types::{InventoryItem, ItemType, ItemRarity, ItemSource};
use super::plugin::claude_config_dir;

/// Skill metadata from YAML frontmatter in SKILL.md
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
    allowed_tools: Option<Vec<String>>,
}

/// Scope of the skill
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SkillScope {
    User,     // ~/.claude/skills/
    Project,  // .claude/skills/
}

impl SkillScope {
    fn as_str(&self) -> &str {
        match self {
            SkillScope::User => "user",
            SkillScope::Project => "project",
        }
    }
}

/// Get the user skills directory
fn get_user_skills_dir() -> Option<PathBuf> {
    claude_config_dir().map(|d| d.join("skills"))
}

/// Get the project skills directory for a given project path
fn get_project_skills_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join(".claude").join("skills")
}

/// Parse YAML frontmatter from markdown content
fn parse_frontmatter(content: &str) -> Option<SkillFrontmatter> {
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

    // Find first meaningful line (skip headings)
    body.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty() && !line.starts_with('#'))
        .map(|s| {
            // Truncate if too long
            if s.len() > 150 {
                format!("{}...", &s[..150])
            } else {
                s.to_string()
            }
        })
}

/// Determine rarity based on skill properties
fn determine_skill_rarity(frontmatter: &Option<SkillFrontmatter>, scope: SkillScope, skill_id: &str) -> ItemRarity {
    // Known powerful skills
    let legendary_skills = ["skill-creator", "mcp-builder", "web-artifacts-builder"];
    let epic_skills = ["code-reviewer", "algorithmic-art", "webapp-testing", "frontend-design"];

    if legendary_skills.contains(&skill_id) {
        return ItemRarity::Legendary;
    }

    if epic_skills.contains(&skill_id) {
        return ItemRarity::Epic;
    }

    // Skills with many allowed-tools are more powerful
    if let Some(fm) = frontmatter {
        if let Some(tools) = &fm.allowed_tools {
            if tools.len() > 5 {
                return ItemRarity::Epic;
            }
            if tools.len() > 2 {
                return ItemRarity::Rare;
            }
        }
    }

    // User skills are generally more polished
    match scope {
        SkillScope::User => ItemRarity::Uncommon,
        SkillScope::Project => ItemRarity::Common,
    }
}

/// Estimate token weight for a skill
fn estimate_skill_weight(skill_dir: &PathBuf) -> u32 {
    let mut total_chars = 0u64;

    // Count all markdown files in the skill directory
    if let Ok(entries) = fs::read_dir(skill_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "md") {
                if let Ok(content) = fs::read_to_string(&path) {
                    total_chars += content.len() as u64;
                }
            }
        }
    }

    // Convert chars to tokens (rough estimate: 4 chars per token)
    // Add overhead for skill infrastructure
    let tokens = (total_chars / 4) as u32 + 1500;

    // Clamp to reasonable range
    tokens.clamp(1000, 25000)
}

/// Format skill name from directory name
fn format_skill_name(dir_name: &str) -> String {
    // Convert kebab-case to Title Case
    dir_name
        .split('-')
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

/// Scan a directory for skill subdirectories
fn scan_skills_dir(dir: &PathBuf, scope: SkillScope) -> Vec<InventoryItem> {
    let mut skills = Vec::new();

    if !dir.exists() {
        return skills;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return skills,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();

        // Only process directories
        if !path.is_dir() {
            continue;
        }

        let skill_id = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        // Look for SKILL.md (case insensitive)
        let skill_md_path = find_skill_md(&path);

        let (frontmatter, content) = if let Some(md_path) = skill_md_path {
            let content = fs::read_to_string(&md_path).unwrap_or_default();
            let fm = parse_frontmatter(&content);
            (fm, content)
        } else {
            (None, String::new())
        };

        // Get name from frontmatter or directory name
        let display_name = frontmatter
            .as_ref()
            .and_then(|fm| fm.name.clone())
            .unwrap_or_else(|| format_skill_name(&skill_id));

        // Get description
        let description = frontmatter
            .as_ref()
            .and_then(|fm| fm.description.clone())
            .or_else(|| extract_description_from_content(&content))
            .unwrap_or_else(|| format!("AI skill: {}", display_name));

        // Determine rarity
        let rarity = determine_skill_rarity(&frontmatter, scope, &skill_id);

        // Estimate token weight
        let token_weight = estimate_skill_weight(&path);

        // Create unique ID including scope
        let id = format!("skill_{}_{}", scope.as_str(), skill_id);

        skills.push(InventoryItem {
            id,
            name: display_name,
            description,
            item_type: ItemType::Spell,  // Skills are Spells (learned procedural knowledge)
            rarity,
            source: ItemSource::Skill,
            source_path: path.to_string_lossy().to_string(),
            token_weight,
            enabled: true, // Skills are always "enabled" (loaded on demand by Claude)
            version: None,
            author: None,
            status: None,
        });
    }

    skills
}

/// Find SKILL.md file (case insensitive)
fn find_skill_md(skill_dir: &PathBuf) -> Option<PathBuf> {
    let candidates = ["SKILL.md", "skill.md", "Skill.md"];

    for name in candidates {
        let path = skill_dir.join(name);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

/// Scan all skill locations and return inventory items
pub fn scan_skills(project_path: Option<&str>) -> Vec<InventoryItem> {
    let mut all_skills = Vec::new();

    // Scan user skills (~/.claude/skills/)
    if let Some(user_dir) = get_user_skills_dir() {
        let user_skills = scan_skills_dir(&user_dir, SkillScope::User);
        all_skills.extend(user_skills);
    }

    // Scan project skills (.claude/skills/) if project path provided
    if let Some(path) = project_path {
        let project_dir = get_project_skills_dir(path);
        let project_skills = scan_skills_dir(&project_dir, SkillScope::Project);
        all_skills.extend(project_skills);
    }

    // Sort by name
    all_skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    all_skills
}
