#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![open_item, win_minimize, win_maximize, win_close, win_is_maximized, win_toggle_maximize, store_get, store_set, store_delete, store_clear, register_global_shortcut, unregister_global_shortcut, drag_files, path_item_kind, get_file_size, scan_desktop_files, get_file_icon, open_file_dialog, check_for_updates, dialog_show_input_box, dialog_show_confirm, fs_exists, fs_mkdir, app_get_path, backup_create, backup_restore, backup_cleanup, backup_get_backups, backup_set_auto_backup_interval, logger_write_log, logger_clear_logs, logger_set_auto_cleanup_days, logger_get_logs, set_portable_mode, open_in_explorer, set_window_always_on_top, set_window_transparency])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      #[cfg(desktop)]
      {
        // 添加全局快捷键处理器
        app.handle().plugin(
          tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |_app, _sc, event| {
                if event.state() == ShortcutState::Pressed {
                    // 触发显示/隐藏应用的逻辑
                    if let Some(window) = _app.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            window.hide().unwrap();
                        } else {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                }
            })
            .build(),
        )?;
      }
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

use std::process::Command;
use std::collections::HashMap;
use serde_json::Value;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use dirs;
use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_dialog;
use lazy_static::lazy_static;
use std::sync::RwLock;
use fs2::FileExt;
use image::{DynamicImage, ImageFormat};
use base64::{engine::general_purpose, Engine as _};

// 常量定义
const STORAGE_DIR_NAME: &str = "storage";
const PORTABLE_MARKER: &str = ".portable";
const FILE_ADDED_EVENT: &str = "file:added";
const DEFAULT_ICON: &str = "default-icon";
const BACKUP_DIR_NAME: &str = "backups";
const LOG_DIR_NAME: &str = "logs";
const LOG_FILE_NAME: &str = "app.log";
const DEFAULT_ICON_SIZE: u32 = 32;
const MAX_BACKUP_COUNT: usize = 10; // 最多保留10条备份

// 存储：(快捷键字符串, Shortcut 对象)
lazy_static! {
    static ref SHORTCUT_MANAGERS: RwLock<Vec<(String, Shortcut)>> = RwLock::new(Vec::new());
}

/// 解析快捷键字符串为 Shortcut 对象
/// 
/// 支持格式：Ctrl+Shift+Space, Ctrl+A, Alt+B 等
/// 
/// # Parameters
/// - `shortcut_str`: 快捷键字符串
/// 
/// # Returns
/// - `Ok(Shortcut)`: 解析成功的 Shortcut 对象
/// - `Err(String)`: 解析失败的错误信息
fn parse_shortcut(shortcut_str: &str) -> Result<Shortcut, String> {
    // 简单的快捷键解析逻辑
    // 支持格式：Ctrl+Shift+Space, Ctrl+A, Alt+B 等
    let parts: Vec<&str> = shortcut_str.split('+').collect();
    
    if parts.is_empty() {
        return Err("Empty shortcut".to_string());
    }
    
    let mut modifiers = Modifiers::empty();
    let mut key_code = None;
    
    for part in parts {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "shift" => modifiers |= Modifiers::SHIFT,
            "alt" => modifiers |= Modifiers::ALT,
            "super" | "meta" | "win" => modifiers |= Modifiers::SUPER,
            "space" => key_code = Some(Code::Space),
            "enter" => key_code = Some(Code::Enter),
            "tab" => key_code = Some(Code::Tab),
            "esc" | "escape" => key_code = Some(Code::Escape),
            "backspace" => key_code = Some(Code::Backspace),
            "delete" => key_code = Some(Code::Delete),
            "up" => key_code = Some(Code::ArrowUp),
            "down" => key_code = Some(Code::ArrowDown),
            "left" => key_code = Some(Code::ArrowLeft),
            "right" => key_code = Some(Code::ArrowRight),
            _ => {
                // 单个字符
                if part.len() == 1 {
                    let c = part.chars().next().unwrap();
                    if c.is_alphabetic() {
                        key_code = Some(match c.to_uppercase().next().unwrap() {
                            'A' => Code::KeyA,
                            'B' => Code::KeyB,
                            'C' => Code::KeyC,
                            'D' => Code::KeyD,
                            'E' => Code::KeyE,
                            'F' => Code::KeyF,
                            'G' => Code::KeyG,
                            'H' => Code::KeyH,
                            'I' => Code::KeyI,
                            'J' => Code::KeyJ,
                            'K' => Code::KeyK,
                            'L' => Code::KeyL,
                            'M' => Code::KeyM,
                            'N' => Code::KeyN,
                            'O' => Code::KeyO,
                            'P' => Code::KeyP,
                            'Q' => Code::KeyQ,
                            'R' => Code::KeyR,
                            'S' => Code::KeyS,
                            'T' => Code::KeyT,
                            'U' => Code::KeyU,
                            'V' => Code::KeyV,
                            'W' => Code::KeyW,
                            'X' => Code::KeyX,
                            'Y' => Code::KeyY,
                            'Z' => Code::KeyZ,
                            _ => return Err(format!("Unsupported key: {}", part)),
                        });
                    } else if c.is_digit(10) {
                        key_code = Some(match c {
                            '0' => Code::Digit0,
                            '1' => Code::Digit1,
                            '2' => Code::Digit2,
                            '3' => Code::Digit3,
                            '4' => Code::Digit4,
                            '5' => Code::Digit5,
                            '6' => Code::Digit6,
                            '7' => Code::Digit7,
                            '8' => Code::Digit8,
                            '9' => Code::Digit9,
                            _ => return Err(format!("Unsupported key: {}", part)),
                        });
                    } else {
                        return Err(format!("Unsupported key: {}", part));
                    }
                } else {
                    return Err(format!("Unsupported key: {}", part));
                }
            }
        }
    }
    
    if let Some(code) = key_code {
        Ok(Shortcut::new(if modifiers.is_empty() { None } else { Some(modifiers) }, code))
    } else {
        Err("No key code found".to_string())
    }
}

