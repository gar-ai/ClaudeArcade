use crate::scanner::{enable_plugin, disable_plugin, scan_plugins};
use crate::types::{EquipmentSlot, EquipResult, ContextStats};

/// Calculate context stats from current enabled plugins
fn calculate_context_stats() -> ContextStats {
    let result = scan_plugins();

    let equipped_tokens: u32 = result.items
        .iter()
        .filter(|item| item.enabled)
        .map(|item| item.token_weight)
        .sum();

    let total_budget: u32 = 200_000;
    let load_percentage = equipped_tokens as f64 / total_budget as f64;

    let status = if load_percentage < 0.25 {
        "healthy"
    } else if load_percentage < 0.50 {
        "heavy"
    } else {
        "dumbzone"
    };

    ContextStats {
        total_budget,
        equipped: equipped_tokens,
        available: total_budget.saturating_sub(equipped_tokens),
        load_percentage,
        status: status.to_string(),
    }
}

/// Equip an item (enable a plugin)
#[tauri::command]
pub async fn equip_item(
    item_id: String,
    _slot: EquipmentSlot,
) -> Result<EquipResult, String> {
    // Enable the plugin in settings.json
    enable_plugin(&item_id)?;

    // Calculate new context stats
    let new_context_stats = calculate_context_stats();

    // Generate warnings if entering heavy/dumbzone
    let mut warnings = Vec::new();
    if new_context_stats.status == "heavy" {
        warnings.push("Context is getting heavy. Consider unequipping some items.".to_string());
    } else if new_context_stats.status == "dumbzone" {
        warnings.push("DUMBZONE! Claude's performance will degrade significantly.".to_string());
    }

    Ok(EquipResult {
        success: true,
        new_context_stats,
        warnings,
    })
}

/// Unequip an item (disable a plugin)
#[tauri::command]
pub async fn unequip_item(
    item_id: String,
) -> Result<ContextStats, String> {
    // Disable the plugin in settings.json
    disable_plugin(&item_id)?;

    // Return new context stats
    Ok(calculate_context_stats())
}
