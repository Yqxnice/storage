use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use dirs;
use serde_json::Value;
use std::collections::HashMap;
use fs2::FileExt;

pub const STORAGE_DIR_NAME: &str = "storage";
pub const PORTABLE_MARKER: &str = ".portable";
pub const BACKUP_DIR_NAME: &str = "backups";
pub const LOG_DIR_NAME: &str = "logs";
pub const LOG_FILE_NAME: &str = "app.log";
pub const DEFAULT_ICON_SIZE: u32 = 32;
pub const MAX_BACKUP_COUNT: usize = 10;

pub fn get_storage_dir() -> Result<PathBuf, String> {
    let current_dir_settings = PathBuf::from("./storage/settings.json");
    if current_dir_settings.exists() {
        if let Ok(custom_path) = read_data_path_from_file(&current_dir_settings) {
            let custom_path_buf = PathBuf::from(custom_path);
            fs::create_dir_all(&custom_path_buf).map_err(|e| e.to_string())?;
            return Ok(custom_path_buf);
        }
    }
    
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    let exe_dir_settings = exe_dir.join("storage").join("settings.json");
    
    if exe_dir_settings.exists() {
        if let Ok(custom_path) = read_data_path_from_file(&exe_dir_settings) {
            let custom_path_buf = PathBuf::from(custom_path);
            fs::create_dir_all(&custom_path_buf).map_err(|e| e.to_string())?;
            return Ok(custom_path_buf);
        }
    }
    
    let is_development = exe_dir.to_string_lossy().contains("target/debug") || 
                         exe_dir.to_string_lossy().contains("target/release");
    
    if !is_development {
        let storage_dir = exe_dir.join(STORAGE_DIR_NAME);
        fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;
        Ok(storage_dir)
    } else {
        let mut path = dirs::data_dir().ok_or("Failed to get data directory")?;
        path.push(STORAGE_DIR_NAME);
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        Ok(path)
    }
}

fn read_data_path_from_file(settings_path: &PathBuf) -> Result<String, String> {
    let content = fs::read_to_string(settings_path).map_err(|e| format!("Failed to read settings: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings: {}", e))?;
    
    if let Some(data_path) = json.get("dataPath").and_then(|v| v.as_str()) {
        if !data_path.is_empty() && data_path != "appdata" && data_path != "current" {
            return Ok(data_path.to_string());
        }
    }
    
    Err("No custom data path set".to_string())
}

pub fn get_backup_dir() -> Result<PathBuf, String> {
    let mut path = get_storage_dir()?;
    path.push(BACKUP_DIR_NAME);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn get_log_dir() -> Result<PathBuf, String> {
    let mut path = get_storage_dir()?;
    path.push(LOG_DIR_NAME);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

pub fn get_storage_file(store_type: &str) -> Result<PathBuf, String> {
    let mut path = get_storage_dir()?;
    path.push(format!("{}.json", store_type));
    Ok(path)
}

pub fn load_storage(store_type: &str) -> Result<HashMap<String, Value>, String> {
    let file_path = get_storage_file(store_type)?;
    
    if !file_path.exists() {
        return Ok(HashMap::new());
    }
    
    let mut file = File::open(&file_path).map_err(|e| format!("打开文件失败: {}", e))?;
    file.lock_shared().map_err(|e| format!("获取文件锁失败: {}", e))?;
    
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| format!("读取文件失败: {}", e))?;
    
    serde_json::from_str(&content).map_err(|e| format!("解析 JSON 失败: {}", e))
}

pub fn save_storage(store_type: &str, storage: &HashMap<String, Value>) -> Result<(), String> {
    let file_path = get_storage_file(store_type)?;
    let content = serde_json::to_string_pretty(storage).map_err(|e| format!("序列化 JSON 失败: {}", e))?;
    
    let mut file = File::create(&file_path).map_err(|e| format!("创建文件失败: {}", e))?;
    file.lock_exclusive().map_err(|e| format!("获取文件锁失败: {}", e))?;
    
    file.write_all(content.as_bytes()).map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(())
}

pub fn calculate_folder_size(path: &Path) -> Result<u64, String> {
    let mut total_size = 0u64;
    
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    if let Ok(meta) = fs::metadata(&entry_path) {
                        total_size += meta.len();
                    }
                } else if entry_path.is_dir() {
                    if let Ok(sub_size) = calculate_folder_size(&entry_path) {
                        total_size += sub_size;
                    }
                }
            }
        }
    }
    
    Ok(total_size)
}
