use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Represents an installed skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledSkill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub path: PathBuf,
    pub is_global: bool,
    pub repo_url: String,
    pub version: Option<String>,
}

/// Get the global skills directory
fn get_global_skills_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".claude")
        .join("skills")
}

/// Get the project skills directory for a given project path
fn get_project_skills_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".claude")
        .join("skills")
}

/// List all installed skills (both global and project-specific)
#[tauri::command]
pub fn list_installed_skills(project_path: Option<String>) -> Vec<InstalledSkill> {
    let mut skills = Vec::new();

    // Scan global skills
    let global_dir = get_global_skills_dir();
    if global_dir.exists() {
        if let Ok(entries) = fs::read_dir(&global_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    if let Some(skill) = read_skill_metadata(&entry.path(), true) {
                        skills.push(skill);
                    }
                }
            }
        }
    }

    // Scan project skills if path provided
    if let Some(path) = project_path {
        let project_dir = get_project_skills_dir(&path);
        if project_dir.exists() {
            if let Ok(entries) = fs::read_dir(&project_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        if let Some(skill) = read_skill_metadata(&entry.path(), false) {
                            skills.push(skill);
                        }
                    }
                }
            }
        }
    }

    skills
}

/// Read skill metadata from a skill directory
fn read_skill_metadata(skill_path: &PathBuf, is_global: bool) -> Option<InstalledSkill> {
    let skill_id = skill_path.file_name()?.to_str()?.to_string();

    // Try to read skill.json or skill.md for metadata
    let json_path = skill_path.join("skill.json");
    let md_path = skill_path.join("skill.md");

    if json_path.exists() {
        if let Ok(content) = fs::read_to_string(&json_path) {
            if let Ok(meta) = serde_json::from_str::<SkillMetadata>(&content) {
                return Some(InstalledSkill {
                    id: skill_id.clone(),
                    name: meta.name.unwrap_or_else(|| format_skill_name(&skill_id)),
                    description: meta.description.unwrap_or_else(|| format!("{} skill", format_skill_name(&skill_id))),
                    category: meta.category.unwrap_or_else(|| "other".to_string()),
                    path: skill_path.clone(),
                    is_global,
                    repo_url: format!("https://github.com/anthropics/skills/tree/main/skills/{}", skill_id),
                    version: meta.version,
                });
            }
        }
    }

    // Fallback: read first few lines of skill.md for description
    let description = if md_path.exists() {
        fs::read_to_string(&md_path)
            .ok()
            .and_then(|content| {
                content.lines()
                    .take(3)
                    .filter(|line| !line.starts_with('#') && !line.is_empty())
                    .next()
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| format!("{} skill", format_skill_name(&skill_id)))
    } else {
        format!("{} skill", format_skill_name(&skill_id))
    };

    Some(InstalledSkill {
        id: skill_id.clone(),
        name: format_skill_name(&skill_id),
        description,
        category: categorize_skill(&skill_id),
        path: skill_path.clone(),
        is_global,
        repo_url: format!("https://github.com/anthropics/skills/tree/main/skills/{}", skill_id),
        version: None,
    })
}

#[derive(Debug, Deserialize)]
struct SkillMetadata {
    name: Option<String>,
    description: Option<String>,
    category: Option<String>,
    version: Option<String>,
}

/// Download and install a skill from GitHub
#[tauri::command]
pub async fn download_skill(
    skill_id: String,
    skill_name: String,
    is_global: bool,
    project_path: Option<String>,
) -> Result<InstalledSkill, String> {
    // Determine target directory
    let target_dir = if is_global {
        get_global_skills_dir().join(&skill_id)
    } else {
        let project = project_path.ok_or("Project path required for project-specific skills")?;
        get_project_skills_dir(&project).join(&skill_id)
    };

    // Create directory if it doesn't exist
    fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create skill directory: {}", e))?;

    // Fetch skill files from GitHub API
    let api_url = format!(
        "https://api.github.com/repos/anthropics/skills/contents/skills/{}",
        skill_id
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&api_url)
        .header("Accept", "application/vnd.github.v3+json")
        .header("User-Agent", "ClaudeArcade")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch skill from GitHub: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let contents: Vec<GitHubContent> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;

    // Download each file
    for item in contents {
        if item.content_type == "file" {
            download_file(&client, &item.download_url.unwrap_or_default(), &target_dir.join(&item.name)).await?;
        }
    }

    // Return the installed skill info
    Ok(InstalledSkill {
        id: skill_id.clone(),
        name: skill_name,
        description: format!("{} skill from Anthropic", format_skill_name(&skill_id)),
        category: categorize_skill(&skill_id),
        path: target_dir,
        is_global,
        repo_url: format!("https://github.com/anthropics/skills/tree/main/skills/{}", skill_id),
        version: None,
    })
}

#[derive(Debug, Deserialize)]
struct GitHubContent {
    name: String,
    #[serde(rename = "type")]
    content_type: String,
    download_url: Option<String>,
}

async fn download_file(client: &reqwest::Client, url: &str, path: &PathBuf) -> Result<(), String> {
    if url.is_empty() {
        return Ok(());
    }

    let response = client
        .get(url)
        .header("User-Agent", "ClaudeArcade")
        .send()
        .await
        .map_err(|e| format!("Failed to download file: {}", e))?;

    let content = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read file content: {}", e))?;

    fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

/// Remove an installed skill
#[tauri::command]
pub fn remove_skill(skill_id: String, is_global: bool, project_path: Option<String>) -> Result<(), String> {
    let skill_dir = if is_global {
        get_global_skills_dir().join(&skill_id)
    } else {
        let project = project_path.ok_or("Project path required for project-specific skills")?;
        get_project_skills_dir(&project).join(&skill_id)
    };

    if skill_dir.exists() {
        fs::remove_dir_all(&skill_dir).map_err(|e| format!("Failed to remove skill: {}", e))?;
    }

    Ok(())
}

/// Get skill content (for reading/displaying)
#[tauri::command]
pub fn get_skill_content(skill_id: String, is_global: bool, project_path: Option<String>) -> Result<String, String> {
    let skill_dir = if is_global {
        get_global_skills_dir().join(&skill_id)
    } else {
        let project = project_path.ok_or("Project path required")?;
        get_project_skills_dir(&project).join(&skill_id)
    };

    let md_path = skill_dir.join("skill.md");
    if md_path.exists() {
        fs::read_to_string(&md_path).map_err(|e| format!("Failed to read skill: {}", e))
    } else {
        Err("Skill file not found".to_string())
    }
}

// Helper functions
fn format_skill_name(name: &str) -> String {
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

fn categorize_skill(name: &str) -> String {
    let documents = ["docx", "pdf", "pptx", "xlsx"];
    let design = ["algorithmic-art", "canvas-design", "frontend-design", "theme-factory", "slack-gif-creator"];
    let dev = ["mcp-builder", "webapp-testing", "web-artifacts-builder", "skill-creator"];
    let comm = ["brand-guidelines", "internal-comms", "doc-coauthoring"];

    if documents.iter().any(|d| name == *d) {
        "documents".to_string()
    } else if design.iter().any(|d| name == *d) {
        "design".to_string()
    } else if dev.iter().any(|d| name == *d) {
        "development".to_string()
    } else if comm.iter().any(|d| name == *d) {
        "communication".to_string()
    } else {
        "other".to_string()
    }
}
