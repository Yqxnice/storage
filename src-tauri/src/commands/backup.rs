use crate::utils::{get_backup_dir, load_storage, save_storage, MAX_BACKUP_COUNT};
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn backup_create(reason: Option<String>) -> Result<String, String> {
    let backup_dir = get_backup_dir()?;
    
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let reason_suffix = reason.map(|r| format!("_{}", r)).unwrap_or_default();
    let backup_name = format!("backup_{}{}.json", timestamp, reason_suffix);
    let backup_path = backup_dir.join(&backup_name);
    
    let storage = load_storage("storage")?;
    let content = serde_json::to_string_pretty(&storage).map_err(|e| format!("序列化失败: {}", e))?;
    
    fs::write(&backup_path, content).map_err(|e| format!("写入备份文件失败: {}", e))?;
    
    cleanup_old_backups()?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn backup_restore(backup_path: String) -> Result<(), String> {
    let path = Path::new(&backup_path);
    
    if !path.exists() {
        return Err("备份文件不存在".to_string());
    }
    
    let content = fs::read_to_string(path).map_err(|e| format!("读取备份文件失败: {}", e))?;
    let storage: std::collections::HashMap<String, serde_json::Value> = 
        serde_json::from_str(&content).map_err(|e| format!("解析备份文件失败: {}", e))?;
    
    save_storage("storage", &storage)?;
    
    Ok(())
}

#[tauri::command]
pub fn backup_cleanup() -> Result<(), String> {
    cleanup_old_backups()?;
    Ok(())
}

#[tauri::command]
pub fn backup_get_backups() -> Result<Vec<String>, String> {
    let backup_dir = get_backup_dir()?;
    
    let mut backups = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                    backups.push(path.to_string_lossy().to_string());
                }
            }
        }
    }
    
    backups.sort_by(|a, b| b.cmp(a));
    
    Ok(backups)
}

#[tauri::command]
pub fn backup_set_auto_backup_interval(interval: String) -> Result<(), String> {
    let mut storage = load_storage("settings")?;
    storage.insert("autoBackupInterval".to_string(), serde_json::json!(interval));
    save_storage("settings", &storage)?;
    Ok(())
}

fn cleanup_old_backups() -> Result<(), String> {
    let backup_dir = get_backup_dir()?;
    
    let mut backups = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&backup_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                    if let Ok(metadata) = fs::metadata(&path) {
                        backups.push((metadata.modified().unwrap_or_else(|_| std::time::SystemTime::UNIX_EPOCH), path));
                    }
                }
            }
        }
    }
    
    backups.sort_by(|a, b| b.0.cmp(&a.0));
    
    for (i, (_, path)) in backups.iter().enumerate() {
        if i >= MAX_BACKUP_COUNT {
            fs::remove_file(path).ok();
        }
    }
    
    Ok(())
}
