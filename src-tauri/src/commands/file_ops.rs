use crate::utils::calculate_folder_size;
use std::fs;
use std::path::Path;
use std::process::Command;
use dirs;
use tauri::Emitter;

#[tauri::command]
pub fn open_item(path: String) -> Result<(), String> {
    if path.is_empty() {
        return Err("路径不能为空".to_string());
    }

    if path.starts_with("http://") || path.starts_with("https://") {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;

            let result = Command::new("explorer.exe")
                .arg(&path)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();

            match result {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("打开URL失败: {}，错误: {}", path, e)),
            }?;
        }
        #[cfg(target_os = "macos")]
        {
            Command::new("open")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("打开URL失败: {}，错误: {}", path, e))?;
        }
        #[cfg(target_os = "linux")]
        {
            Command::new("xdg-open")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("打开URL失败: {}，错误: {}", path, e))?;
        }
        return Ok(());
    }

    let path_obj = Path::new(&path);
    
    if !path_obj.exists() {
        return Err(format!("路径不存在: {}", path_obj.display()));
    }

    let is_lnk = path.to_lowercase().ends_with(".lnk");
    
    let abs_path = if is_lnk {
        if path_obj.is_absolute() {
            path_obj.to_path_buf()
        } else {
            match std::env::current_dir() {
                Ok(cwd) => cwd.join(path_obj),
                Err(_) => return Err(format!("无法解析路径: {}", path)),
            }
        }
    } else {
        match path_obj.canonicalize() {
            Ok(p) => p,
            Err(_) => {
                if path_obj.is_absolute() {
                    path_obj.to_path_buf()
                } else {
                    match std::env::current_dir() {
                        Ok(cwd) => cwd.join(path_obj),
                        Err(_) => return Err(format!("无法解析路径: {}", path)),
                    }
                }
            }
        }
    };

    let can_open = if is_lnk {
        abs_path.exists()
    } else {
        abs_path.is_file() || abs_path.is_dir()
    };

    if !can_open {
        return Err(format!("路径不是文件或目录: {}", abs_path.display()));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let result = Command::new("explorer.exe")
            .arg(&abs_path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();

        match result {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("打开文件失败: {}，错误: {}", abs_path.display(), e)),
        }?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&abs_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}，错误: {}", abs_path.display(), e))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&abs_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}，错误: {}", abs_path.display(), e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    let abs_path = match path_obj.canonicalize() {
        Ok(p) => p,
        Err(e) => return Err(format!("路径无效: {}", e)),
    };

    #[cfg(target_os = "windows")] {
        let path_str = abs_path.to_string_lossy().to_string();
        Command::new("explorer")
            .arg("/select,")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("打开资源管理器失败: {}", e))?;
    }

    #[cfg(target_os = "macos")] {
        Command::new("open")
            .arg("-R")
            .arg(&abs_path)
            .spawn()
            .map_err(|e| format!("打开Finder失败: {}", e))?;
    }

    #[cfg(target_os = "linux")] {
        if let Some(parent) = abs_path.parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("打开文件管理器失败: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn drag_files(paths: Vec<String>, target_box_id: Option<String>, app: tauri::AppHandle) -> Result<(), String> {
    const FILE_ADDED_EVENT: &str = "file:added";
    
    for path in paths.iter() {
        let path_obj = Path::new(path);
        let file_name = path_obj
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(path);
        
        let item_type = if path_obj.is_file() {
            "file"
        } else if path_obj.is_dir() {
            "folder"
        } else {
            "unknown"
        };
        
        let file_size = if path_obj.is_file() {
            fs::metadata(path).ok().map(|m| m.len())
        } else {
            None
        };
        
        let mut file_info = serde_json::json!({
            "name": file_name,
            "category": "desktop",
            "type": item_type,
            "path": path
        });
        
        if let Some(size) = file_size {
            file_info["size"] = serde_json::json!(size);
        }
        
        if let Some(ref tid) = target_box_id {
            if !tid.is_empty() {
                file_info["targetBoxId"] = serde_json::json!(tid);
            }
        }
        
        let _ = app.emit(FILE_ADDED_EVENT, file_info);
    }
    
    Ok(())
}

#[tauri::command]
pub fn path_item_kind(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if p.is_dir() {
        return Ok("folder".to_string());
    }
    if p.is_file() {
        return Ok("file".to_string());
    }
    Ok("unknown".to_string())
}

