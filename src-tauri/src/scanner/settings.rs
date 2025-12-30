use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Claude Code settings.json structure (partial - for reading enabled plugins)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeSettings {
    #[serde(default)]
    pub enabled_plugins: HashMap<String, bool>,
}

/// Get path to Claude settings.json
pub fn settings_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("settings.json"))
}

/// Read Claude Code settings
pub fn read_settings() -> ClaudeSettings {
    settings_path()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

/// Read the raw settings.json as a JSON Value to preserve all fields
fn read_settings_raw() -> Value {
    settings_path()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_else(|| Value::Object(serde_json::Map::new()))
}

/// Update only the enabledPlugins field while preserving all other settings
fn update_enabled_plugins(enabled_plugins: &HashMap<String, bool>) -> Result<(), String> {
    let path = settings_path().ok_or("Could not find home directory")?;

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Read existing settings to preserve other fields
    let mut settings = read_settings_raw();

    // Update only the enabledPlugins field
    if let Value::Object(ref mut map) = settings {
        let plugins_value = serde_json::to_value(enabled_plugins)
            .map_err(|e| e.to_string())?;
        map.insert("enabledPlugins".to_string(), plugins_value);
    }

    // Write to temp file first, then rename (atomic)
    let temp_path = path.with_extension("json.tmp");
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| e.to_string())?;

    fs::write(&temp_path, content).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Enable a plugin in settings
pub fn enable_plugin(plugin_id: &str) -> Result<(), String> {
    let mut settings = read_settings();
    settings.enabled_plugins.insert(plugin_id.to_string(), true);
    update_enabled_plugins(&settings.enabled_plugins)
}

/// Disable a plugin in settings
pub fn disable_plugin(plugin_id: &str) -> Result<(), String> {
    let mut settings = read_settings();
    settings.enabled_plugins.remove(plugin_id);
    update_enabled_plugins(&settings.enabled_plugins)
}

/// MCP Server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServerConfig {
    pub command: String,
    pub args: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
}

/// Read MCP servers from settings
pub fn read_mcp_servers() -> HashMap<String, MCPServerConfig> {
    let settings = read_settings_raw();
    if let Some(mcp_servers) = settings.get("mcpServers") {
        serde_json::from_value(mcp_servers.clone()).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

/// Add an MCP server to settings
pub fn install_mcp_server(server_id: &str, command: &str, args: Vec<String>) -> Result<(), String> {
    let path = settings_path().ok_or("Could not find home directory")?;

    // Read existing settings to preserve other fields
    let mut settings = read_settings_raw();

    // Get or create mcpServers object
    let mcp_servers = if let Value::Object(ref mut map) = settings {
        map.entry("mcpServers".to_string())
            .or_insert_with(|| Value::Object(serde_json::Map::new()))
    } else {
        return Err("Settings is not an object".to_string());
    };

    // Add the new server
    if let Value::Object(ref mut servers) = mcp_servers {
        let config = MCPServerConfig {
            command: command.to_string(),
            args,
            env: None,
        };
        let config_value = serde_json::to_value(&config).map_err(|e| e.to_string())?;
        servers.insert(server_id.to_string(), config_value);
    }

    // Write atomically
    let temp_path = path.with_extension("json.tmp");
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&temp_path, content).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Remove an MCP server from settings
pub fn remove_mcp_server(server_id: &str) -> Result<(), String> {
    let path = settings_path().ok_or("Could not find home directory")?;

    // Read existing settings
    let mut settings = read_settings_raw();

    // Remove the server from mcpServers
    if let Value::Object(ref mut map) = settings {
        if let Some(Value::Object(ref mut servers)) = map.get_mut("mcpServers") {
            servers.remove(server_id);
        }
    }

    // Write atomically
    let temp_path = path.with_extension("json.tmp");
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&temp_path, content).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Permissions configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PermissionsConfig {
    #[serde(default)]
    pub allow: Vec<String>,
    #[serde(default)]
    pub ask: Vec<String>,
    #[serde(default)]
    pub deny: Vec<String>,
}

/// Read permissions from settings
pub fn read_permissions() -> PermissionsConfig {
    let settings = read_settings_raw();
    if let Some(permissions) = settings.get("permissions") {
        serde_json::from_value(permissions.clone()).unwrap_or_default()
    } else {
        PermissionsConfig::default()
    }
}

/// Write permissions to settings
pub fn write_permissions(permissions: &PermissionsConfig) -> Result<(), String> {
    let path = settings_path().ok_or("Could not find home directory")?;

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Read existing settings to preserve other fields
    let mut settings = read_settings_raw();

    // Update only the permissions field
    if let Value::Object(ref mut map) = settings {
        let permissions_value = serde_json::to_value(permissions)
            .map_err(|e| e.to_string())?;
        map.insert("permissions".to_string(), permissions_value);
    }

    // Write atomically
    let temp_path = path.with_extension("json.tmp");
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&temp_path, content).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &path).map_err(|e| e.to_string())?;

    Ok(())
}
