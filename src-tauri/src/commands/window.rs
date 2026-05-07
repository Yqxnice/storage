use crate::utils::{load_storage, save_storage};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowPosition {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub is_maximized: bool,
    pub is_minimized: bool,
    pub is_always_on_top: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FloatWindowLayout {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowLayout {
    pub main_window: WindowPosition,
    pub float_windows: HashMap<String, FloatWindowLayout>,
    pub version: i32,
}

const WINDOW_LAYOUT_KEY: &str = "window_layout";

#[tauri::command]
pub fn win_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn win_maximize(window: tauri::Window) -> Result<(), String> {
    window.maximize().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn win_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn win_is_maximized(window: tauri::Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn win_toggle_maximize(window: tauri::Window) -> Result<(), String> {
    match window.is_maximized() {
        Ok(is_maximized) => {
            if is_maximized {
                window.unmaximize().map_err(|e| e.to_string())?;
            } else {
                window.maximize().map_err(|e| e.to_string())?;
            }
            Ok(())
        },
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub fn set_window_always_on_top(window: tauri::Window, always_on_top: bool) -> Result<(), String> {
    window.set_always_on_top(always_on_top).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_window_layout(layout: WindowLayout) -> Result<(), String> {
    let mut storage = load_storage("settings")?;
    let layout_json = serde_json::to_value(layout).map_err(|e| format!("序列化布局失败: {}", e))?;
    storage.insert(WINDOW_LAYOUT_KEY.to_string(), layout_json);
    save_storage("settings", &storage)?;
    Ok(())
}

#[tauri::command]
pub fn load_window_layout() -> Result<Option<WindowLayout>, String> {
    let storage = load_storage("settings")?;
    if let Some(layout_value) = storage.get(WINDOW_LAYOUT_KEY) {
        let layout: WindowLayout = serde_json::from_value(layout_value.clone())
            .map_err(|e| format!("反序列化布局失败: {}", e))?;
        Ok(Some(layout))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn restore_window_layout(window: tauri::Window) -> Result<(), String> {
    let layout = load_window_layout()?;
    if let Some(layout) = layout {
        let pos = layout.main_window;
        
        if !pos.is_maximized {
            window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: pos.x as i32,
                y: pos.y as i32,
            })).map_err(|e| e.to_string())?;
            window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: pos.width as u32,
                height: pos.height as u32,
            })).map_err(|e| e.to_string())?;
        }

        if pos.is_maximized {
            window.maximize().map_err(|e| e.to_string())?;
        }

        if pos.is_always_on_top != window.is_always_on_top().map_err(|e| e.to_string())? {
            window.set_always_on_top(pos.is_always_on_top).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn reset_window_layout() -> Result<(), String> {
    let mut storage = load_storage("settings")?;
    storage.remove(WINDOW_LAYOUT_KEY);
    save_storage("settings", &storage)?;
    Ok(())
}
