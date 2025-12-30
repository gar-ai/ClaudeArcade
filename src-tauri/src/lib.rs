mod types;
mod scanner;
mod commands;
mod watcher;
mod pty;

use commands::{
    scan_inventory, equip_item, unequip_item,
    pty_spawn, pty_write, pty_resize, pty_kill, PtyState,
    read_global_claude_md, write_global_claude_md,
    read_project_claude_md, write_project_claude_md,
    detect_project_type,
    get_mcp_servers, install_mcp_server, remove_mcp_server, check_mcp_status,
    list_installed_skills, download_skill, remove_skill, get_skill_content,
    start_session, record_message, record_activity, end_session,
    get_daily_usage, get_weekly_summary, get_monthly_summary, get_current_session,
    get_permissions, set_permissions,
    list_agents, get_agent, save_agent, delete_agent, get_agent_content, save_agent_content,
    scan_project_claude_items,
};
use pty::PtyManager;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(PtyState(Mutex::new(PtyManager::new())))
        .invoke_handler(tauri::generate_handler![
            scan_inventory,
            equip_item,
            unequip_item,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            read_global_claude_md,
            write_global_claude_md,
            read_project_claude_md,
            write_project_claude_md,
            detect_project_type,
            get_mcp_servers,
            install_mcp_server,
            remove_mcp_server,
            check_mcp_status,
            list_installed_skills,
            download_skill,
            remove_skill,
            get_skill_content,
            start_session,
            record_message,
            record_activity,
            end_session,
            get_daily_usage,
            get_weekly_summary,
            get_monthly_summary,
            get_current_session,
            get_permissions,
            set_permissions,
            list_agents,
            get_agent,
            save_agent,
            delete_agent,
            get_agent_content,
            save_agent_content,
            scan_project_claude_items,
        ])
        .setup(|app| {
            // Start file watcher for settings.json changes
            let handle = app.handle().clone();
            if let Err(e) = watcher::start_watcher(handle) {
                eprintln!("Failed to start file watcher: {}", e);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
