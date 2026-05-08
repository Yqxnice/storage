use crate::utils::{get_storage_dir, PORTABLE_MARKER};
use std::fs;
use dirs;
use tauri::Emitter;

#[tauri::command]
pub fn set_portable_mode(portable: bool) -> Result<(), String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    let marker_path = exe_dir.join(PORTABLE_MARKER);
    
    if portable {
        fs::File::create(&marker_path).map_err(|e| format!("创建便携模式标记失败: {}", e))?;
    } else if marker_path.exists() {
        fs::remove_file(&marker_path).map_err(|e| format!("删除便携模式标记失败: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn is_portable_mode() -> Result<bool, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    let marker_path = exe_dir.join(PORTABLE_MARKER);
    
    Ok(marker_path.exists())
}

#[tauri::command]
pub fn app_get_path(path_type: String) -> Result<String, String> {
    let result = match path_type.as_str() {
        "storage" => get_storage_dir()?,
        "backup" => crate::utils::get_backup_dir()?,
        "log" => crate::utils::get_log_dir()?,
        "exe" => std::env::current_exe().map_err(|e| e.to_string())?,
        "exe_dir" => {
            let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
            exe_path.parent().ok_or("Failed to get exe directory")?.to_path_buf()
        }
        "appData" => dirs::data_dir().ok_or("Failed to get data directory")?,
        "appdata" => dirs::data_dir().ok_or("Failed to get data directory")?,
        _ => return Err(format!("Unknown path type: {}", path_type)),
    };
    
    Ok(result.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_custom_storage_path() -> Result<String, String> {
    let storage = crate::utils::load_storage("settings")?;
    if let Some(data_path) = storage.get("dataPath").and_then(|v| v.as_str()) {
        Ok(data_path.to_string())
    } else {
        Ok("".to_string())
    }
}

#[tauri::command]
pub fn app_restart(app: tauri::AppHandle) -> Result<(), String> {
    app.restart();
    Ok(())
}

#[tauri::command]
pub fn open_file_dialog() -> Result<Vec<String>, String> {
    Ok(Vec::new())
}

#[tauri::command]
pub fn dialog_show_input_box(_options: std::collections::HashMap<String, String>) -> Result<String, String> {
    Ok("".to_string())
}

#[tauri::command]
pub fn dialog_show_confirm(_message: String, _title: Option<String>) -> Result<bool, String> {
    Ok(true)
}

#[derive(serde::Serialize, Clone)]
pub struct FloatItemsReloadPayload {
    #[serde(rename = "boxId")]
    pub box_id: String,
}

#[tauri::command]
pub fn emit_float_items_reload(app: tauri::AppHandle, box_id: String) -> Result<(), String> {
    let payload = FloatItemsReloadPayload { box_id };
    app.emit("box-float-items-reload", payload)
        .map_err(|e| format!("Failed to emit event: {}", e))
}