/// 获取存储目录
/// 
/// 检查是否为便携版（通过检查是否存在便携版标记文件）：
/// - 便携版：使用可执行文件所在目录
/// - 安装版：使用用户数据目录
/// - 开发环境：使用用户数据目录（避免权限问题）
/// 
/// # Returns
/// - `Ok(PathBuf)`: 存储目录路径
/// - `Err(String)`: 获取存储目录失败的错误信息
fn get_storage_dir() -> Result<PathBuf, String> {
    // 检查是否为便携版（通过检查是否存在便携版标记文件）
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    let portable_marker = exe_dir.join(PORTABLE_MARKER);
    
    // 检查是否为开发环境（可执行文件在 target/debug 或 target/release 目录）
    let is_development = exe_dir.to_string_lossy().contains("target/debug") || exe_dir.to_string_lossy().contains("target/release");
    
    if portable_marker.exists() && !is_development {
        // 便携版：使用可执行文件所在目录
        let storage_dir = exe_dir.join(STORAGE_DIR_NAME);
        fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;
        Ok(storage_dir)
    } else {
        // 安装版或开发环境：使用用户数据目录
        let mut path = dirs::data_dir().ok_or("Failed to get data directory")?;
        path.push(STORAGE_DIR_NAME);
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        Ok(path)
    }
}

