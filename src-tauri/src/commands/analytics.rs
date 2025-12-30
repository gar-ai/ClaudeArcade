use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Datelike, Local, NaiveDate, Weekday};

/// Usage data for a single day
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DailyUsage {
    pub date: String,                // YYYY-MM-DD format
    pub sessions: u32,               // Number of sessions started
    pub messages: u32,               // Number of messages sent
    pub estimated_tokens: u64,       // Rough token estimate
    pub active_minutes: u32,         // Minutes with activity
    pub tools_used: u32,             // Number of tool calls
}

/// Weekly summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklySummary {
    pub week_start: String,          // YYYY-MM-DD (Monday)
    pub week_end: String,            // YYYY-MM-DD (Sunday)
    pub total_sessions: u32,
    pub total_messages: u32,
    pub total_tokens: u64,
    pub total_minutes: u32,
    pub total_tools: u32,
    pub daily_breakdown: Vec<DailyUsage>,
}

/// Monthly summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlySummary {
    pub month: String,               // YYYY-MM format
    pub total_sessions: u32,
    pub total_messages: u32,
    pub total_tokens: u64,
    pub total_minutes: u32,
    pub weekly_breakdown: Vec<WeeklySummary>,
}

/// Current session tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub session_id: String,
    pub start_time: i64,
    pub messages: u32,
    pub tokens: u64,
    pub tools: u32,
}

/// All analytics data
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AnalyticsData {
    pub daily_usage: Vec<DailyUsage>,
    pub current_session: Option<SessionData>,
}

fn get_analytics_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".claude")
        .join("arcade_analytics.json")
}

fn load_analytics() -> AnalyticsData {
    let path = get_analytics_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(data) = serde_json::from_str(&content) {
                return data;
            }
        }
    }
    AnalyticsData::default()
}

fn save_analytics(data: &AnalyticsData) -> Result<(), String> {
    let path = get_analytics_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn today_string() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

fn get_or_create_today(data: &mut AnalyticsData) -> &mut DailyUsage {
    let today = today_string();

    // Find or create today's entry
    if !data.daily_usage.iter().any(|d| d.date == today) {
        data.daily_usage.push(DailyUsage {
            date: today.clone(),
            ..Default::default()
        });
    }

    data.daily_usage.iter_mut().find(|d| d.date == today).unwrap()
}

/// Start a new session
#[tauri::command]
pub fn start_session() -> Result<String, String> {
    let mut data = load_analytics();

    let session_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Local::now().timestamp();

    data.current_session = Some(SessionData {
        session_id: session_id.clone(),
        start_time: now,
        messages: 0,
        tokens: 0,
        tools: 0,
    });

    // Increment today's session count
    let today = get_or_create_today(&mut data);
    today.sessions += 1;

    save_analytics(&data)?;
    Ok(session_id)
}

/// Record a message in the current session
#[tauri::command]
pub fn record_message(estimated_tokens: u64, tool_calls: u32) -> Result<(), String> {
    let mut data = load_analytics();

    if let Some(session) = data.current_session.as_mut() {
        session.messages += 1;
        session.tokens += estimated_tokens;
        session.tools += tool_calls;
    }

    let today = get_or_create_today(&mut data);
    today.messages += 1;
    today.estimated_tokens += estimated_tokens;
    today.tools_used += tool_calls;

    save_analytics(&data)?;
    Ok(())
}

/// Record active time
#[tauri::command]
pub fn record_activity(minutes: u32) -> Result<(), String> {
    let mut data = load_analytics();

    let today = get_or_create_today(&mut data);
    today.active_minutes += minutes;

    save_analytics(&data)?;
    Ok(())
}

/// End the current session
#[tauri::command]
pub fn end_session() -> Result<(), String> {
    let mut data = load_analytics();
    data.current_session = None;
    save_analytics(&data)?;
    Ok(())
}

/// Get usage data for the past N days
#[tauri::command]
pub fn get_daily_usage(days: u32) -> Vec<DailyUsage> {
    let data = load_analytics();
    let today = Local::now();

    let mut result: Vec<DailyUsage> = Vec::new();

    for i in 0..days {
        let date = today - chrono::Duration::days(i as i64);
        let date_str = date.format("%Y-%m-%d").to_string();

        if let Some(usage) = data.daily_usage.iter().find(|d| d.date == date_str) {
            result.push(usage.clone());
        } else {
            result.push(DailyUsage {
                date: date_str,
                ..Default::default()
            });
        }
    }

    result
}

/// Get weekly summary
#[tauri::command]
pub fn get_weekly_summary() -> WeeklySummary {
    let data = load_analytics();
    let today = Local::now();

    // Find Monday of current week
    let days_since_monday = today.weekday().num_days_from_monday() as i64;
    let monday = today - chrono::Duration::days(days_since_monday);
    let sunday = monday + chrono::Duration::days(6);

    let week_start = monday.format("%Y-%m-%d").to_string();
    let week_end = sunday.format("%Y-%m-%d").to_string();

    let mut summary = WeeklySummary {
        week_start,
        week_end,
        total_sessions: 0,
        total_messages: 0,
        total_tokens: 0,
        total_minutes: 0,
        total_tools: 0,
        daily_breakdown: Vec::new(),
    };

    for i in 0..7 {
        let date = monday + chrono::Duration::days(i);
        let date_str = date.format("%Y-%m-%d").to_string();

        let usage = if let Some(u) = data.daily_usage.iter().find(|d| d.date == date_str) {
            u.clone()
        } else {
            DailyUsage {
                date: date_str,
                ..Default::default()
            }
        };

        summary.total_sessions += usage.sessions;
        summary.total_messages += usage.messages;
        summary.total_tokens += usage.estimated_tokens;
        summary.total_minutes += usage.active_minutes;
        summary.total_tools += usage.tools_used;
        summary.daily_breakdown.push(usage);
    }

    summary
}

/// Get monthly summary
#[tauri::command]
pub fn get_monthly_summary() -> MonthlySummary {
    let data = load_analytics();
    let today = Local::now();
    let month_str = today.format("%Y-%m").to_string();

    // Get all days in current month
    let first_day = NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap();
    let last_day = if today.month() == 12 {
        NaiveDate::from_ymd_opt(today.year() + 1, 1, 1).unwrap()
    } else {
        NaiveDate::from_ymd_opt(today.year(), today.month() + 1, 1).unwrap()
    } - chrono::Duration::days(1);

    let mut summary = MonthlySummary {
        month: month_str,
        total_sessions: 0,
        total_messages: 0,
        total_tokens: 0,
        total_minutes: 0,
        weekly_breakdown: Vec::new(),
    };

    // Aggregate all days in the month
    let mut current = first_day;
    while current <= last_day {
        let date_str = current.format("%Y-%m-%d").to_string();
        if let Some(usage) = data.daily_usage.iter().find(|d| d.date == date_str) {
            summary.total_sessions += usage.sessions;
            summary.total_messages += usage.messages;
            summary.total_tokens += usage.estimated_tokens;
            summary.total_minutes += usage.active_minutes;
        }
        current += chrono::Duration::days(1);
    }

    summary
}

/// Get current session data
#[tauri::command]
pub fn get_current_session() -> Option<SessionData> {
    let data = load_analytics();
    data.current_session
}
