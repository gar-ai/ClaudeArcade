use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct PtyInstance {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
}

pub struct PtyManager {
    instances: Arc<Mutex<HashMap<String, PtyInstance>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(
        &self,
        app_handle: AppHandle,
        cols: u16,
        rows: u16,
        cwd: Option<String>,
    ) -> Result<String, String> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let mut cmd = CommandBuilder::new_default_prog();

        // Set working directory if provided
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        // Set up environment for interactive shell
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let id = Uuid::new_v4().to_string();
        let id_clone = id.clone();

        // Get reader for output
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;

        // Spawn thread to read PTY output
        let app_handle_clone = app_handle.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_handle_clone.emit("pty-output", serde_json::json!({
                            "id": id_clone,
                            "data": data
                        }));
                    }
                    Err(_) => break,
                }
            }
        });

        // Spawn thread to wait for child exit
        let id_exit = id.clone();
        let app_handle_exit = app_handle;
        thread::spawn(move || {
            if let Ok(status) = child.wait() {
                let code = status.exit_code();
                let _ = app_handle_exit.emit("pty-exit", serde_json::json!({
                    "id": id_exit,
                    "code": code
                }));
            }
        });

        // Store instance
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take writer: {}", e))?;

        let instance = PtyInstance {
            writer,
            master: pair.master,
        };

        self.instances
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?
            .insert(id.clone(), instance);

        Ok(id)
    }

    pub fn write(&self, id: &str, data: &str) -> Result<(), String> {
        let mut instances = self
            .instances
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;

        let instance = instances
            .get_mut(id)
            .ok_or_else(|| "PTY not found".to_string())?;

        instance
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;

        instance
            .writer
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;

        Ok(())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let instances = self
            .instances
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;

        let instance = instances
            .get(id)
            .ok_or_else(|| "PTY not found".to_string())?;

        instance
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize error: {}", e))?;

        Ok(())
    }

    pub fn kill(&self, id: &str) -> Result<(), String> {
        let mut instances = self
            .instances
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;

        instances.remove(id);
        Ok(())
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}