/// 获取备份目录
/// 
/// # Returns
/// - `Ok(PathBuf)`: 备份目录路径
/// - `Err(String)`: 获取备份目录失败的错误信息
fn get_backup_dir() -> Result<PathBuf, String> {
    let mut path = get_storage_dir()?;
    path.push(BACKUP_DIR_NAME);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

/// 获取日志目录
/// 
/// # Returns
/// - `Ok(PathBuf)`: 日志目录路径
/// - `Err(String)`: 获取日志目录失败的错误信息
fn get_log_dir() -> Result<PathBuf, String> {
    let mut path = get_storage_dir()?;
    path.push(LOG_DIR_NAME);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

// 存储文件路径
fn get_storage_file(store_type: &str) -> Result<PathBuf, String> {
    let mut path = get_storage_dir()?;
    path.push(format!("{}.json", store_type));
    Ok(path)
}

// 从文件加载存储
fn load_storage(store_type: &str) -> Result<HashMap<String, Value>, String> {
    let file_path = get_storage_file(store_type)?;
    
    if !file_path.exists() {
        return Ok(HashMap::new());
    }
    
    let mut file = File::open(&file_path).map_err(|e| format!("打开文件失败: {}", e))?;
    // 获取共享锁（读锁）
    file.lock_shared().map_err(|e| format!("获取文件锁失败: {}", e))?;
    
    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|e| format!("读取文件失败: {}", e))?;
    
    // 自动释放锁
    serde_json::from_str(&content).map_err(|e| format!("解析 JSON 失败: {}", e))
}

// 保存存储到文件
fn save_storage(store_type: &str, storage: &HashMap<String, Value>) -> Result<(), String> {
    let file_path = get_storage_file(store_type)?;
    let content = serde_json::to_string_pretty(storage).map_err(|e| format!("序列化 JSON 失败: {}", e))?;
    
    let mut file = File::create(&file_path).map_err(|e| format!("创建文件失败: {}", e))?;
    // 获取排他锁（写锁）
    file.lock_exclusive().map_err(|e| format!("获取文件锁失败: {}", e))?;
    
    file.write_all(content.as_bytes()).map_err(|e| format!("写入文件失败: {}", e))?;
    
    // 自动释放锁
    Ok(())
}

#[tauri::command]
fn store_get(params: HashMap<String, String>) -> Result<Value, String> {
    println!("Rust store_get 接收到参数: {:?}", params);
    
    let key = params.get("key").ok_or("Missing key parameter")?;
    let binding = STORAGE_DIR_NAME.to_string();
    let store_type = params.get("storeType").unwrap_or(&binding);
    
    println!("Rust store_get: 加载存储类型: {}", store_type);
    let storage = load_storage(store_type)?;
    println!("Rust store_get: 存储数据: {:?}", storage);
    
    let value = storage.get(key).unwrap_or(&Value::Null).clone();
    println!("Rust store_get: 返回值: {:?}", value);
    
    Ok(value)
}

#[tauri::command]
fn store_set(params: HashMap<String, Value>) -> Result<(), String> {
    println!("Rust store_set 接收到参数: {:?}", params);
    
    let key = params.get("key").and_then(Value::as_str).ok_or("Missing key parameter")?;
    let value = params.get("value").ok_or("Missing value parameter")?;
    let store_type = params.get("storeType").and_then(Value::as_str).unwrap_or(STORAGE_DIR_NAME);
    
    println!("Rust store_set: 存储键: {}, 值: {:?}, 类型: {}", key, value, store_type);
    
    let mut storage = load_storage(store_type)?;
    println!("Rust store_set: 加载存储前: {:?}", storage);
    
    storage.insert(key.to_string(), value.clone());
    println!("Rust store_set: 加载存储后: {:?}", storage);
    
    save_storage(store_type, &storage)?;
    println!("Rust store_set: 保存成功");
    
    Ok(())
}

#[tauri::command]
fn store_delete(params: HashMap<String, String>) -> Result<(), String> {
    let key = params.get("key").ok_or("Missing key parameter")?;
    let binding = STORAGE_DIR_NAME.to_string();
    let store_type = params.get("storeType").unwrap_or(&binding);
    
    let mut storage = load_storage(store_type)?;
    storage.remove(key);
    save_storage(store_type, &storage)?;
    
    Ok(())
}

#[tauri::command]
fn store_clear(store_type: String) -> Result<(), String> {
    // 校验 store_type 参数，防止路径遍历
    if store_type.contains('/') || store_type.contains('\\') || store_type.contains("..") {
        return Err("Invalid store type: contains path separators".to_string());
    }
    
    let storage = HashMap::new();
    save_storage(&store_type, &storage)?;
    
    Ok(())
}

#[tauri::command]
fn open_item(path: String) -> Result<(), String> {
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

    let path_obj = std::path::Path::new(&path);
    
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
fn open_in_explorer(path: String) -> Result<(), String> {
    use std::path::Path;
    use std::process::Command;

    // 1. 校验
    if path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }

    let path_obj = Path::new(&path);
    let abs_path = match path_obj.canonicalize() {
        Ok(p) => p,
        Err(e) => return Err(format!("路径无效: {}", e)),
    };

    // 2. Windows: 用 explorer /select,path 选中文件
    #[cfg(target_os = "windows")] {
        let path_str = abs_path.to_string_lossy().to_string();
        Command::new("explorer")
            .arg("/select,")
            .arg(&path_str)
            .spawn()
            .map_err(|e| format!("打开资源管理器失败: {}", e))?;
    }

    // 3. macOS: 用 open -R path 显示文件
    #[cfg(target_os = "macos")] {
        Command::new("open")
            .arg("-R")
            .arg(&abs_path)
            .spawn()
            .map_err(|e| format!("打开Finder失败: {}", e))?;
    }

    // 4. Linux: 打开父目录
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
fn win_minimize(window: tauri::Window) -> Result<(), String> {
  window.minimize()
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn win_maximize(window: tauri::Window) -> Result<(), String> {
  window.maximize()
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn win_close(window: tauri::Window) -> Result<(), String> {
  window.close()
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn win_is_maximized(window: tauri::Window) -> Result<bool, String> {
  window.is_maximized()
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn win_toggle_maximize(window: tauri::Window) -> Result<(), String> {
  match window.is_maximized() {
    Ok(is_maximized) => {
      if is_maximized {
        window.unmaximize()
          .map_err(|e| e.to_string())?;
      } else {
        window.maximize()
          .map_err(|e| e.to_string())?;
      }
      Ok(())
    },
    Err(e) => Err(e.to_string())
  }
}

// 全局快捷键管理

#[tauri::command]
fn register_global_shortcut(shortcut: String, app: tauri::AppHandle) -> Result<(), String> {
    // 解析快捷键
    let shortcut_obj = parse_shortcut(&shortcut)?;
    
    // 注销所有已注册的快捷键
    let shortcuts_to_unregister = {
        let shortcuts = SHORTCUT_MANAGERS.read().map_err(|e| e.to_string())?;
        shortcuts.iter().map(|(_, sc)| sc.clone()).collect::<Vec<_>>()
    };
    
    for existing_shortcut in shortcuts_to_unregister {
        app.global_shortcut().unregister(existing_shortcut).ok();
    }
    
    // 注册新快捷键
    app.global_shortcut().register(shortcut_obj.clone())
        .map_err(|e| format!("注册快捷键失败: {}", e))?;
    
    // 更新存储，只保留新快捷键
    let mut shortcuts = SHORTCUT_MANAGERS.write().map_err(|e| e.to_string())?;
    shortcuts.clear();
    shortcuts.push((shortcut, shortcut_obj));
    
    Ok(())
}

#[tauri::command]
fn unregister_global_shortcut(shortcut: String, app: tauri::AppHandle) -> Result<(), String> {
    let mut shortcuts = SHORTCUT_MANAGERS.write().map_err(|e| e.to_string())?;
    
    // 查找并注销快捷键
    if let Some((_, shortcut_obj)) = shortcuts.iter().find(|(s, _)| s == &shortcut) {
        app.global_shortcut().unregister(shortcut_obj.clone())
            .map_err(|e| format!("注销快捷键失败: {}", e))?;
        
        // 从存储中移除
        shortcuts.retain(|(s, _)| s != &shortcut);
    }
    
    Ok(())
}

// 文件操作相关命令
#[tauri::command]
fn drag_files(paths: Vec<String>, target_box_id: Option<String>, app: tauri::AppHandle) -> Result<(), String> {
    // 快速处理拖拽的文件/文件夹路径，减少输出提高速度
    for path in paths.iter() {
        let path_obj = std::path::Path::new(path);
        let file_name = path_obj
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(path);
        
        // 判断类型：file / folder
        let item_type = if path_obj.is_file() {
            "file"
        } else if path_obj.is_dir() {
            "folder"
        } else {
            "unknown"
        };
        
        // 获取文件大小
        let file_size = if path_obj.is_file() {
            std::fs::metadata(path).ok().map(|m| m.len())
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
        
        // 触发 file:added 事件
        let _ = app.emit(FILE_ADDED_EVENT, file_info);
    }
    
    Ok(())
}

#[tauri::command]
fn path_item_kind(path: String) -> Result<String, String> {
  let p = std::path::Path::new(&path);
  if p.is_dir() {
    return Ok("folder".to_string());
  }
  if p.is_file() {
    return Ok("file".to_string());
  }
  Ok("unknown".to_string())
}

// 递归计算文件夹大小
fn calculate_folder_size(path: &std::path::Path) -> Result<u64, String> {
  let mut total_size = 0u64;
  
  if let Ok(entries) = std::fs::read_dir(path) {
    for entry in entries {
      if let Ok(entry) = entry {
        let entry_path = entry.path();
        if entry_path.is_file() {
          if let Ok(meta) = std::fs::metadata(&entry_path) {
            total_size += meta.len();
          }
        } else if entry_path.is_dir() {
          // 递归计算子文件夹大小
          if let Ok(sub_size) = calculate_folder_size(&entry_path) {
            total_size += sub_size;
          }
        }
      }
    }
  }
  
  Ok(total_size)
}

#[tauri::command]
fn get_file_size(path: String) -> Result<Option<u64>, String> {
  let p = std::path::Path::new(&path);
  if !p.exists() {
    return Ok(None);
  }
  if p.is_file() {
    match std::fs::metadata(&path) {
      Ok(meta) => Ok(Some(meta.len())),
      Err(_) => Ok(None),
    }
  } else if p.is_dir() {
    // 计算文件夹大小
    match calculate_folder_size(p) {
      Ok(size) => Ok(Some(size)),
      Err(_) => Ok(None),
    }
  } else {
    Ok(None)
  }
}

#[tauri::command]
fn scan_desktop_files(scan_hidden: Option<bool>) -> Result<Vec<serde_json::Value>, String> {
    // 默认不扫描隐藏文件
    let scan_hidden = scan_hidden.unwrap_or(false);
    
    // 扫描多个桌面位置
    let mut desktop_paths = Vec::new();
    
    // 添加用户桌面
    if let Some(path) = dirs::desktop_dir() {
        desktop_paths.push(path);
    }
    
    // 在Windows上，添加公共桌面
    #[cfg(target_os = "windows")]
    {
        if let Some(public_dir) = dirs::public_dir() {
            let public_desktop = public_dir.join("Desktop");
            if public_desktop.exists() {
                desktop_paths.push(public_desktop);
            }
        }
    }
    
    println!("=== 开始扫描桌面 ===");
    println!("扫描的桌面路径: {:?}", desktop_paths);
    println!("扫描隐藏文件: {}", scan_hidden);
    
    // 扫描桌面文件
    let mut files = Vec::new();
    let mut skipped_count = 0;
    let mut seen_paths = std::collections::HashSet::new();
    
    for desktop_path in desktop_paths {
        println!("\n--- 扫描路径: {:?} ---", desktop_path);
        
        match std::fs::read_dir(&desktop_path) {
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
                            
                            // 检查是否已经处理过这个文件
                            if seen_paths.contains(path_str) {
                                println!("[跳过] 文件: {} (已处理)", file_name);
                                continue;
                            }
                            seen_paths.insert(path_str.to_string());
                            
                            println!("\n[发现] 文件: {}, 路径: {:?}", file_name, path);
                            
                            // 跳过隐藏文件，除非设置了扫描隐藏文件
                            // 1. 检查文件名是否以 . 开头
                            // 2. 在Windows系统中，检查文件是否有隐藏属性
                            let mut is_hidden = false;
                            let mut hide_reason = String::new();
                            
                            if !scan_hidden {
                                // 检查文件名是否以 . 开头
                                if file_name.starts_with('.') {
                                    is_hidden = true;
                                    hide_reason = format!("文件名以 . 开头");
                                }
                                
                                // 在Windows系统中，检查文件是否有隐藏属性
                                #[cfg(target_os = "windows")]
                                {
                                    use std::os::windows::fs::MetadataExt;
                                    if let Ok(metadata) = std::fs::metadata(&path) {
                                        let attributes = metadata.file_attributes();
                                        // 检查是否设置了隐藏属性
                                        if (attributes & 0x2) != 0 { // FILE_ATTRIBUTE_HIDDEN
                                            is_hidden = true;
                                            if hide_reason.is_empty() {
                                                hide_reason = format!("有隐藏属性");
                                            } else {
                                                hide_reason = format!("{} 和有隐藏属性", hide_reason);
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if is_hidden {
                                skipped_count += 1;
                                println!("[跳过] 文件: {}, 原因: {}", file_name, hide_reason);
                                continue;
                            }
                            
                            // 判断类型：file / folder
                            // 特别处理 .lnk 文件，确保它们被识别为 file
                            let is_lnk = file_name.to_lowercase().ends_with(".lnk");
                            let (item_type, file_size) = if is_lnk {
                                println!("[识别] 文件 {} 是 .lnk 快捷方式，识别为 file", file_name);
                                let size = std::fs::metadata(&path).ok().map(|m| m.len());
                                ("file", size)
                            } else {
                                // 使用 metadata 来获取更准确的文件类型信息
                                match std::fs::metadata(&path) {
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
                                        // 如果 metadata 失败，尝试使用 path 的方法
                                        if path.is_dir() {
                                            let size = calculate_folder_size(&path).ok();
                                            ("folder", size)
                                        } else if path.is_file() {
                                            let size = std::fs::metadata(&path).ok().map(|m| m.len());
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
                            
                            println!("[添加] 文件: {:?}", file_info);
                            files.push(file_info);
                        }
                        Err(e) => println!("[错误] 读取目录项失败: {:?}", e),
                    }
                }
            }
            Err(e) => println!("[错误] 扫描路径 {:?} 失败: {}", desktop_path, e),
        }
    }
    
    println!("\n=== 扫描完成 ===");
    println!("添加的文件数量: {}", files.len());
    println!("跳过的文件数量: {}", skipped_count);
    println!("总共处理的文件数量: {}", files.len() + skipped_count);
    Ok(files)
}

fn img_to_base64(img: DynamicImage) -> Option<String> {
    let mut buf = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut buf), ImageFormat::Png).ok()?;
    Some(format!("data:image/png;base64,{}", general_purpose::STANDARD.encode(&buf)))
}

#[cfg(windows)]
fn get_system_icon(path: &str, _size: u32) -> Option<String> {
    use winapi::{
        shared::minwindef::DWORD,
        um::{shellapi, wingdi, winuser},
    };
    use std::ptr;
    use std::os::windows::ffi::OsStrExt;

    let wide_path: Vec<u16> = std::ffi::OsStr::new(path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut shfi = unsafe { std::mem::zeroed::<shellapi::SHFILEINFOW>() };
    let flags = shellapi::SHGFI_ICON | shellapi::SHGFI_USEFILEATTRIBUTES;
    
    let file_attrs = if Path::new(path).is_dir() {
        0x00000010
    } else {
        0x00000020
    };

    let res = unsafe {
        shellapi::SHGetFileInfoW(
            wide_path.as_ptr(),
            file_attrs,
            &mut shfi,
            std::mem::size_of::<shellapi::SHFILEINFOW>() as DWORD,
            flags,
        )
    };

    if res == 0 || shfi.hIcon.is_null() {
        return None;
    }

    let mut icon_info = unsafe { std::mem::zeroed::<winuser::ICONINFO>() };
    let success = unsafe { winuser::GetIconInfo(shfi.hIcon, &mut icon_info) };
    
    if success == 0 {
        unsafe { winuser::DestroyIcon(shfi.hIcon); };
        return None;
    }

    let hdc = unsafe { winuser::GetDC(ptr::null_mut()) };
    let hbm_color = icon_info.hbmColor;
    
    let mut bmp = wingdi::BITMAP {
        bmType: 0,
        bmWidth: 0,
        bmHeight: 0,
        bmWidthBytes: 0,
        bmPlanes: 0,
        bmBitsPixel: 0,
        bmBits: ptr::null_mut(),
    };
    
    unsafe {
        wingdi::GetObjectW(
            hbm_color as _,
            std::mem::size_of_val(&bmp) as i32,
            &mut bmp as *mut _ as *mut std::ffi::c_void,
        );
    }

    let width = bmp.bmWidth as u32;
    let height = bmp.bmHeight as u32;
    let mut buf = vec![0u8; (width * height * 4) as usize];

    let success = unsafe {
        let mut bmi = wingdi::BITMAPINFO {
            bmiHeader: wingdi::BITMAPINFOHEADER {
                biSize: std::mem::size_of::<wingdi::BITMAPINFOHEADER>() as DWORD,
                biWidth: width as i32,
                biHeight: -(height as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: 0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [wingdi::RGBQUAD { rgbBlue: 0, rgbGreen: 0, rgbRed: 0, rgbReserved: 0 }; 1],
        };

        wingdi::GetDIBits(
            hdc,
            hbm_color,
            0,
            height as u32,
            buf.as_mut_ptr() as _,
            &mut bmi,
            wingdi::DIB_RGB_COLORS,
        )
    };

    unsafe {
        wingdi::DeleteObject(hbm_color as _);
        wingdi::DeleteObject(icon_info.hbmMask as _);
        winuser::DestroyIcon(shfi.hIcon);
        winuser::ReleaseDC(ptr::null_mut(), hdc);
    }

    if success == 0 {
        return None;
    }

    let img = DynamicImage::ImageRgba8(image::RgbaImage::from_raw(width, height, buf)?);
    img_to_base64(img)
}

#[cfg(not(windows))]
fn get_system_icon(_path: &str, _size: u32) -> Option<String> {
    None
}

#[tauri::command]
#[allow(non_snake_case)]
fn get_file_icon(filePath: String, size: Option<u32>) -> Result<String, String> {
    let size = size.unwrap_or(DEFAULT_ICON_SIZE);
    
    if !Path::new(&filePath).exists() {
        return Ok(DEFAULT_ICON.to_string());
    }

    match get_system_icon(&filePath, size) {
        Some(icon) => Ok(icon),
        None => Ok(DEFAULT_ICON.to_string()),
    }
}

#[tauri::command]
fn open_file_dialog() -> Result<Vec<String>, String> {
    // 简化实现，返回空数组，待实现文件选择功能
    Ok(Vec::new())
}

// 应用相关命令
#[tauri::command]
fn check_for_updates() -> Result<(), String> {
    // 简化实现
    Ok(())
}

#[tauri::command]
fn dialog_show_input_box(_options: HashMap<String, String>) -> Result<String, String> {
    // 简化实现，返回空字符串
    Ok("".to_string())
}

#[tauri::command]
fn dialog_show_confirm(_message: String, _title: Option<String>) -> Result<bool, String> {
    // 简化实现，直接返回true
    // 在实际应用中，这里应该使用tauri_plugin_dialog来显示确认对话框
    Ok(true)
}

#[tauri::command]
fn fs_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}



#[tauri::command]
fn fs_mkdir(path: String, options: HashMap<String, bool>) -> Result<(), String> {
    let recursive = options.get("recursive").unwrap_or(&false);
    if *recursive {
        std::fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {}", e))
    } else {
        std::fs::create_dir(&path).map_err(|e| format!("创建目录失败: {}", e))
    }
}

#[tauri::command]
fn app_get_path(_name: String) -> Result<String, String> {
    // 简化实现，返回空字符串
    Ok("".to_string())
}

/// 将备份类型转换为用户友好的中文名称
fn get_backup_type_name(backup_type: &str) -> &'static str {
    match backup_type {
        "manual" => "手动备份",
        "app_start" => "启动备份",
        "pre_delete_box" => "删除收纳盒前",
        "pre_delete_item" => "删除文件前",
        "pre_delete_link" => "删除链接前",
        "pre_settings_change" => "修改设置前",
        "pre_reset_settings" => "重置设置前",
        "pre_clear_storage" => "清除收纳盒前",
        "pre_clear_all" => "设置-收纳盒",
        "settings_only" => "设置备份",
        "storage_only" => "收纳盒备份",
        _ => "自动备份"
    }
}

/// 清理旧备份，为新备份腾出空间，只保留最新的 (MAX_BACKUP_COUNT - 1) 条备份
fn cleanup_old_backups() -> Result<(), String> {
    let backup_dir = get_backup_dir()?;
    
    // 读取备份目录
    let entries = fs::read_dir(&backup_dir).map_err(|e| format!("读取备份目录失败: {}", e))?;
    
    // 收集备份文件信息
    let mut backup_files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified_time) = metadata.modified() {
                    backup_files.push((path, modified_time));
                }
            }
        }
    }
    
    // 按修改时间倒序排序（最新的在前）
    backup_files.sort_by(|a, b| b.1.cmp(&a.1));
    
    // 为新备份预留一个位置，只保留最新的 (MAX_BACKUP_COUNT - 1) 条
    let keep_count = MAX_BACKUP_COUNT.saturating_sub(1);
    
    // 如果备份数量 >= MAX_BACKUP_COUNT，需要清理出空间
    if backup_files.len() >= MAX_BACKUP_COUNT {
        println!("备份数量: {}, >= {}, 开始清理出空间，保留 {} 条", backup_files.len(), MAX_BACKUP_COUNT, keep_count);
        for (index, (path, _)) in backup_files.iter().enumerate().skip(keep_count) {
            println!("删除旧备份 #{}: {:?}", index, path);
            fs::remove_file(&path).map_err(|e| format!("删除备份文件失败: {}", e))?;
        }
        println!("旧备份清理完成，已为新备份腾出空间");
    } else {
        println!("备份数量: {}, < {}, 无需清理，直接保存", backup_files.len(), MAX_BACKUP_COUNT);
    }
    
    Ok(())
}

// 备份相关命令
#[tauri::command]
fn backup_create(backup_type: String) -> Result<(), String> {
    let backup_dir = get_backup_dir()?;
    let now = chrono::Local::now();
    let timestamp = now.format("%Y-%m-%d_%H-%M-%S").to_string();
    let type_name = get_backup_type_name(&backup_type);
    let backup_file_name = format!("{}_{}.json", type_name, timestamp);
    let backup_file = backup_dir.join(backup_file_name);
    
    // 先检查并清理，为新备份腾出空间
    println!("准备备份...");
    cleanup_old_backups()?;
    
    // 根据备份类型决定备份哪些数据
    let mut backup_data = serde_json::json!({
        "timestamp": timestamp,
        "type": type_name
    });
    
    match backup_type.as_str() {
        // 只备份设置的类型
        "pre_reset_settings" | "settings_only" | "pre_settings_change" => {
            let settings_data = load_storage("settings")?;
            backup_data["settings"] = serde_json::to_value(settings_data).unwrap();
        }
        // 只备份收纳盒的类型
        "pre_clear_storage" | "storage_only" | "pre_delete_box" | "pre_delete_item" | "pre_delete_link" => {
            let storage_data = load_storage("storage")?;
            backup_data["storage"] = serde_json::to_value(storage_data).unwrap();
        }
        // 备份两者的类型
        "pre_clear_all" | "manual" | "app_start" => {
            let storage_data = load_storage("storage")?;
            let settings_data = load_storage("settings")?;
            backup_data["storage"] = serde_json::to_value(storage_data).unwrap();
            backup_data["settings"] = serde_json::to_value(settings_data).unwrap();
        }
        // 默认备份两者
        _ => {
            let storage_data = load_storage("storage")?;
            let settings_data = load_storage("settings")?;
            backup_data["storage"] = serde_json::to_value(storage_data).unwrap();
            backup_data["settings"] = serde_json::to_value(settings_data).unwrap();
        }
    }
    
    // 写入备份文件
    println!("正在保存新备份...");
    let content = serde_json::to_string_pretty(&backup_data).map_err(|e| format!("序列化备份数据失败: {}", e))?;
    fs::write(&backup_file, content).map_err(|e| format!("写入备份文件失败: {}", e))?;
    println!("备份保存成功");
    
    Ok(())
}

#[tauri::command]
fn backup_restore(backup_id: String) -> Result<(), String> {
    let backup_dir = get_backup_dir()?;
    let backup_file = backup_dir.join(&backup_id);
    
    if !backup_file.exists() {
        return Err(format!("备份文件不存在: {}", backup_id));
    }
    
    // 读取备份文件
    let content = fs::read_to_string(&backup_file).map_err(|e| format!("读取备份文件失败: {}", e))?;
    let backup_data: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("解析备份文件失败: {}", e))?;
    
    // 恢复存储数据（如果备份包含收纳盒数据）
    if let Some(storage_data) = backup_data.get("storage").and_then(|v| v.as_object()) {
        let mut storage_map = HashMap::new();
        for (key, value) in storage_data {
            storage_map.insert(key.clone(), value.clone());
        }
        save_storage("storage", &storage_map)?;
    }
    
    // 恢复设置数据（如果备份包含设置数据）
    if let Some(settings_data) = backup_data.get("settings").and_then(|v| v.as_object()) {
        let mut settings_map = HashMap::new();
        for (key, value) in settings_data {
            settings_map.insert(key.clone(), value.clone());
        }
        save_storage("settings", &settings_map)?;
    }
    
    Ok(())
}

#[tauri::command]
fn backup_cleanup() -> Result<(), String> {
    let backup_dir = get_backup_dir()?;
    
    // 读取备份目录
    let entries = fs::read_dir(&backup_dir).map_err(|e| format!("读取备份目录失败: {}", e))?;
    
    // 删除所有备份文件
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            fs::remove_file(&path).map_err(|e| format!("删除备份文件失败: {}", e))?;
        }
    }
    
    Ok(())
}

#[tauri::command]
fn backup_get_backups() -> Result<Vec<String>, String> {
    let backup_dir = get_backup_dir()?;
    
    // 读取备份目录
    let entries = fs::read_dir(&backup_dir).map_err(|e| format!("读取备份目录失败: {}", e))?;
    
    // 收集备份文件和修改时间
    let mut backup_entries = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Some(file_name_os) = path.file_name() {
                if let Some(file_name) = file_name_os.to_str() {
                    if let Ok(metadata) = fs::metadata(&path) {
                        if let Ok(modified_time) = metadata.modified() {
                            backup_entries.push((file_name.to_string(), modified_time));
                        }
                    }
                }
            }
        }
    }
    
    // 按修改时间倒序排序（最新的在前）
    backup_entries.sort_by(|a, b| b.1.cmp(&a.1));
    
    // 提取文件名
    let backups: Vec<String> = backup_entries.into_iter().map(|(name, _)| name).collect();
    
    Ok(backups)
}

