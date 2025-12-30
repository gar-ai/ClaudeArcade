//! Commands for project scanning and metadata extraction
//! Scans project's .claude folder for commands, skills, agents, hooks, etc.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Summary of Claude-specific items found in a project
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeItemsSummary {
    pub has_claude_folder: bool,
    pub has_claude_md: bool,
    pub command_count: u32,
    pub skill_count: u32,
    pub hook_count: u32,
    pub subagent_count: u32,
    pub mcp_count: u32,
    pub total_token_estimate: u32,
    pub commands: Vec<String>,
    pub skills: Vec<String>,
    pub subagents: Vec<String>,
}

/// Full project scan result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectScanResult {
    pub claude_items: ClaudeItemsSummary,
    pub project_type: String,
    pub has_package_json: bool,
    pub has_cargo_toml: bool,
    pub has_pyproject: bool,
    pub has_go_mod: bool,
    pub has_gemfile: bool,
}

/// Detect the primary project type from config files
fn detect_project_type(path: &PathBuf) -> String {
    // Check in priority order
    if path.join("Cargo.toml").exists() {
        return "rust".to_string();
    }
    if path.join("go.mod").exists() {
        return "go".to_string();
    }
    if path.join("pyproject.toml").exists() || path.join("setup.py").exists() || path.join("requirements.txt").exists() {
        return "python".to_string();
    }
    if path.join("Gemfile").exists() {
        return "ruby".to_string();
    }
    if path.join("pom.xml").exists() || path.join("build.gradle").exists() {
        return "java".to_string();
    }

    // Check package.json for JS/TS
    if path.join("package.json").exists() {
        // Check for TypeScript indicators
        if path.join("tsconfig.json").exists() {
            return "typescript".to_string();
        }
        return "javascript".to_string();
    }

    "generic".to_string()
}

/// Count markdown files in a directory
fn count_md_files(dir: &PathBuf) -> (u32, Vec<String>) {
    let mut count = 0;
    let mut names = Vec::new();

    if !dir.exists() {
        return (count, names);
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |e| e == "md") {
                count += 1;
                if let Some(stem) = path.file_stem() {
                    names.push(stem.to_string_lossy().to_string());
                }
            }
        }
    }

    (count, names)
}

/// Count skill directories
fn count_skills(dir: &PathBuf) -> (u32, Vec<String>) {
    let mut count = 0;
    let mut names = Vec::new();

    if !dir.exists() {
        return (count, names);
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Check if it has a skill.md file
                if path.join("skill.md").exists() || path.join("SKILL.md").exists() {
                    count += 1;
                    if let Some(name) = path.file_name() {
                        names.push(name.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    (count, names)
}

/// Count hooks from settings.json
fn count_hooks(claude_dir: &PathBuf) -> u32 {
    let settings_path = claude_dir.join("settings.json");
    if !settings_path.exists() {
        return 0;
    }

    if let Ok(content) = fs::read_to_string(&settings_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(hooks) = json.get("hooks") {
                if let Some(hooks_obj) = hooks.as_object() {
                    return hooks_obj.len() as u32;
                }
            }
        }
    }

    0
}

/// Count MCP servers from settings.json
fn count_mcp_servers(claude_dir: &PathBuf) -> u32 {
    let settings_path = claude_dir.join("settings.json");
    if !settings_path.exists() {
        return 0;
    }

    if let Ok(content) = fs::read_to_string(&settings_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(mcp) = json.get("mcpServers") {
                if let Some(mcp_obj) = mcp.as_object() {
                    return mcp_obj.len() as u32;
                }
            }
        }
    }

    0
}

/// Estimate total tokens from .claude folder
fn estimate_tokens(claude_dir: &PathBuf) -> u32 {
    let mut total_chars: u32 = 0;

    // Walk the .claude directory and sum file sizes
    fn walk_dir(dir: &PathBuf, total: &mut u32) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Ok(metadata) = fs::metadata(&path) {
                        *total += metadata.len() as u32;
                    }
                } else if path.is_dir() {
                    walk_dir(&path, total);
                }
            }
        }
    }

    if claude_dir.exists() {
        walk_dir(claude_dir, &mut total_chars);
    }

    // Rough estimate: 4 chars per token
    total_chars / 4
}

/// Scan a project's .claude folder and return metadata
#[tauri::command]
pub fn scan_project_claude_items(path: String) -> Result<ProjectScanResult, String> {
    let project_path = PathBuf::from(&path);

    if !project_path.exists() {
        return Err(format!("Project path does not exist: {}", path));
    }

    let claude_dir = project_path.join(".claude");

    // Check for CLAUDE.md in various locations
    let has_claude_md = project_path.join("CLAUDE.md").exists()
        || claude_dir.join("CLAUDE.md").exists()
        || project_path.join("CLAUDE.local.md").exists();

    // Scan commands
    let commands_dir = claude_dir.join("commands");
    let (command_count, commands) = count_md_files(&commands_dir);

    // Scan skills
    let skills_dir = claude_dir.join("skills");
    let (skill_count, skills) = count_skills(&skills_dir);

    // Scan subagents
    let agents_dir = claude_dir.join("agents");
    let (subagent_count, subagents) = count_md_files(&agents_dir);

    // Count hooks and MCP servers from settings.json
    let hook_count = count_hooks(&claude_dir);
    let mcp_count = count_mcp_servers(&claude_dir);

    // Estimate total tokens
    let total_token_estimate = estimate_tokens(&claude_dir);

    let claude_items = ClaudeItemsSummary {
        has_claude_folder: claude_dir.exists(),
        has_claude_md,
        command_count,
        skill_count,
        hook_count,
        subagent_count,
        mcp_count,
        total_token_estimate,
        commands,
        skills,
        subagents,
    };

    // Detect project type
    let project_type = detect_project_type(&project_path);

    Ok(ProjectScanResult {
        claude_items,
        project_type,
        has_package_json: project_path.join("package.json").exists(),
        has_cargo_toml: project_path.join("Cargo.toml").exists(),
        has_pyproject: project_path.join("pyproject.toml").exists(),
        has_go_mod: project_path.join("go.mod").exists(),
        has_gemfile: project_path.join("Gemfile").exists(),
    })
}
