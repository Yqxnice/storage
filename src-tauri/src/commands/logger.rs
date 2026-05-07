use crate::utils::{get_log_dir, LOG_FILE_NAME};
use std::fs;
use chrono::Local;

#[tauri::command]
pub fn logger_write_log(level: String, message: String) -> Result<(), String> {
    let log_dir = get_log_dir()?;
    let log_path = log_dir.join(LOG_FILE_NAME);
    
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_line = format!("[{}] [{}] {}\n", timestamp, level, message);
    
    fs::write(log_path, log_line).map_err(|e| format!("写入日志失败: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn logger_clear_logs() -> Result<(), String> {
    let log_dir = get_log_dir()?;
    let log_path = log_dir.join(LOG_FILE_NAME);
    
    if log_path.exists() {
        fs::remove_file(&log_path).map_err(|e| format!("删除日志文件失败: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn logger_set_auto_cleanup_days(days: String) -> Result<(), String> {
    let days_int: i32 = days.parse().map_err(|e| format!("无效的天数: {}", e))?;
    
    let mut storage = crate::utils::load_storage("settings")?;
    storage.insert("logAutoCleanupDays".to_string(), serde_json::json!(days_int));
    crate::utils::save_storage("settings", &storage)?;
    
    Ok(())
}

#[tauri::command]
pub fn logger_get_logs() -> Result<String, String> {
    let log_dir = get_log_dir()?;
    let log_path = log_dir.join(LOG_FILE_NAME);
    
    if !log_path.exists() {
        return Ok("".to_string());
    }
    
    let content = fs::read_to_string(&log_path).map_err(|e| format!("读取日志失败: {}", e))?;
    
    Ok(content)
}
