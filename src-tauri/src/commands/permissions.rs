use crate::scanner::settings::{read_permissions, write_permissions, PermissionsConfig};

/// Get all permissions from settings
#[tauri::command]
pub fn get_permissions() -> PermissionsConfig {
    read_permissions()
}

/// Set permissions in settings
#[tauri::command]
pub fn set_permissions(permissions: PermissionsConfig) -> Result<(), String> {
    write_permissions(&permissions)
}
