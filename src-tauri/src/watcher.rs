use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::scanner::plugin::claude_config_dir;

/// Start watching Claude config directory for changes
pub fn start_watcher(app_handle: AppHandle) -> Result<(), String> {
    let settings_path = claude_config_dir()
        .map(|d| d.join("settings.json"))
        .ok_or("Could not find Claude config directory")?;

    let watch_dir = settings_path.parent()
        .ok_or("Could not get settings directory")?
        .to_path_buf();

    std::thread::spawn(move || {
        if let Err(e) = run_watcher(app_handle, watch_dir, settings_path) {
            eprintln!("File watcher error: {}", e);
        }
    });

    Ok(())
}

fn run_watcher(app_handle: AppHandle, watch_dir: PathBuf, settings_path: PathBuf) -> Result<(), String> {
    let (tx, rx) = channel();

    let config = Config::default()
        .with_poll_interval(Duration::from_secs(2));

    let mut watcher: RecommendedWatcher = Watcher::new(tx, config)
        .map_err(|e| e.to_string())?;

    watcher.watch(&watch_dir, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    println!("Watching for changes: {:?}", watch_dir);

    loop {
        match rx.recv() {
            Ok(Ok(event)) => {
                handle_event(&app_handle, &event, &settings_path);
            }
            Ok(Err(e)) => {
                eprintln!("Watch error: {:?}", e);
            }
            Err(e) => {
                eprintln!("Channel error: {:?}", e);
                break;
            }
        }
    }

    Ok(())
}

fn handle_event(app_handle: &AppHandle, event: &Event, settings_path: &PathBuf) {
    // Check if the event affects settings.json
    let affects_settings = event.paths.iter().any(|p| p == settings_path);

    if affects_settings {
        match event.kind {
            notify::EventKind::Modify(_) | notify::EventKind::Create(_) => {
                println!("Settings changed externally, emitting refresh event");
                let _ = app_handle.emit("settings-changed", ());
            }
            _ => {}
        }
    }
}