#[tauri::command]
fn backup_set_auto_backup_interval(interval: String) -> Result<(), String> {
    // 保存自动备份间隔设置
    let mut settings = load_storage("settings")?;
    settings.insert("autoBackupInterval".to_string(), serde_json::Value::String(interval));
    save_storage("settings", &settings)?;
    
    Ok(())
}



// 日志相关命令
#[tauri::command]
fn logger_write_log(level: String, message: String) -> Result<(), String> {
    let log_dir = get_log_dir()?;
    let log_file = log_dir.join(LOG_FILE_NAME);
    
    // 确保日志目录存在
    if !log_dir.exists() {
        fs::create_dir_all(&log_dir).map_err(|e| format!("创建日志目录失败: {}", e))?;
    }
    
    // 构建日志行
    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_line = format!("[{}] [{}] {}\n", timestamp, level, message);
    
    // 追加写入日志文件
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .and_then(|mut file| write!(file, "{}", log_line))
        .map_err(|e| format!("写入日志文件失败: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn logger_clear_logs() -> Result<(), String> {
    let log_dir = get_log_dir()?;
    let log_file = log_dir.join(LOG_FILE_NAME);
    
    if log_file.exists() {
        fs::remove_file(&log_file).map_err(|e| format!("删除日志文件失败: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn logger_set_auto_cleanup_days(days: String) -> Result<(), String> {
    // 保存自动清理天数设置
    let mut settings = load_storage("settings")?;
    settings.insert("logAutoCleanupDays".to_string(), serde_json::Value::String(days.clone()));
    save_storage("settings", &settings)?;
    
    // 清理指定天数前的日志
    let days = days.parse::<u32>().map_err(|e| format!("无效的天数: {}", e))?;
    let cutoff = chrono::Utc::now() - chrono::Duration::days(days as i64);
    
    let log_dir = get_log_dir()?;
    let log_file = log_dir.join(LOG_FILE_NAME);
    
    if log_file.exists() {
        // 读取日志文件
        let content = fs::read_to_string(&log_file).map_err(|e| format!("读取日志文件失败: {}", e))?;
        
        // 过滤出指定天数内的日志
        let mut filtered_content = String::new();
        for line in content.lines() {
            // 尝试解析时间戳
            if let Some(timestamp_str) = line.split(']').nth(0).and_then(|s| s.strip_prefix('[')) {
                if let Ok(timestamp) = chrono::DateTime::parse_from_str(timestamp_str, "%Y-%m-%d %H:%M:%S") {
                    if timestamp >= cutoff {
                        filtered_content.push_str(line);
                        filtered_content.push('\n');
                    }
                } else {
                    // 无法解析时间戳的行，保留
                    filtered_content.push_str(line);
                    filtered_content.push('\n');
                }
            } else {
                // 无法解析时间戳的行，保留
                filtered_content.push_str(line);
                filtered_content.push('\n');
            }
        }
        
        // 写回过滤后的内容
        fs::write(&log_file, filtered_content).map_err(|e| format!("写入日志文件失败: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn logger_get_logs() -> Result<Vec<String>, String> {
    let log_dir = get_log_dir()?;
    let log_file = log_dir.join(LOG_FILE_NAME);
    let mut logs = Vec::new();
    
    if log_file.exists() {
        let content = fs::read_to_string(&log_file).map_err(|e| format!("读取日志文件失败: {}", e))?;
        for line in content.lines() {
            logs.push(line.to_string());
        }
    }
    
    Ok(logs)
}

#[tauri::command]
fn set_portable_mode(is_portable: bool) -> Result<(), String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    let portable_marker = exe_dir.join(PORTABLE_MARKER);

    if is_portable {
        fs::write(&portable_marker, "").map_err(|e| format!("Failed to create portable marker: {}", e))?;
        println!("Created portable marker at: {:?}", portable_marker);
    } else {
        if portable_marker.exists() {
            fs::remove_file(&portable_marker).map_err(|e| format!("Failed to remove portable marker: {}", e))?;
            println!("Removed portable marker at: {:?}", portable_marker);
        }
    }

    Ok(())
}

#[tauri::command]
async fn set_window_always_on_top(
    window: tauri::Window,
    always_on_top: bool,
) -> Result<(), String> {
    window.set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_window_transparency(
    window: tauri::Window,
    transparent: bool,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // 在 Windows 上，我们通过 Tauri API 设置透明度
        window.set_ignore_cursor_events(!transparent).ok();
    }
    Ok(())
}