#[tauri::command]
pub fn get_file_size(path: String) -> Result<Option<u64>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(None);
    }
    if p.is_file() {
        match fs::metadata(&path) {
            Ok(meta) => Ok(Some(meta.len())),
            Err(_) => Ok(None),
        }
    } else if p.is_dir() {
        match calculate_folder_size(p) {
            Ok(size) => Ok(Some(size)),
            Err(_) => Ok(None),
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn scan_desktop_files(scan_hidden: Option<bool>) -> Result<Vec<serde_json::Value>, String> {
    let scan_hidden = scan_hidden.unwrap_or(false);
    
    let mut desktop_paths = Vec::new();
    
    if let Some(path) = dirs::desktop_dir() {
        desktop_paths.push(path);
    }
    
    #[cfg(target_os = "windows")]
    {
        if let Some(public_dir) = dirs::public_dir() {
            let public_desktop = public_dir.join("Desktop");
            if public_desktop.exists() {
                desktop_paths.push(public_desktop);
            }
        }
    }
    
    let mut files = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    
    for desktop_path in desktop_paths {
        match fs::read_dir(&desktop_path) {
            Ok(dir_entries) => {
                for entry in dir_entries {
                    match entry {
                        Ok(entry) => {
                            let path = entry.path();
                            let file_name = path
                                .file_name()
                                .and_then(|f| f.to_str())
                                .unwrap_or("unknown");
                            
                            let path_str = path.to_str().unwrap_or_default();
                            
                            if seen_paths.contains(path_str) {
                                continue;
                            }
                            seen_paths.insert(path_str.to_string());
                            
                            let mut is_hidden = false;
                            
                            if !scan_hidden {
                                if file_name.starts_with('.') {
                                    is_hidden = true;
                                }
                                
                                #[cfg(target_os = "windows")]
                                {
                                    use std::os::windows::fs::MetadataExt;
                                    if let Ok(metadata) = fs::metadata(&path) {
                                        let attributes = metadata.file_attributes();
                                        if (attributes & 0x2) != 0 {
                                            is_hidden = true;
                                        }
                                    }
                                }
                            }
                            
                            if is_hidden {
                                continue;
                            }
                            
                            let is_lnk = file_name.to_lowercase().ends_with(".lnk");
                            let (item_type, file_size) = if is_lnk {
                                let size = fs::metadata(&path).ok().map(|m| m.len());
                                ("file", size)
                            } else {
                                match fs::metadata(&path) {
                                    Ok(metadata) => {
                                        if metadata.is_dir() {
                                            let size = calculate_folder_size(&path).ok();
                                            ("folder", size)
                                        } else if metadata.is_file() {
                                            ("file", Some(metadata.len()))
                                        } else {
                                            ("unknown", None)
                                        }
                                    }
                                    Err(_) => {
                                        if path.is_dir() {
                                            let size = calculate_folder_size(&path).ok();
                                            ("folder", size)
                                        } else if path.is_file() {
                                            let size = fs::metadata(&path).ok().map(|m| m.len());
                                            ("file", size)
                                        } else {
                                            ("unknown", None)
                                        }
                                    }
                                }
                            };
                            
                            let mut file_info = serde_json::json!({
                                "name": file_name,
                                "category": "desktop",
                                "type": item_type,
                                "path": path_str,
                            });
                            
                            if let Some(size) = file_size {
                                file_info["size"] = serde_json::json!(size);
                            }
                            
                            files.push(file_info);
                        }
                        Err(_) => continue,
                    }
                }
            }
            Err(_) => continue,
        }
    }
    
    Ok(files)
}

#[tauri::command]
pub fn fs_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
pub fn fs_mkdir(path: String, options: std::collections::HashMap<String, bool>) -> Result<(), String> {
    let recursive = options.get("recursive").unwrap_or(&false);
    if *recursive {
        fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {}", e))
    } else {
        fs::create_dir(&path).map_err(|e| format!("创建目录失败: {}", e))
    }
}

#[tauri::command]
pub fn fs_copy_dir(from: String, to: String) -> Result<(), String> {
    let from_path = Path::new(&from);
    let to_path = Path::new(&to);
    
    if !from_path.exists() {
        return Err("源目录不存在".to_string());
    }
    
    if !to_path.exists() {
        fs::create_dir_all(to_path).map_err(|e| format!("创建目标目录失败: {}", e))?;
    }
    
    let mut stack = vec![(from_path.to_path_buf(), to_path.to_path_buf())];
    
    while let Some((src, dest)) = stack.pop() {
        if src.is_dir() {
            if !dest.exists() {
                fs::create_dir(&dest).map_err(|e| format!("创建目录失败: {}", e))?;
            }
            
            for entry in fs::read_dir(src).map_err(|e| format!("读取目录失败: {}", e))? {
                let entry = entry.map_err(|e| format!("读取目录条目失败: {}", e))?;
                let src_path = entry.path();
                let dest_path = dest.join(entry.file_name());
                
                if src_path.is_dir() {
                    stack.push((src_path, dest_path));
                } else {
                    fs::copy(&src_path, &dest_path).map_err(|e| format!("复制文件失败: {}", e))?;
                }
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
pub fn fs_copy_file(from: String, to: String) -> Result<(), String> {
    fs::copy(&from, &to).map_err(|e| format!("复制文件失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn fs_remove_dir(path: String) -> Result<(), String> {
    fs::remove_dir_all(&path).map_err(|e| format!("删除目录失败: {}", e))
}
