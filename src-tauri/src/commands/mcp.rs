use crate::scanner::settings::{install_mcp_server as settings_install, remove_mcp_server as settings_remove, read_mcp_servers};
use serde::Serialize;
use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct MCPServerInfo {
    pub command: String,
    pub args: Vec<String>,
}

/// Connection status for MCP servers
#[derive(Debug, Clone, Serialize)]
pub enum MCPStatus {
    #[serde(rename = "connected")]
    Connected,
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "unknown")]
    Unknown,
}

/// Get all installed MCP servers
#[tauri::command]
pub fn get_mcp_servers() -> HashMap<String, MCPServerInfo> {
    read_mcp_servers()
        .into_iter()
        .map(|(id, config)| {
            (id, MCPServerInfo {
                command: config.command,
                args: config.args,
            })
        })
        .collect()
}

/// Install an MCP server
#[tauri::command]
pub fn install_mcp_server(
    server_id: String,
    command: String,
    args: Vec<String>,
) -> Result<(), String> {
    settings_install(&server_id, &command, args)
}

/// Remove an MCP server
#[tauri::command]
pub fn remove_mcp_server(server_id: String) -> Result<(), String> {
    settings_remove(&server_id)
}

/// Check if a command exists on the system
fn command_exists(cmd: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        Command::new("where")
            .arg(cmd)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg(cmd)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }
}

/// Check MCP server status
/// Returns a map of server_id -> status (connected/disconnected/unknown)
/// Note: Since MCP servers are spawned on-demand by Claude Code, we can only
/// check if the command is available, not if it's actually running.
#[tauri::command]
pub fn check_mcp_status(server_ids: Vec<String>) -> HashMap<String, String> {
    let servers = read_mcp_servers();

    server_ids
        .into_iter()
        .map(|id| {
            let status = if let Some(config) = servers.get(&id) {
                // Check if the command exists
                if command_exists(&config.command) {
                    // Command exists, mark as "unknown" (could be connected when Claude uses it)
                    "unknown"
                } else {
                    // Command doesn't exist, definitely disconnected
                    "disconnected"
                }
            } else {
                // Server not configured
                "disconnected"
            };
            (id, status.to_string())
        })
        .collect()
}
