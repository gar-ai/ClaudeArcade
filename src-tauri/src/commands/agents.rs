//! Commands for managing Claude agents (subagents)
//! Provides CRUD operations for agent markdown files

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Agent configuration data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub description: String,
    pub tools: Option<Vec<String>>,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub skills: Option<Vec<String>>,
    pub system_prompt: String,
}

/// Full agent data including file info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentData {
    pub id: String,
    pub file_path: String,
    pub is_global: bool,
    pub config: AgentConfig,
}

/// Get the global agents directory (~/.claude/agents/)
fn get_global_agents_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".claude")
        .join("agents")
}

/// Get the project agents directory (.claude/agents/)
fn get_project_agents_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join(".claude").join("agents")
}

/// Parse agent markdown file into config
fn parse_agent_file(content: &str) -> Option<AgentConfig> {
    let content = content.trim();

    // Check for frontmatter
    if !content.starts_with("---") {
        // No frontmatter - treat entire content as system prompt
        return Some(AgentConfig {
            name: String::new(),
            description: String::new(),
            tools: None,
            model: None,
            permission_mode: None,
            skills: None,
            system_prompt: content.to_string(),
        });
    }

    // Parse frontmatter
    let after_first = &content[3..];
    let end_pos = after_first.find("---")?;
    let yaml_content = &after_first[..end_pos].trim();
    let body = after_first[end_pos + 3..].trim();

    #[derive(Deserialize)]
    #[serde(rename_all = "kebab-case")]
    struct Frontmatter {
        name: Option<String>,
        description: Option<String>,
        tools: Option<String>,  // Comma-separated in YAML
        model: Option<String>,
        permission_mode: Option<String>,
        skills: Option<String>,  // Comma-separated in YAML
    }

    let fm: Frontmatter = serde_yaml::from_str(yaml_content).ok()?;

    // Parse comma-separated tools
    let tools = fm.tools.map(|t| {
        t.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    });

    // Parse comma-separated skills
    let skills = fm.skills.map(|s| {
        s.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    });

    Some(AgentConfig {
        name: fm.name.unwrap_or_default(),
        description: fm.description.unwrap_or_default(),
        tools,
        model: fm.model,
        permission_mode: fm.permission_mode,
        skills,
        system_prompt: body.to_string(),
    })
}

/// Generate markdown content from agent config
fn generate_agent_content(config: &AgentConfig) -> String {
    let mut lines = vec!["---".to_string()];

    if !config.name.is_empty() {
        lines.push(format!("name: {}", config.name));
    }
    if !config.description.is_empty() {
        lines.push(format!("description: {}", config.description));
    }
    if let Some(ref tools) = config.tools {
        if !tools.is_empty() {
            lines.push(format!("tools: {}", tools.join(", ")));
        }
    }
    if let Some(ref model) = config.model {
        lines.push(format!("model: {}", model));
    }
    if let Some(ref pm) = config.permission_mode {
        lines.push(format!("permission-mode: {}", pm));
    }
    if let Some(ref skills) = config.skills {
        if !skills.is_empty() {
            lines.push(format!("skills: {}", skills.join(", ")));
        }
    }

    lines.push("---".to_string());
    lines.push(String::new());
    lines.push(config.system_prompt.clone());

    lines.join("\n")
}

/// List all agents (global and project)
#[tauri::command]
pub fn list_agents(project_path: Option<String>) -> Vec<AgentData> {
    let mut agents = Vec::new();

    // Scan global agents
    let global_dir = get_global_agents_dir();
    if global_dir.exists() {
        if let Ok(entries) = fs::read_dir(&global_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |e| e == "md") {
                    if let Some(agent) = read_agent_at_path(&path, true) {
                        agents.push(agent);
                    }
                }
            }
        }
    }

    // Scan project agents
    if let Some(ref project) = project_path {
        let project_dir = get_project_agents_dir(project);
        if project_dir.exists() {
            if let Ok(entries) = fs::read_dir(&project_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() && path.extension().map_or(false, |e| e == "md") {
                        if let Some(agent) = read_agent_at_path(&path, false) {
                            agents.push(agent);
                        }
                    }
                }
            }
        }
    }

    agents.sort_by(|a, b| a.config.name.to_lowercase().cmp(&b.config.name.to_lowercase()));
    agents
}

/// Read an agent from a file path
fn read_agent_at_path(path: &PathBuf, is_global: bool) -> Option<AgentData> {
    let content = fs::read_to_string(path).ok()?;
    let config = parse_agent_file(&content)?;

    let file_name = path.file_stem()?.to_str()?;
    let id = file_name.to_string();

    Some(AgentData {
        id,
        file_path: path.to_string_lossy().to_string(),
        is_global,
        config,
    })
}

/// Get a single agent by ID
#[tauri::command]
pub fn get_agent(agent_id: String, is_global: bool, project_path: Option<String>) -> Result<AgentData, String> {
    let file_path = if is_global {
        get_global_agents_dir().join(format!("{}.md", agent_id))
    } else {
        let project = project_path.ok_or("Project path required for project agents")?;
        get_project_agents_dir(&project).join(format!("{}.md", agent_id))
    };

    read_agent_at_path(&file_path, is_global)
        .ok_or_else(|| format!("Agent '{}' not found", agent_id))
}

/// Create or update an agent
#[tauri::command]
pub fn save_agent(
    agent_id: String,
    config: AgentConfig,
    is_global: bool,
    project_path: Option<String>,
) -> Result<AgentData, String> {
    let dir = if is_global {
        get_global_agents_dir()
    } else {
        let project = project_path.ok_or("Project path required for project agents")?;
        get_project_agents_dir(&project)
    };

    // Ensure directory exists
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create agents directory: {}", e))?;

    let file_path = dir.join(format!("{}.md", agent_id));
    let content = generate_agent_content(&config);

    fs::write(&file_path, &content).map_err(|e| format!("Failed to write agent file: {}", e))?;

    Ok(AgentData {
        id: agent_id,
        file_path: file_path.to_string_lossy().to_string(),
        is_global,
        config,
    })
}

/// Delete an agent
#[tauri::command]
pub fn delete_agent(agent_id: String, is_global: bool, project_path: Option<String>) -> Result<(), String> {
    let file_path = if is_global {
        get_global_agents_dir().join(format!("{}.md", agent_id))
    } else {
        let project = project_path.ok_or("Project path required for project agents")?;
        get_project_agents_dir(&project).join(format!("{}.md", agent_id))
    };

    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| format!("Failed to delete agent: {}", e))?;
    }

    Ok(())
}

/// Get raw agent content (for editing)
#[tauri::command]
pub fn get_agent_content(agent_id: String, is_global: bool, project_path: Option<String>) -> Result<String, String> {
    let file_path = if is_global {
        get_global_agents_dir().join(format!("{}.md", agent_id))
    } else {
        let project = project_path.ok_or("Project path required")?;
        get_project_agents_dir(&project).join(format!("{}.md", agent_id))
    };

    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read agent: {}", e))
}

/// Save raw agent content
#[tauri::command]
pub fn save_agent_content(
    agent_id: String,
    content: String,
    is_global: bool,
    project_path: Option<String>,
) -> Result<(), String> {
    let dir = if is_global {
        get_global_agents_dir()
    } else {
        let project = project_path.ok_or("Project path required")?;
        get_project_agents_dir(&project)
    };

    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = dir.join(format!("{}.md", agent_id));
    fs::write(&file_path, content).map_err(|e| format!("Failed to write agent: {}", e))
}
