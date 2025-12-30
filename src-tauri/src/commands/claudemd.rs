use std::fs;
use std::path::PathBuf;

/// Get the path to the global CLAUDE.md file
fn global_claude_md_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("CLAUDE.md"))
}

/// Read the global CLAUDE.md file
#[tauri::command]
pub async fn read_global_claude_md() -> Result<String, String> {
    let path = global_claude_md_path().ok_or("Could not find home directory")?;

    if !path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&path).map_err(|e| format!("Failed to read CLAUDE.md: {}", e))
}

/// Write to the global CLAUDE.md file
#[tauri::command]
pub async fn write_global_claude_md(content: String) -> Result<(), String> {
    let path = global_claude_md_path().ok_or("Could not find home directory")?;

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Write atomically via temp file
    let temp_path = path.with_extension("md.tmp");
    fs::write(&temp_path, &content).map_err(|e| format!("Failed to write CLAUDE.md: {}", e))?;
    fs::rename(&temp_path, &path).map_err(|e| format!("Failed to save CLAUDE.md: {}", e))?;

    Ok(())
}

/// Read a project-specific CLAUDE.md file
#[tauri::command]
pub async fn read_project_claude_md(project_path: String) -> Result<String, String> {
    let path = PathBuf::from(&project_path).join("CLAUDE.md");

    if !path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&path).map_err(|e| format!("Failed to read CLAUDE.md: {}", e))
}

/// Write to a project-specific CLAUDE.md file
#[tauri::command]
pub async fn write_project_claude_md(project_path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&project_path).join("CLAUDE.md");

    // Write atomically via temp file
    let temp_path = path.with_extension("md.tmp");
    fs::write(&temp_path, &content).map_err(|e| format!("Failed to write CLAUDE.md: {}", e))?;
    fs::rename(&temp_path, &path).map_err(|e| format!("Failed to save CLAUDE.md: {}", e))?;

    Ok(())
}
